# 智能策略SaaS平台 - 产品架构设计

## 一、产品定位

**一句话描述**：面向企业运营团队的智能化策略运营平台，通过"人货场"数据融合+AI智能决策，实现从策略设计、执行到自动优化的闭环。

**核心价值**：
- 降低策略设计门槛（AI辅助洞察+可视化编排）
- 提升策略执行效率（自动化投放+多渠道协同）
- 保障策略持续优化（自动效果回收+智能迭代）

---

## 二、业务架构（人货场）

### 2.1 第一阶段：人群运营（当前重点）

```
┌─────────────────────────────────────────────────────────────────┐
│                        智能策略平台                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │  人群洞察   │→│  策略设计   │→│  策略执行   │→│ 效果回收│ │
│  │  &诊断     │  │  &编排     │  │  &触达     │  │ &迭代   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│         ↑                                              ↓        │
│         └────────────── 数据回流 & 策略优化 ───────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 核心业务流程

```
Day 0: 数据接入
   ↓
Day 1: 智能诊断 → 识别战略人群1/2/3的机会/问题
   ↓
Day 2: AI策略建议 → 运营确认/调整策略
   ↓
Day 3: 策略编排 → 人群+触达+承接页+权益+商品
   ↓
Day 4: AB实验 → 小流量测试
   ↓
Day 5+: 全量投放 → 持续监控 → 自动优化 → 沉淀优质策略
```

---

## 三、产品功能模块设计

### 3.1 模块一：数据诊断中心

#### 功能清单
| 功能 | 描述 | 优先级 |
|-----|------|-------|
| 战略人群看板 | 展示3个战略人群的规模、转化率、GMV贡献等核心指标 | P0 |
| 智能诊断报告 | AI分析各人群当前状态，识别增长机会/流失风险 | P0 |
| 人群对比分析 | 多人群横向对比，发现差异化机会 | P1 |
| 趋势预警 | 关键指标异常自动预警 | P1 |

#### 数据结构
```typescript
// 战略人群定义
interface StrategicSegment {
  id: string;
  name: string;           // 如"高价值流失风险用户"
  level: 1 | 2 | 3;       // 战略优先级
  definition: {
    tags: TagCondition[]; // 标签圈选条件
    description: string;  // 业务定义说明
  };
  metrics: {
    scale: number;        // 人群规模
    conversionRate: number;
    gmvContribution: number;
    growthTrend: 'up' | 'down' | 'stable';
  };
  diagnosis: {
    opportunity: string;  // AI识别机会点
    risk: string;         // AI识别风险点
    priority: number;     // 运营优先级评分
  };
}
```

---

### 3.2 模块二：策略编排中心

#### 功能清单
| 功能 | 描述 | 优先级 |
|-----|------|-------|
| 策略画布 | 可视化编排：人群→触达→承接→权益→商品 | P0 |
| 人群选择器 | 选择战略人群/自定义圈选 | P0 |
| 触达配置 | 外部渠道(Push/SMS/微信) + 端内(弹窗/横幅) | P0 |
| 承接页搭建 | 低代码页面/素材配置 | P1 |
| 权益配置 | 优惠券/积分/会员权益绑定 | P1 |
| 商品推荐 | 策略关联商品池/单品 | P2 |
| 策略模板库 | 预设策略模板快速复用 | P1 |

#### 策略模型设计
```typescript
// 策略定义（核心数据结构）
interface Strategy {
  id: string;
  name: string;
  status: 'draft' | 'testing' | 'running' | 'paused' | 'archived';
  
  // 策略五要素
  components: {
    // 1. 人群
    audience: {
      segmentId: string;      // 战略人群ID
      customFilter?: Filter;  // 额外筛选条件
      estimatedSize: number;  // 预估覆盖人数
    };
    
    // 2. 触达（多渠道）
    touchpoints: {
      external?: ExternalTouchpoint[];  // 外部触达
      inApp?: InAppTouchpoint[];        // 端内触达
      priority: 'sequential' | 'parallel'; // 执行顺序
    };
    
    // 3. 承接
    landing: {
      type: 'page' | 'popup' | 'drawer';
      config: PageConfig | PopupConfig;
      abTestEnabled: boolean;
    };
    
    // 4. 权益
    benefits: {
      type: 'coupon' | 'points' | 'vip' | 'none';
      config: BenefitConfig;
      trigger: 'immediately' | 'condition'; // 发放时机
    };
    
    // 5. 商品
    products: {
      type: 'pool' | 'specific' | 'recommend';
      items: string[];  // 商品ID或商品池ID
    };
  };
  
  // 执行配置
  execution: {
    schedule: {
      type: 'immediate' | 'scheduled' | 'recurring';
      cron?: string;    // 周期性策略的cron表达式
    };
    abTest?: {
      enabled: boolean;
      trafficSplit: number;  // 实验流量比例
      duration: number;      // 实验天数
    };
    exitCondition?: {       // 自动下线条件
      metric: string;
      threshold: number;
      operator: 'gt' | 'lt';
    };
  };
  
  // AI建议
  aiSuggestion?: {
    confidence: number;
    expectedConversion: number;
    recommendation: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### 策略画布交互设计
```
┌─────────────────────────────────────────────────────────────┐
│  策略名称: [春节高价值用户召回策略]          [保存] [发布]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌────────┐ │
│   │  人群   │───→│  触达   │───→│  承接   │───→│  权益  │ │
│   │         │    │         │    │         │    │        │ │
│   │ 战略人群1│    │ Push    │    │ 活动页  │    │ 8折券  │ │
│   │ 高价值流 │    │ 短信    │    │         │    │        │ │
│   │ 失风险   │    │ 弹窗    │    │         │    │        │ │
│   └────┬────┘    └─────────┘    └─────────┘    └────────┘ │
│        │                                                    │
│        ↓                                                    │
│   ┌─────────┐                                               │
│   │  商品   │                                               │
│   │ 推荐池A │                                               │
│   └─────────┘                                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  执行设置: [立即执行]  AB实验: [开]  流量: [10%]  持续: [3天] │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.3 模块三：策略执行引擎

#### 功能清单
| 功能 | 描述 | 优先级 |
|-----|------|-------|
| 任务调度 | 策略任务的调度执行 | P0 |
| 人群包同步 | 同步到各触达渠道 | P0 |
| 渠道适配器 | 统一封装各渠道API | P0 |
| AB实验分流 | 实验组对照组分流 | P1 |
| 频次控制 | 用户触达频次上限 | P1 |
| 疲劳度控制 | 避免过度打扰用户 | P1 |

#### 执行流程
```
策略发布
   ↓
[策略编排] → 生成执行计划
   ↓
[人群计算] → 调用人群API → 生成人群包
   ↓
[AB分流] → 实验组/对照组分配
   ↓
[渠道分发] 
   ├── 外部触达 → Push API / SMS API / 微信API
   ├── 端内触达 → 弹窗API / Banner API / 站内信API
   └── 页面渲染 → 端页面API
   ↓
[权益发放] → 营销API发放优惠券/积分
   ↓
[效果追踪] → 埋点数据回收
```

---

### 3.4 模块四：效果回收与优化

#### 功能清单
| 功能 | 描述 | 优先级 |
|-----|------|-------|
| 实时数据看板 | 策略执行实时数据 | P0 |
| AB实验报告 | 实验效果对比分析 | P0 |
| 策略评分 | 自动计算策略健康分 | P1 |
| 智能优化建议 | AI分析给出优化方向 | P1 |
| 自动迭代 | 优质策略自动全量/劣质自动下线 | P2 |
| 策略沉淀 | 优质策略入库长期投放 | P2 |

#### 效果指标体系
```typescript
// 策略效果指标
interface StrategyMetrics {
  // 触达指标
  reach: {
    sent: number;        // 发送数
    delivered: number;   // 送达数
    deliveryRate: number;
  };
  
  // 转化指标
  conversion: {
    impressions: number; // 曝光
    clicks: number;      // 点击
    ctr: number;         // 点击率
    conversions: number; // 转化数
    cvr: number;         // 转化率
    gmv: number;         // GMV
    roi: number;         // ROI
  };
  
  // AB实验指标
  abTest?: {
    experimentLift: number;    // 实验提升
    confidenceLevel: number;   // 置信度
    isSignificant: boolean;    // 是否显著
  };
  
  // 策略健康度
  healthScore: number;  // 0-100分
}
```

---

## 四、技术架构设计

### 4.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          前端应用层                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │诊断中心  │ │策略编排  │ │执行监控  │ │效果分析  │ │策略库    │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          API网关层                                   │
│              认证/鉴权/限流/日志/监控                                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          业务服务层                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │诊断服务  │ │策略服务  │ │执行服务  │ │效果服务  │ │AI服务    │ │
│  │          │ │          │ │          │ │          │ │          │ │
│  │-人群分析 │ │-策略CRUD │ │-任务调度 │ │-指标计算 │ │-洞察分析 │ │
│  │-数据诊断 │ │-画布编排 │ │-渠道分发 │ │-AB报告   │ │-优化建议 │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          数据层                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │MySQL     │ │Redis     │ │ES        │ │ClickHouse│ │对象存储  │ │
│  │策略配置  │ │缓存/锁   │ │人群检索  │ │效果数据  │ │素材文件  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          外部API层                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │人群API   │ │Push API  │ │端API     │ │商品API   │ │营销API   │ │
│  │          │ │SMS API   │ │          │ │          │ │          │ │
│  │-标签圈选 │ │-消息推送 │ │-弹窗     │ │-商品信息 │ │-优惠券   │ │
│  │-人群包   │ │-短信     │ │-页面     │ │-库存     │ │-积分     │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 核心表结构设计

```sql
-- 战略人群表
CREATE TABLE strategic_segments (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    level INT NOT NULL COMMENT '战略优先级 1/2/3',
    definition JSON COMMENT '人群定义条件',
    api_config JSON COMMENT '人群API配置',
    status ENUM('active', 'inactive'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 策略表
CREATE TABLE strategies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('draft', 'testing', 'running', 'paused', 'archived'),
    segment_id VARCHAR(64) COMMENT '关联战略人群',
    components JSON COMMENT '策略五要素配置',
    execution_config JSON COMMENT '执行配置',
    ai_suggestion JSON COMMENT 'AI建议',
    creator_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 策略执行实例表
CREATE TABLE strategy_executions (
    id VARCHAR(64) PRIMARY KEY,
    strategy_id VARCHAR(64) NOT NULL,
    execution_no VARCHAR(64) COMMENT '执行批次号',
    status ENUM('pending', 'running', 'success', 'failed', 'partial'),
    segment_size INT COMMENT '人群规模',
    schedule_time TIMESTAMP COMMENT '计划执行时间',
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    channel_results JSON COMMENT '各渠道执行结果',
    error_msg TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AB实验表
CREATE TABLE ab_tests (
    id VARCHAR(64) PRIMARY KEY,
    strategy_id VARCHAR(64) NOT NULL,
    traffic_split DECIMAL(3,2) COMMENT '实验流量比例',
    duration_days INT COMMENT '实验天数',
    status ENUM('pending', 'running', 'completed', 'stopped'),
    winner_variant ENUM('A', 'B', 'none') COMMENT '胜出版本',
    confidence_level DECIMAL(3,2),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 五、MVP版本规划

### 5.1 MVP功能范围

| 模块 | MVP功能 | 说明 |
|-----|--------|------|
| 数据诊断 | 3个战略人群看板 | 基础指标展示 |
| 数据诊断 | AI诊断报告 | 简单机会/风险识别 |
| 策略编排 | 策略画布(简化版) | 人群+1个触达渠道+1个权益 |
| 策略编排 | 策略保存/发布 | 基础CRUD |
| 策略执行 | 单次执行 | 立即执行，暂不支持周期 |
| 策略执行 | 单渠道推送 | 先支持Push或SMS |
| 效果回收 | 基础数据展示 | 发送数/点击数/转化数 |
| 效果回收 | AB实验报告 | 简单对比 |

### 5.2 MVP里程碑

```
Week 1-2: 基础架构搭建
   - 项目初始化
   - 数据库设计
   - 基础API框架
   
Week 3-4: 人群模块
   - 战略人群管理
   - 人群API对接
   - 诊断看板
   
Week 5-6: 策略编排模块
   - 策略画布
   - 策略CRUD
   - AI诊断建议接入
   
Week 7-8: 执行&效果模块
   - 触达渠道对接
   - 执行引擎
   - 效果数据回收
   
Week 9: AB实验
   - 分流逻辑
   - 实验报告
   
Week 10: 整合测试&优化
   - 端到端测试
   - 性能优化
   - 文档完善
```

---

## 六、关键设计决策

### 6.1 策略模型设计原则

1. **组件化**：人群/触达/承接/权益/商品独立配置，便于复用和扩展
2. **可视化**：策略画布直观展示策略全貌
3. **可实验**：内置AB实验能力，确保策略效果可量化
4. **可自动化**：支持自动迭代条件配置，实现策略自优化

### 6.2 人群洞察与AI结合

```
数据输入 → AI分析 → 运营决策 → 策略生成 → 执行验证 → 效果反馈
   ↑                                                      ↓
   └────────────────── 持续学习优化 ───────────────────────┘
```

- **AI能力边界**：提供洞察建议，最终决策权给运营
- **Prompt设计**：结合业务指标和历史数据生成可操作建议
- **效果闭环**：策略执行效果反哺AI模型优化

### 6.3 扩展性考虑

| 扩展方向 | 设计方案 |
|---------|---------|
| 新增触达渠道 | 渠道适配器模式，新增Adapter即可 |
| 新增权益类型 | 权益组件配置化扩展 |
| 货/场维度 | 复用策略编排模型，新增数据源 |
| 多租户 | 数据表增加tenant_id字段 |
| 工作流审批 | 策略状态机扩展审批节点 |

---

## 七、待确认问题

1. **战略人群的定义方式**：是完全人工定义，还是AI辅助推荐？
2. **人群数据实时性**：人群包是T+1更新还是实时计算？
3. **触达渠道优先级**：外部触达和端内触达的优先级和冲突处理？
4. **权益发放实时性**：权益是实时发放还是定时发放？
5. **策略冲突处理**：同一用户命中多个策略如何处理？
6. **数据权限**：不同角色能看到哪些人群和策略数据？
