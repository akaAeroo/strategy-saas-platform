# 智能策略SaaS平台 - 技术设计方案

## 一、技术选型

### 1.1 技术栈

| 层级 | 技术 | 说明 |
|-----|------|------|
| 前端 | React + TypeScript + Ant Design | 管理后台标准选型 |
| 后端 | Node.js + NestJS / Java + Spring Boot | 推荐NestJS开发效率高 |
| 数据库 | MySQL 8.0 | 主库，存储配置数据 |
| 缓存 | Redis | 缓存、分布式锁、队列 |
| 搜索引擎 | Elasticsearch | 人群检索（如有需要） |
| OLAP | ClickHouse | 效果数据分析 |
| 消息队列 | RabbitMQ / Kafka | 异步任务处理 |
| 对象存储 | MinIO / OSS | 素材文件存储 |
| 调度 | node-cron / Quartz | 定时任务调度 |

### 1.2 部署架构

```
                    ┌─────────────┐
                    │   CDN       │
                    └──────┬──────┘
                           ↓
                    ┌─────────────┐
                    │  Nginx      │
                    │  (LB/静态)  │
                    └──────┬──────┘
                           ↓
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
   ┌─────────┐       ┌─────────┐       ┌─────────┐
   │  Web App │       │  Web App │       │  Web App │
   │  (Pod 1) │       │  (Pod 2) │       │  (Pod 3) │
   └────┬────┘       └────┬────┘       └────┬────┘
        └──────────────────┼──────────────────┘
                           ↓
                    ┌─────────────┐
                    │  API Gateway │
                    └──────┬──────┘
                           ↓
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
   ┌─────────┐       ┌─────────┐       ┌─────────┐
   │Service 1│       │Service 2│       │Service N│
   │(Strategy│       │(Execute)│       │(Metrics)│
   └────┬────┘       └────┬────┘       └────┬────┘
        └──────────────────┼──────────────────┘
                           ↓
                    ┌─────────────┐
                    │  数据层      │
                    │MySQL/Redis/ │
                    │ClickHouse   │
                    └─────────────┘
```

---

## 二、核心模块设计

### 2.1 策略服务 (Strategy Service)

#### 职责
- 策略CRUD操作
- 策略画布编排
- 策略状态管理

#### 核心接口

```typescript
// 策略服务接口定义
interface StrategyService {
  // 创建策略
  createStrategy(dto: CreateStrategyDto): Promise<Strategy>;
  
  // 更新策略
  updateStrategy(id: string, dto: UpdateStrategyDto): Promise<Strategy>;
  
  // 发布策略
  publishStrategy(id: string): Promise<Execution>;
  
  // 获取策略详情
  getStrategy(id: string): Promise<Strategy>;
  
  // 列表查询
  listStrategies(query: StrategyQuery): Promise<PaginatedResult<Strategy>>;
  
  // 暂停策略
  pauseStrategy(id: string): Promise<void>;
  
  // 克隆策略
  cloneStrategy(id: string): Promise<Strategy>;
}

// 策略状态机
enum StrategyStatus {
  DRAFT = 'draft',           // 草稿
  TESTING = 'testing',       // AB测试中
  RUNNING = 'running',       // 运行中
  PAUSED = 'paused',         // 已暂停
  ARCHIVED = 'archived',     // 已归档
}

const validTransitions: Record<StrategyStatus, StrategyStatus[]> = {
  [StrategyStatus.DRAFT]: [StrategyStatus.TESTING, StrategyStatus.RUNNING],
  [StrategyStatus.TESTING]: [StrategyStatus.RUNNING, StrategyStatus.PAUSED, StrategyStatus.ARCHIVED],
  [StrategyStatus.RUNNING]: [StrategyStatus.PAUSED, StrategyStatus.ARCHIVED],
  [StrategyStatus.PAUSED]: [StrategyStatus.RUNNING, StrategyStatus.ARCHIVED],
  [StrategyStatus.ARCHIVED]: [],
};
```

#### 策略组件配置Schema

```typescript
// 策略组件JSON Schema
const strategyComponentsSchema = {
  type: 'object',
  required: ['audience', 'touchpoints'],
  properties: {
    audience: {
      type: 'object',
      required: ['segmentId'],
      properties: {
        segmentId: { type: 'string' },
        customFilter: { type: 'object' },
        estimatedSize: { type: 'number' }
      }
    },
    touchpoints: {
      type: 'object',
      properties: {
        external: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              channel: { enum: ['push', 'sms', 'wechat'] },
              templateId: { type: 'string' },
              content: { type: 'object' }
            }
          }
        },
        inApp: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              channel: { enum: ['popup', 'banner', 'inbox'] },
              config: { type: 'object' }
            }
          }
        },
        priority: { enum: ['sequential', 'parallel'] }
      }
    },
    landing: {
      type: 'object',
      properties: {
        type: { enum: ['page', 'popup', 'drawer'] },
        config: { type: 'object' },
        abTestEnabled: { type: 'boolean' }
      }
    },
    benefits: {
      type: 'object',
      properties: {
        type: { enum: ['coupon', 'points', 'vip', 'none'] },
        config: { type: 'object' },
        trigger: { enum: ['immediately', 'condition'] }
      }
    },
    products: {
      type: 'object',
      properties: {
        type: { enum: ['pool', 'specific', 'recommend'] },
        items: { type: 'array', items: { type: 'string' } }
      }
    }
  }
};
```

---

### 2.2 执行引擎 (Execution Engine)

#### 职责
- 策略任务调度
- 人群包处理
- 渠道分发
- 执行监控

#### 执行流程设计

```
┌──────────────┐
│  策略发布     │
└──────┬───────┘
       ↓
┌──────────────┐
│ 生成执行计划  │ ──→ 创建Execution记录
└──────┬───────┘
       ↓
┌──────────────┐
│ 人群包计算    │ ──→ 调用人群API获取用户列表
└──────┬───────┘
       ↓
┌──────────────┐
│ AB实验分流    │ ──→ 实验组/对照组标记
└──────┬───────┘
       ↓
┌──────────────┐
│ 渠道适配分发  │ ──→ 各渠道Adapter处理
└──────┬───────┘
       ↓
┌──────────────┐
│ 效果追踪     │ ──→ 埋点数据收集
└──────────────┘
```

#### 任务调度设计

```typescript
// 执行计划
interface ExecutionPlan {
  executionId: string;
  strategyId: string;
  stages: ExecutionStage[];
  scheduleTime?: Date;
}

interface ExecutionStage {
  name: string;
  type: 'audience' | 'touchpoint' | 'benefit' | 'tracking';
  config: any;
  dependencies: string[];  // 依赖的前置stage
}

// 调度器
class ExecutionScheduler {
  // 提交执行计划
  async submit(plan: ExecutionPlan): Promise<void> {
    if (plan.scheduleTime && plan.scheduleTime > new Date()) {
      // 延迟任务，加入延迟队列
      await this.delayQueue.add(plan.executionId, plan, {
        delay: plan.scheduleTime.getTime() - Date.now()
      });
    } else {
      // 立即执行
      await this.executionQueue.add(plan.executionId, plan);
    }
  }
  
  // 取消执行
  async cancel(executionId: string): Promise<void> {
    await this.executionQueue.remove(executionId);
    await this.updateExecutionStatus(executionId, 'cancelled');
  }
}

// 工作处理器
class ExecutionWorker {
  async process(job: Job<ExecutionPlan>): Promise<void> {
    const { executionId, stages } = job.data;
    
    // 拓扑排序，按依赖顺序执行
    const sortedStages = this.topologicalSort(stages);
    
    for (const stage of sortedStages) {
      await this.executeStage(executionId, stage);
    }
  }
  
  private async executeStage(executionId: string, stage: ExecutionStage): Promise<void> {
    const executor = this.getExecutor(stage.type);
    await executor.execute(executionId, stage.config);
  }
}
```

#### 渠道适配器模式

```typescript
// 渠道适配器接口
interface ChannelAdapter {
  readonly channelType: string;
  
  // 发送消息
  send(users: string[], content: any): Promise<ChannelResult>;
  
  // 查询发送状态
  queryStatus(batchId: string): Promise<DeliveryStatus[]>;
  
  // 验证配置
  validateConfig(config: any): boolean;
}

// Push适配器
class PushAdapter implements ChannelAdapter {
  readonly channelType = 'push';
  
  async send(users: string[], content: PushContent): Promise<ChannelResult> {
    // 调用Push API
    const response = await pushApi.send({
      userIds: users,
      title: content.title,
      body: content.body,
      deeplink: content.deeplink,
      extra: content.extra
    });
    
    return {
      batchId: response.batchId,
      sentCount: users.length,
      estimatedDelivery: response.estimatedDelivery
    };
  }
  
  // ...
}

// 适配器工厂
class ChannelAdapterFactory {
  private adapters = new Map<string, ChannelAdapter>();
  
  register(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.channelType, adapter);
  }
  
  get(channelType: string): ChannelAdapter {
    const adapter = this.adapters.get(channelType);
    if (!adapter) {
      throw new Error(`Unknown channel type: ${channelType}`);
    }
    return adapter;
  }
}
```

---

### 2.3 人群服务 (Audience Service)

#### 职责
- 战略人群管理
- 人群标签圈选
- 人群规模预估
- 人群包生成

#### 核心设计

```typescript
// 人群服务
interface AudienceService {
  // 创建战略人群
  createSegment(dto: CreateSegmentDto): Promise<Segment>;
  
  // 更新人群定义
  updateSegment(id: string, dto: UpdateSegmentDto): Promise<Segment>;
  
  // 预估人群规模（实时）
  estimateSize(condition: TagCondition[]): Promise<number>;
  
  // 生成人群包（异步）
  generatePackage(segmentId: string): Promise<PackageJob>;
  
  // 查询人群包状态
  getPackageStatus(jobId: string): Promise<PackageStatus>;
  
  // 获取人群画像
  getPortrait(segmentId: string): Promise<Portrait>;
}

// 标签条件 DSL
interface TagCondition {
  field: string;        // 标签字段
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
  value: any;
}

// 复杂条件（支持AND/OR）
interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: (TagCondition | ConditionGroup)[];
}

// 人群包生成流程
class PackageGenerator {
  async generate(segment: Segment): Promise<SegmentPackage> {
    // 1. 将标签条件转为SQL或API调用
    const query = this.buildQuery(segment.definition);
    
    // 2. 调用人群API获取用户列表
    const userStream = await this.audienceApi.queryStream(query);
    
    // 3. 写入文件（分批）
    const filePath = await this.writeToFile(userStream);
    
    // 4. 上传对象存储
    const packageUrl = await this.uploadToOSS(filePath);
    
    // 5. 同步到触达渠道
    await this.syncToChannels(segment.id, packageUrl);
    
    return {
      segmentId: segment.id,
      size: userStream.count,
      url: packageUrl,
      generatedAt: new Date()
    };
  }
}
```

---

### 2.4 AB实验服务 (ABTest Service)

#### 职责
- 实验创建与管理
- 用户分流
- 实验报告生成

#### 分流算法

```typescript
// 分流服务
class TrafficSplitService {
  // 哈希分流（保证同一用户始终分配到同一组）
  assignGroup(userId: string, experimentId: string, config: SplitConfig): Variant {
    // 使用一致性哈希
    const hash = this.hash(`${userId}:${experimentId}`);
    const bucket = hash % 100;
    
    // 按配置分配
    let cumulative = 0;
    for (const variant of config.variants) {
      cumulative += variant.trafficPercent;
      if (bucket < cumulative) {
        return variant;
      }
    }
    
    return config.variants[0];  // 默认返回对照组
  }
  
  // 分层分流（支持正交实验）
  assignWithLayer(userId: string, layerId: string, experiments: Experiment[]): Assignment {
    // 每层独立哈希，实验之间正交
    const layerHash = this.hash(`${userId}:layer:${layerId}`);
    // ...
  }
  
  private hash(str: string): number {
    // FNV-1a hash
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash) % 10000;
  }
}

// 实验结果计算
class ExperimentAnalyzer {
  async analyze(experimentId: string): Promise<AnalysisResult> {
    const data = await this.fetchExperimentData(experimentId);
    
    // 计算指标
    const metrics = this.calculateMetrics(data);
    
    // 统计显著性检验（t-test）
    const significance = this.tTest(
      data.control.conversions,
      data.treatment.conversions
    );
    
    return {
      metrics,
      significance,
      recommendation: this.generateRecommendation(metrics, significance)
    };
  }
  
  private tTest(control: number[], treatment: number[]): SignificanceResult {
    // 双样本t检验
    const controlMean = mean(control);
    const treatmentMean = mean(treatment);
    const controlVar = variance(control);
    const treatmentVar = variance(treatment);
    
    const pooledVar = ((control.length - 1) * controlVar + (treatment.length - 1) * treatmentVar) 
                      / (control.length + treatment.length - 2);
    
    const se = Math.sqrt(pooledVar * (1/control.length + 1/treatment.length));
    const tStat = (treatmentMean - controlMean) / se;
    const df = control.length + treatment.length - 2;
    const pValue = this.calculatePValue(tStat, df);
    
    return {
      lift: (treatmentMean - controlMean) / controlMean,
      pValue,
      isSignificant: pValue < 0.05,
      confidenceInterval: this.calculateCI(treatmentMean, controlMean, se, df)
    };
  }
}
```

---

### 2.5 效果分析服务 (Metrics Service)

#### 职责
- 指标计算
- 实时看板数据
- 策略效果评估

#### 数据流设计

```
用户行为事件 → Kafka → Flink处理 → ClickHouse存储 → API查询 → 前端展示
                  ↓
            实时计算窗口（5分钟）
```

#### 核心表设计

```sql
-- 策略效果明细表（ClickHouse）
CREATE TABLE strategy_metrics (
    event_date Date,
    event_time DateTime,
    strategy_id String,
    execution_id String,
    user_id String,
    event_type Enum('send', 'delivery', 'impression', 'click', 'convert'),
    channel String,
    variant String,  -- AB实验分组
    gmv Decimal64(4),
    cost Decimal64(4)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (strategy_id, event_time);

-- 策略聚合统计（物化视图）
CREATE MATERIALIZED VIEW strategy_stats_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (strategy_id, event_date, channel, variant)
AS SELECT
    event_date,
    strategy_id,
    channel,
    variant,
    countIf(event_type = 'send') as sends,
    countIf(event_type = 'delivery') as deliveries,
    countIf(event_type = 'impression') as impressions,
    countIf(event_type = 'click') as clicks,
    countIf(event_type = 'convert') as conversions,
    sum(gmv) as total_gmv,
    sum(cost) as total_cost
FROM strategy_metrics
GROUP BY event_date, strategy_id, channel, variant;
```

---

## 三、数据模型

### 3.1 ER图

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ strategic_      │     │   strategies    │     │  executions     │
│   segments      │◄────│                 │────►│                 │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ name            │     │ name            │     │ strategy_id(FK) │
│ level           │     │ status          │     │ status          │
│ definition      │     │ segment_id(FK)  │     │ segment_size    │
│ api_config      │     │ components      │     │ schedule_time   │
└─────────────────┘     │ execution_config│     │ channel_results │
                        │ ai_suggestion   │     └─────────────────┘
                        └─────────────────┘              │
                                 │                       │
                                 ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   ab_tests      │     │  metrics_daily  │
                        ├─────────────────┤     ├─────────────────┤
                        │ id (PK)         │     │ date            │
                        │ strategy_id(FK) │     │ strategy_id(FK) │
                        │ traffic_split   │     │ execution_id(FK)│
                        │ status          │     │ sends           │
                        │ winner_variant  │     │ clicks          │
                        └─────────────────┘     │ conversions     │
                                                │ gmv             │
                                                └─────────────────┘
```

### 3.2 核心表DDL

```sql
-- 战略人群表
CREATE TABLE strategic_segments (
    id VARCHAR(64) PRIMARY KEY COMMENT '人群ID',
    name VARCHAR(255) NOT NULL COMMENT '人群名称',
    level TINYINT NOT NULL COMMENT '战略等级 1/2/3',
    description TEXT COMMENT '人群说明',
    definition JSON NOT NULL COMMENT '标签圈选条件',
    api_config JSON COMMENT '人群API配置',
    refresh_type ENUM('realtime', 'daily', 'weekly') DEFAULT 'daily' COMMENT '刷新类型',
    last_refresh_time TIMESTAMP NULL COMMENT '上次刷新时间',
    last_package_id VARCHAR(64) COMMENT '最新人群包ID',
    status ENUM('active', 'inactive') DEFAULT 'active',
    creator_id VARCHAR(64) COMMENT '创建人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_level (level),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='战略人群表';

-- 策略表
CREATE TABLE strategies (
    id VARCHAR(64) PRIMARY KEY COMMENT '策略ID',
    name VARCHAR(255) NOT NULL COMMENT '策略名称',
    description TEXT COMMENT '策略描述',
    status ENUM('draft', 'testing', 'running', 'paused', 'archived') DEFAULT 'draft',
    segment_id VARCHAR(64) NOT NULL COMMENT '关联人群ID',
    components JSON NOT NULL COMMENT '策略五要素配置',
    execution_config JSON COMMENT '执行配置',
    ai_suggestion JSON COMMENT 'AI建议',
    current_execution_id VARCHAR(64) COMMENT '当前执行ID',
    health_score INT COMMENT '策略健康分',
    creator_id VARCHAR(64) COMMENT '创建人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_segment (segment_id),
    INDEX idx_status (status),
    INDEX idx_creator (creator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='策略表';

-- 策略执行表
CREATE TABLE strategy_executions (
    id VARCHAR(64) PRIMARY KEY COMMENT '执行ID',
    strategy_id VARCHAR(64) NOT NULL COMMENT '策略ID',
    execution_no VARCHAR(64) COMMENT '执行批次号',
    status ENUM('pending', 'running', 'success', 'failed', 'partial', 'cancelled') DEFAULT 'pending',
    segment_size INT DEFAULT 0 COMMENT '人群规模',
    schedule_time TIMESTAMP NULL COMMENT '计划执行时间',
    actual_start_time TIMESTAMP NULL COMMENT '实际开始时间',
    actual_end_time TIMESTAMP NULL COMMENT '实际结束时间',
    channel_results JSON COMMENT '各渠道执行结果',
    error_msg TEXT COMMENT '错误信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_strategy (strategy_id),
    INDEX idx_status (status),
    INDEX idx_schedule (schedule_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='策略执行表';

-- AB实验表
CREATE TABLE ab_tests (
    id VARCHAR(64) PRIMARY KEY COMMENT '实验ID',
    strategy_id VARCHAR(64) NOT NULL COMMENT '策略ID',
    execution_id VARCHAR(64) COMMENT '执行ID',
    traffic_split DECIMAL(3,2) DEFAULT 0.10 COMMENT '实验流量比例',
    duration_days INT DEFAULT 3 COMMENT '实验天数',
    target_metric VARCHAR(64) DEFAULT 'conversion_rate' COMMENT '目标指标',
    min_lift DECIMAL(5,2) DEFAULT 0.10 COMMENT '最小提升',
    confidence_level DECIMAL(3,2) DEFAULT 0.95 COMMENT '置信度要求',
    status ENUM('pending', 'running', 'completed', 'stopped') DEFAULT 'pending',
    winner_variant ENUM('control', 'treatment', 'none') COMMENT '胜出版本',
    actual_lift DECIMAL(5,2) COMMENT '实际提升',
    p_value DECIMAL(5,4) COMMENT 'P值',
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_strategy (strategy_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AB实验表';

-- 用户分流记录表（用于确保用户始终在同一组）
CREATE TABLE ab_test_assignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    experiment_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    variant VARCHAR(32) NOT NULL COMMENT '分组',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_exp_user (experiment_id, user_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AB实验分流记录';

-- 操作日志表
CREATE TABLE operation_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    target_type VARCHAR(64) COMMENT '操作对象类型',
    target_id VARCHAR(64) COMMENT '操作对象ID',
    operation VARCHAR(64) COMMENT '操作类型',
    operator_id VARCHAR(64) COMMENT '操作人',
    before_value JSON COMMENT '操作前值',
    after_value JSON COMMENT '操作后值',
    ip VARCHAR(64) COMMENT 'IP地址',
    user_agent TEXT COMMENT 'UA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_target (target_type, target_id),
    INDEX idx_operator (operator_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';
```

---

## 四、接口设计

### 4.1 人群相关接口

```yaml
# 获取战略人群列表
GET /api/v1/segments
Response:
  data:
    - id: string
      name: string
      level: 1 | 2 | 3
      metrics:
        scale: number
        conversionRate: number
        gmvContribution: number
      diagnosis:
        status: 'healthy' | 'warning' | 'danger'
        opportunity: string
        risk: string

# 创建战略人群
POST /api/v1/segments
Body:
  name: string
  level: 1 | 2 | 3
  definition:
    conditions: TagCondition[]
  refreshType: 'realtime' | 'daily' | 'weekly'

# 预估人群规模
POST /api/v1/segments/estimate
Body:
  conditions: TagCondition[]
Response:
  estimatedSize: number
  confidence: number  # 预估置信度
```

### 4.2 策略相关接口

```yaml
# 创建策略
POST /api/v1/strategies
Body:
  name: string
  segmentId: string
  components:
    audience:
      segmentId: string
      customFilter?: Filter
    touchpoints:
      external: ExternalTouchpoint[]
      inApp: InAppTouchpoint[]
    landing: LandingConfig
    benefits: BenefitConfig
    products: ProductConfig
  execution:
    schedule:
      type: 'immediate' | 'scheduled' | 'recurring'
      cron?: string
    abTest:
      enabled: boolean
      trafficSplit: number
      duration: number

# 发布策略
POST /api/v1/strategies/{id}/publish
Response:
  executionId: string
  estimatedStartTime: datetime

# 获取策略详情
GET /api/v1/strategies/{id}
Response:
  id: string
  name: string
  status: string
  components: StrategyComponents
  metrics: StrategyMetrics
  aiSuggestion: AISuggestion

# 暂停策略
POST /api/v1/strategies/{id}/pause

# 获取策略列表
GET /api/v1/strategies
Query:
  status?: string
  segmentId?: string
  page: number
  pageSize: number
```

### 4.3 效果相关接口

```yaml
# 获取策略实时数据
GET /api/v1/strategies/{id}/metrics
Query:
  startDate: date
  endDate: date
  granularity: 'hour' | 'day'
Response:
  timeline:
    - time: datetime
      sends: number
      deliveries: number
      clicks: number
      conversions: number
      gmv: number
  summary:
    totalSends: number
    totalClicks: number
    ctr: number
    conversionRate: number
    roi: number

# 获取AB实验报告
GET /api/v1/strategies/{id}/abtest-report
Response:
  status: string
  variants:
    - name: string
      traffic: number
      metrics:
        conversionRate: number
        gmv: number
  comparison:
    lift: number
    pValue: number
    isSignificant: boolean
    confidenceInterval: [number, number]
  recommendation:
    action: 'promote' | 'stop' | 'continue'
    reason: string
```

---

## 五、关键问题解决

### 5.1 人群包大数据量处理

**问题**：人群包可能包含数百万用户，直接加载到内存会导致OOM。

**解决方案**：
1. 流式处理：使用Node.js Stream或Java Stream API
2. 分批处理：每批处理10,000用户
3. 异步队列：大人群包生成放入消息队列异步处理
4. 文件存储：人群包以文件形式存储在OSS，按需加载

```typescript
// 流式处理示例
async function processLargeAudience(userStream: Readable, batchSize = 10000) {
  let batch: string[] = [];
  
  for await (const userId of userStream) {
    batch.push(userId);
    
    if (batch.length >= batchSize) {
      await processBatch(batch);
      batch = [];
    }
  }
  
  // 处理剩余
  if (batch.length > 0) {
    await processBatch(batch);
  }
}
```

### 5.2 触达频次控制

**问题**：需要控制同一用户被触达的频次，避免过度打扰。

**解决方案**：
1. 使用Redis记录用户触达历史
2. 滑动窗口统计
3. 策略执行前检查频次

```typescript
// 频次检查
async function checkFrequency(userId: string, config: FrequencyConfig): Promise<boolean> {
  const key = `freq:${userId}:${config.window}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // 清理过期记录并添加新记录
  await redis.zremrangebyscore(key, 0, windowStart);
  const count = await redis.zcard(key);
  
  if (count >= config.maxCount) {
    return false;  // 超过频次限制
  }
  
  await redis.zadd(key, now, `${now}:${Math.random()}`);
  await redis.expire(key, Math.ceil(config.windowMs / 1000));
  return true;
}
```

### 5.3 策略冲突处理

**问题**：同一用户可能同时命中多个策略，需要处理冲突。

**解决方案**：
1. 优先级机制：每个策略设置优先级
2. 互斥规则：配置策略互斥关系
3. 疲劳度控制：全局频次限制

```typescript
// 策略冲突检测
async function detectConflicts(userId: string, strategy: Strategy): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  
  // 检查是否有更高优先级策略已触达
  const recentTouches = await getRecentTouches(userId, 24 * 60 * 60);
  for (const touch of recentTouches) {
    if (touch.priority > strategy.priority) {
      conflicts.push({
        type: 'PRIORITY',
        message: `用户近期已被更高优先级策略触达`
      });
    }
  }
  
  // 检查互斥策略
  const mutexStrategies = await getMutexStrategies(strategy.id);
  for (const mutexId of mutexStrategies) {
    if (await isUserInExecution(userId, mutexId)) {
      conflicts.push({
        type: 'MUTEX',
        message: `用户已在互斥策略的执行名单中`
      });
    }
  }
  
  return conflicts;
}
```

---

## 六、监控与告警

### 6.1 关键监控指标

| 指标 | 类型 | 告警阈值 |
|-----|------|---------|
| 策略执行成功率 | 业务 | < 95% |
| 人群包生成耗时 | 业务 | > 30分钟 |
| 消息发送延迟 | 业务 | > 5分钟 |
| 消息送达率 | 业务 | < 80% |
| API响应时间 | 技术 | P99 > 500ms |
| 错误率 | 技术 | > 1% |
| 队列堆积数 | 技术 | > 10000 |

### 6.2 日志规范

```typescript
// 结构化日志
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  traceId: string;
  spanId: string;
  service: string;
  operation: string;
  strategyId?: string;
  executionId?: string;
  userId?: string;
  message: string;
  metadata: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

---

## 七、部署与运维

### 7.1 环境规划

| 环境 | 用途 | 配置 |
|-----|------|------|
| dev | 开发调试 | 单机部署 |
| test | 测试验证 | 双节点 |
| staging | 预发布 | 同生产配置 |
| prod | 生产环境 | 多节点集群 |

### 7.2 配置文件

```yaml
# application.yml
server:
  port: 3000

database:
  mysql:
    host: ${MYSQL_HOST}
    port: 3306
    database: strategy_platform
    pool:
      min: 5
      max: 20
  redis:
    host: ${REDIS_HOST}
    port: 6379
    db: 0
  clickhouse:
    host: ${CH_HOST}
    port: 8123
    database: analytics

queue:
  type: rabbitmq
  rabbitmq:
    host: ${RABBIT_HOST}
    port: 5672
    queues:
      execution: strategy.execution
      delay: strategy.execution.delay

external:
  audience_api:
    base_url: ${AUDIENCE_API_URL}
    timeout: 30000
  push_api:
    base_url: ${PUSH_API_URL}
    timeout: 10000
  sms_api:
    base_url: ${SMS_API_URL}
    timeout: 10000

features:
  ab_test_enabled: true
  auto_optimization: false  # MVP关闭自动优化
  ai_suggestion: true
```
