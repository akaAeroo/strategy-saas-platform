# AI原生数据模型设计

## 一、数据模型设计原则

### 1.1 AI原生数据特点

| 特点 | 说明 | 设计影响 |
|-----|------|---------|
| **向量化存储** | AI需要语义检索能力 | 引入Vector DB |
| **多模态数据** | 支持文本、结构化、事件数据 | 分离存储，统一访问 |
| **时序特征** | AI预测依赖时间序列 | 强化时序数据存储 |
| **实时性要求** | AI决策需要实时数据 | 流式数据处理 |
| **反馈闭环** | AI学习需要效果反馈 | 埋点+归因设计 |

### 1.2 数据分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        数据分层架构                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Layer 4: AI知识层 (AI Knowledge Layer)                  │  │
│   │  • 向量存储：语义检索、RAG                                 │  │
│   │  • 记忆数据：Agent记忆、用户偏好                          │  │
│   │  • 知识图谱：实体关系、策略模式                            │  │
│   │  Store: Pinecone / Milvus / Neo4j                        │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Layer 3: 分析数据层 (Analytics Layer)                   │  │
│   │  • 事件数据：用户行为、触达事件                            │  │
│   │  • 聚合指标：实时指标、统计报表                            │  │
│   │  • 时序数据：趋势分析、异常检测                            │  │
│   │  Store: ClickHouse / Druid / Kafka                       │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Layer 2: 业务数据层 (Business Layer)                    │  │
│   │  • 策略配置：策略定义、执行计划                            │  │
│   │  • 人群数据：人群定义、人群包                              │  │
│   │  • AB实验：实验配置、分流记录                              │  │
│   │  Store: MySQL / PostgreSQL                               │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Layer 1: 元数据层 (Metadata Layer)                      │  │
│   │  • 连接器配置：API连接、认证信息                            │  │
│   │  • Agent配置：Agent定义、工具注册                          │  │
│   │  • 系统配置：租户、权限、限流                              │  │
│   │  Store: MySQL / etcd / Consul                            │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Layer 0: 缓存层 (Cache Layer)                           │  │
│   │  • 会话缓存：对话状态、上下文                              │  │
│   │  • 数据缓存：热点数据、计算结果                            │  │
│   │  • 锁与队列：分布式锁、任务队列                            │  │
│   │  Store: Redis / Memcached                                │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、核心数据模型

### 2.1 策略模型 (Strategy)

```typescript
/**
 * 策略核心模型
 * 支持AI生成、人工编辑、版本管理
 */
interface Strategy {
  // 基础信息
  id: string;                    // 策略ID
  tenantId: string;              // 租户ID
  name: string;                  // 策略名称
  description: string;           // 策略描述
  
  // AI生成信息
  aiGenerated: {
    isGenerated: boolean;        // 是否AI生成
    generationId: string;        // 生成任务ID
    prompt: string;              // 原始提示词
    model: string;               // 使用的模型
    confidence: number;          // AI置信度
    reasoning: string;           // AI推理过程
  };
  
  // 策略版本
  version: {
    major: number;               // 主版本
    minor: number;               // 次版本
    createdAt: Date;             // 版本创建时间
    createdBy: string;           // 创建人
    changeLog: string;           // 变更说明
  };
  
  // 策略状态
  status: StrategyStatus;        // 状态机状态
  statusHistory: StatusChange[]; // 状态变更历史
  
  // 策略五要素
  components: StrategyComponents;
  
  // 执行配置
  execution: ExecutionConfig;
  
  // 效果预测（AI生成时自动计算）
  prediction: StrategyPrediction;
  
  // 关联标签
  tags: string[];
  
  // 元数据
  metadata: {
    category: string;            // 策略分类
    businessGoal: string;        // 业务目标
    priority: number;            // 优先级
    customFields: Record<string, any>;
  };
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

/**
 * 策略五要素
 */
interface StrategyComponents {
  // 1. 人群
  audience: {
    segmentId: string;           // 关联人群ID
    segmentSnapshot: SegmentSnapshot; // 人群快照（防止人群定义变更影响策略）
    customFilter?: Filter;       // 额外筛选
    estimatedSize: number;       // 预估规模
    sizeConfidence: number;      // 规模预估置信度
  };
  
  // 2. 触达
  touchpoints: {
    channels: TouchpointChannel[];
    priority: 'sequential' | 'parallel';
    frequencyCap?: FrequencyCap;
  };
  
  // 3. 承接
  landing: {
    type: 'page' | 'popup' | 'drawer';
    config: LandingConfig;
    abTest: {
      enabled: boolean;
      variants: LandingVariant[];
    };
  };
  
  // 4. 权益
  benefits: {
    type: 'coupon' | 'points' | 'vip' | 'none';
    config: BenefitConfig;
    trigger: 'immediately' | 'condition' | 'manual';
    inventoryReservation?: string; // 库存预占ID
  };
  
  // 5. 商品
  products: {
    type: 'pool' | 'specific' | 'recommend' | 'none';
    items: string[];
    recommendationConfig?: RecommendationConfig;
  };
}

/**
 * 策略效果预测
 */
interface StrategyPrediction {
  generatedAt: Date;
  modelVersion: string;
  
  predictions: {
    metric: string;              // 指标名
    predictedValue: number;      // 预测值
    confidenceInterval: [number, number]; // 置信区间
    confidence: number;          // 置信度
  }[];
  
  keyMetrics: {
    estimatedConversionRate: number;
    estimatedGMV: number;
    estimatedROI: number;
    estimatedReach: number;
  };
  
  // 预测依据
  basedOn: {
    similarStrategies: string[]; // 参考的相似策略
    historicalDataRange: DateRange;
    modelFeatures: string[];     // 使用的特征
  };
}
```

### 2.2 人群模型 (Segment)

```typescript
/**
 * 战略人群模型
 */
interface StrategicSegment {
  id: string;
  tenantId: string;
  
  // 基础信息
  name: string;
  description: string;
  
  // 战略属性
  level: 1 | 2 | 3;              // 战略优先级
  category: string;              // 人群分类
  
  // 人群定义
  definition: {
    // DSL定义
    dsl: SegmentDSL;
    
    // 自然语言描述（AI可理解）
    nlDescription: string;
    
    // SQL/Query（用于执行）
    query: {
      type: 'sql' | 'api' | 'mixed';
      content: string;
    };
    
    // 标签条件（用于展示）
    tagConditions: TagCondition[];
  };
  
  // 数据源配置
  dataSource: {
    connectorId: string;         // 连接器ID
    connectorConfig: Record<string, any>;
    refreshType: 'realtime' | 'hourly' | 'daily' | 'manual';
    lastRefreshAt?: Date;
    nextRefreshAt?: Date;
  };
  
  // 人群画像（AI生成）
  portrait: {
    generatedAt: Date;
    summary: string;             // 人群摘要
    characteristics: Characteristic[]; // 特征标签
    preferences: Preference[];   // 偏好分析
    behaviorPatterns: Pattern[]; // 行为模式
    valueDistribution: Distribution; // 价值分布
  };
  
  // 健康度
  health: {
    score: number;               // 0-100
    lastCalculatedAt: Date;
    trends: MetricTrend[];
    alerts: Alert[];
  };
  
  // AI诊断
  aiDiagnosis: {
    lastDiagnosedAt: Date;
    status: 'healthy' | 'warning' | 'critical';
    issues: Issue[];
    opportunities: Opportunity[];
    recommendations: Recommendation[];
  };
  
  // 人群规模历史
  sizeHistory: {
    timestamp: Date;
    size: number;
    sampleConfidence: number;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 人群包（执行时用）
 */
interface SegmentPackage {
  id: string;
  segmentId: string;
  version: number;               // 人群包版本
  
  // 规模信息
  size: number;
  sampleSize?: number;           // 抽样大小（大数据量时）
  
  // 存储信息
  storage: {
    type: 'file' | 'database' | 'cache';
    location: string;            // 存储位置
    format: 'csv' | 'json' | 'parquet';
    size: number;                // 文件大小
    checksum: string;
  };
  
  // 有效期
  generatedAt: Date;
  expiresAt: Date;
  
  // 统计信息
  statistics: {
    field: string;
    distribution: Distribution;
  }[];
  
  // 使用记录
  usageHistory: {
    executionId: string;
    usedAt: Date;
    matchedCount: number;
  }[];
}
```

### 2.3 Agent记忆模型

```typescript
/**
 * Agent记忆模型
 */
interface AgentMemory {
  id: string;
  agentId: string;
  userId?: string;
  sessionId?: string;
  
  // 记忆类型
  type: 'conversation' | 'preference' | 'fact' | 'reflection' | 'strategy_pattern';
  
  // 记忆内容
  content: {
    text: string;                // 文本内容
    structured?: any;            // 结构化数据
    embedding?: number[];        // 向量表示
  };
  
  // 上下文
  context: {
    intent?: string;
    entities?: Entity[];
    relatedMemories?: string[];
  };
  
  // 元数据
  metadata: {
    importance: number;          // 重要程度 0-1
    confidence: number;          // 置信度
    source: string;              // 来源
    category?: string;
    tags?: string[];
  };
  
  // 时间戳
  createdAt: Date;
  updatedAt?: Date;
  accessHistory: {
    accessedAt: Date;
    context: string;
  }[];
  
  // 过期控制
  ttl?: number;                  // 存活时间(秒)
  expiresAt?: Date;
}

/**
 * 用户画像（Agent学习生成）
 */
interface UserProfile {
  userId: string;
  tenantId: string;
  
  // 基础偏好
  preferences: {
    category: string;
    value: any;
    confidence: number;
    learnedFrom: string[];
    updatedAt: Date;
  }[];
  
  // 专业能力
  expertise: {
    domain: string;              // 领域
    level: 'beginner' | 'intermediate' | 'expert';
    evidence: string[];
  }[];
  
  // 交互风格
  communicationStyle: {
    formality: 'casual' | 'formal' | 'technical';
    detailLevel: 'brief' | 'moderate' | 'detailed';
    preferredFormat: 'text' | 'table' | 'chart';
    decisionSpeed: 'quick' | 'thoughtful' | 'analytical';
  };
  
  // 常用策略模板
  favoriteTemplates: {
    templateId: string;
    usageCount: number;
    lastUsedAt: Date;
  }[];
  
  // 历史策略表现（该用户创建的策略）
  strategyHistory: {
    totalCreated: number;
    avgConversionRate: number;
    avgROI: number;
    topPerformingCategories: string[];
  };
  
  // 更新记录
  updatedAt: Date;
  version: number;
}
```

### 2.4 连接器模型

```typescript
/**
 * 连接器配置模型
 */
interface Connector {
  id: string;
  tenantId: string;
  
  // 基础信息
  name: string;
  type: 'datasource' | 'channel' | 'marketing' | 'business';
  category: string;
  
  // 实现信息
  implementation: {
    provider: string;            // 提供者
    version: string;
    runtime: 'nodejs' | 'python' | 'java' | 'wasm';
    packageUrl: string;          // 连接器包地址
    entryPoint: string;
  };
  
  // 连接配置
  config: {
    endpoint: {
      baseUrl: string;
      timeout: number;
      retryPolicy: RetryPolicy;
    };
    authentication: {
      type: 'apikey' | 'oauth2' | 'basic' | 'jwt';
      config: Record<string, any>; // 加密存储
    };
    rateLimit: {
      requestsPerSecond: number;
      burstSize: number;
    };
    mappings: DataMapping[];
  };
  
  // 能力声明
  capabilities: {
    name: string;
    description: string;
    operations: OperationDefinition[];
  }[];
  
  // 状态
  status: 'draft' | 'testing' | 'active' | 'error' | 'deprecated';
  health: {
    lastCheckAt: Date;
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    errorRate: number;
  };
  
  // 使用统计
  statistics: {
    totalCalls: number;
    successCalls: number;
    avgLatency: number;
    lastUsedAt: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 连接器操作定义
 */
interface OperationDefinition {
  name: string;
  description: string;
  
  // 参数schema
  parameters: JSONSchema;
  
  // 返回schema
  returns: JSONSchema;
  
  // 示例
  examples: {
    input: any;
    output: any;
  }[];
  
  // 性能特征
  performance: {
    avgLatency: number;          // 平均延迟(ms)
    timeout: number;
    retryable: boolean;
    idempotent: boolean;
  };
  
  // 权限要求
  permissions?: string[];
}
```

---

## 三、事件与指标模型

### 3.1 事件模型

```typescript
/**
 * 策略事件（用于效果追踪和AI学习）
 */
interface StrategyEvent {
  // 事件标识
  eventId: string;
  eventType: StrategyEventType;
  
  // 时间戳
  timestamp: Date;
  processedAt?: Date;
  
  // 关联信息
  tenantId: string;
  strategyId: string;
  executionId: string;
  userId: string;
  
  // 事件详情
  payload: {
    // 不同事件类型的具体数据
    [key: string]: any;
  };
  
  // 上下文
  context: {
    channel?: string;            // 触达渠道
    variant?: string;            // AB实验分组
    deviceType?: string;
    appVersion?: string;
    geoLocation?: GeoLocation;
  };
  
  // 归因
  attribution: {
    touchpointIndex: number;     // 触点序号
    timeSinceLastTouch: number;  // 距上次触达时间
    isConversion: boolean;
    conversionValue?: number;
  };
  
  // 元数据
  metadata: {
    source: string;
    sdkVersion: string;
    ip?: string;
    userAgent?: string;
  };
}

type StrategyEventType = 
  | 'strategy.published'        // 策略发布
  | 'strategy.executed'         // 策略执行
  | 'touchpoint.sent'           // 触达发送
  | 'touchpoint.delivered'      // 触达送达
  | 'touchpoint.clicked'        // 用户点击
  | 'landing.viewed'            // 承接页浏览
  | 'benefit.granted'           // 权益发放
  | 'benefit.used'              // 权益使用
  | 'conversion.completed'      // 转化完成
  | 'strategy.optimized';       // 策略优化
```

### 3.2 指标模型

```typescript
/**
 * 策略效果指标
 */
interface StrategyMetrics {
  id: string;
  strategyId: string;
  executionId: string;
  
  // 时间维度
  timeWindow: {
    start: Date;
    end: Date;
    granularity: 'hour' | 'day' | 'week';
  };
  
  // 触达指标
  reach: {
    targeted: number;            // 目标人数
    sent: number;                // 发送数
    delivered: number;           // 送达数
    displayed: number;           // 展示数
    clicked: number;             // 点击数
    
    rates: {
      deliveryRate: number;
      displayRate: number;
      clickRate: number;
    };
  };
  
  // 转化指标
  conversion: {
    uniqueVisitors: number;
    conversions: number;
    conversionRate: number;
    
    byStep: {
      step: string;
      count: number;
      dropOffRate: number;
    }[];
  };
  
  // 业务指标
  business: {
    gmv: number;
    orderCount: number;
    aov: number;                 // 客单价
    arpu: number;                // 用户平均收入
  };
  
  // 成本指标
  cost: {
    benefitCost: number;         // 权益成本
    channelCost: number;         // 渠道成本
    totalCost: number;
  };
  
  // 综合指标
  derived: {
    roi: number;
    cpa: number;                 // 单客获取成本
    cvr: number;                 // 转化率
    lift?: number;               // 实验提升(AB测试)
  };
  
  // 分维度指标
  breakdowns: {
    dimension: string;           // 维度名
    segments: {
      value: string;
      metrics: Partial<StrategyMetrics>;
    }[];
  }[];
  
  // AI分析
  aiAnalysis: {
    performanceRating: 'excellent' | 'good' | 'average' | 'poor';
    anomalies: Anomaly[];
    insights: Insight[];
    recommendations: Recommendation[];
  };
  
  createdAt: Date;
}
```

---

## 四、数据库表设计

### 4.1 MySQL表结构

```sql
-- =============================================
-- 策略相关表
-- =============================================

CREATE TABLE strategies (
    id VARCHAR(64) PRIMARY KEY COMMENT '策略ID',
    tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
    name VARCHAR(255) NOT NULL COMMENT '策略名称',
    description TEXT COMMENT '策略描述',
    
    -- AI生成信息
    ai_generated BOOLEAN DEFAULT FALSE COMMENT '是否AI生成',
    generation_id VARCHAR(64) COMMENT '生成任务ID',
    ai_prompt TEXT COMMENT '原始提示词',
    ai_model VARCHAR(64) COMMENT '使用模型',
    ai_confidence DECIMAL(3,2) COMMENT 'AI置信度',
    ai_reasoning TEXT COMMENT 'AI推理过程',
    
    -- 版本信息
    version_major INT DEFAULT 1 COMMENT '主版本',
    version_minor INT DEFAULT 0 COMMENT '次版本',
    version_created_by VARCHAR(64) COMMENT '版本创建人',
    version_change_log TEXT COMMENT '变更说明',
    
    -- 状态
    status VARCHAR(32) NOT NULL COMMENT '状态',
    status_history JSON COMMENT '状态变更历史',
    
    -- 策略配置
    components JSON NOT NULL COMMENT '策略五要素配置',
    execution_config JSON COMMENT '执行配置',
    prediction JSON COMMENT '效果预测',
    
    -- 元数据
    metadata JSON COMMENT '元数据',
    tags JSON COMMENT '标签',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    archived_at TIMESTAMP NULL,
    
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_tenant_created (tenant_id, created_at),
    INDEX idx_ai_generated (ai_generated),
    INDEX idx_tags ((CAST(tags AS CHAR(255) ARRAY)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='策略表';

-- =============================================
-- 人群相关表
-- =============================================

CREATE TABLE strategic_segments (
    id VARCHAR(64) PRIMARY KEY COMMENT '人群ID',
    tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
    name VARCHAR(255) NOT NULL COMMENT '人群名称',
    description TEXT COMMENT '人群描述',
    
    -- 战略属性
    level TINYINT NOT NULL COMMENT '战略优先级 1/2/3',
    category VARCHAR(64) COMMENT '人群分类',
    
    -- 定义
    definition_dsl JSON NOT NULL COMMENT 'DSL定义',
    definition_nl TEXT COMMENT '自然语言描述',
    definition_query JSON COMMENT '查询配置',
    tag_conditions JSON COMMENT '标签条件',
    
    -- 数据源
    connector_id VARCHAR(64) COMMENT '连接器ID',
    connector_config JSON COMMENT '连接器配置',
    refresh_type VARCHAR(32) DEFAULT 'daily' COMMENT '刷新类型',
    last_refresh_at TIMESTAMP NULL COMMENT '上次刷新',
    next_refresh_at TIMESTAMP NULL COMMENT '下次刷新',
    
    -- 画像与诊断
    portrait JSON COMMENT '人群画像',
    health_score INT COMMENT '健康度评分',
    health_trends JSON COMMENT '健康趋势',
    ai_diagnosis JSON COMMENT 'AI诊断',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant_level (tenant_id, level),
    INDEX idx_tenant_category (tenant_id, category),
    INDEX idx_refresh (next_refresh_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='战略人群表';

CREATE TABLE segment_packages (
    id VARCHAR(64) PRIMARY KEY COMMENT '人群包ID',
    segment_id VARCHAR(64) NOT NULL COMMENT '人群ID',
    version INT NOT NULL COMMENT '版本',
    
    size INT NOT NULL COMMENT '规模',
    sample_size INT COMMENT '抽样大小',
    
    storage_type VARCHAR(32) COMMENT '存储类型',
    storage_location VARCHAR(512) COMMENT '存储位置',
    storage_format VARCHAR(32) COMMENT '存储格式',
    storage_size BIGINT COMMENT '文件大小',
    checksum VARCHAR(64) COMMENT '校验和',
    
    generated_at TIMESTAMP NOT NULL COMMENT '生成时间',
    expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
    
    statistics JSON COMMENT '统计信息',
    usage_history JSON COMMENT '使用记录',
    
    INDEX idx_segment (segment_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='人群包表';

-- =============================================
-- Agent记忆表
-- =============================================

CREATE TABLE agent_memories (
    id VARCHAR(64) PRIMARY KEY COMMENT '记忆ID',
    agent_id VARCHAR(64) NOT NULL COMMENT 'AgentID',
    user_id VARCHAR(64) COMMENT '用户ID',
    session_id VARCHAR(64) COMMENT '会话ID',
    
    type VARCHAR(32) NOT NULL COMMENT '记忆类型',
    content_text TEXT NOT NULL COMMENT '文本内容',
    content_structured JSON COMMENT '结构化内容',
    
    context JSON COMMENT '上下文',
    
    importance DECIMAL(3,2) COMMENT '重要程度',
    confidence DECIMAL(3,2) COMMENT '置信度',
    source VARCHAR(128) COMMENT '来源',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL COMMENT '过期时间',
    
    INDEX idx_agent_user (agent_id, user_id),
    INDEX idx_agent_session (agent_id, session_id),
    INDEX idx_type (type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Agent记忆表';

CREATE TABLE user_profiles (
    user_id VARCHAR(64) PRIMARY KEY COMMENT '用户ID',
    tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
    
    preferences JSON COMMENT '偏好',
    expertise JSON COMMENT '专业能力',
    communication_style JSON COMMENT '交互风格',
    favorite_templates JSON COMMENT '常用模板',
    strategy_history JSON COMMENT '策略历史',
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT DEFAULT 1 COMMENT '版本',
    
    INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户画像表';

-- =============================================
-- 连接器表
-- =============================================

CREATE TABLE connectors (
    id VARCHAR(64) PRIMARY KEY COMMENT '连接器ID',
    tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
    name VARCHAR(255) NOT NULL COMMENT '名称',
    type VARCHAR(32) NOT NULL COMMENT '类型',
    category VARCHAR(64) COMMENT '分类',
    
    implementation JSON COMMENT '实现信息',
    config JSON COMMENT '配置',
    capabilities JSON COMMENT '能力声明',
    
    status VARCHAR(32) DEFAULT 'draft' COMMENT '状态',
    health JSON COMMENT '健康状态',
    statistics JSON COMMENT '使用统计',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant_type (tenant_id, type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='连接器表';

-- =============================================
-- 执行相关表
-- =============================================

CREATE TABLE strategy_executions (
    id VARCHAR(64) PRIMARY KEY COMMENT '执行ID',
    strategy_id VARCHAR(64) NOT NULL COMMENT '策略ID',
    execution_no VARCHAR(64) COMMENT '执行批次号',
    
    status VARCHAR(32) NOT NULL COMMENT '状态',
    
    segment_size INT COMMENT '人群规模',
    segment_package_id VARCHAR(64) COMMENT '使用的人群包ID',
    
    schedule_time TIMESTAMP COMMENT '计划执行时间',
    actual_start_time TIMESTAMP COMMENT '实际开始时间',
    actual_end_time TIMESTAMP COMMENT '实际结束时间',
    
    channel_results JSON COMMENT '各渠道执行结果',
    error_msg TEXT COMMENT '错误信息',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_strategy (strategy_id),
    INDEX idx_status (status),
    INDEX idx_schedule (schedule_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='策略执行表';

CREATE TABLE ab_tests (
    id VARCHAR(64) PRIMARY KEY COMMENT '实验ID',
    strategy_id VARCHAR(64) NOT NULL COMMENT '策略ID',
    execution_id VARCHAR(64) COMMENT '执行ID',
    
    config JSON COMMENT '实验配置',
    status VARCHAR(32) DEFAULT 'pending' COMMENT '状态',
    
    results JSON COMMENT '实验结果',
    winner_variant VARCHAR(32) COMMENT '胜出版本',
    
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_strategy (strategy_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AB实验表';
```

### 4.2 ClickHouse表结构

```sql
-- =============================================
-- 事件表 (实时写入)
-- =============================================

CREATE TABLE strategy_events (
    event_id String,
    event_type String,
    
    event_time DateTime64(3),
    processed_time DateTime64(3),
    
    tenant_id String,
    strategy_id String,
    execution_id String,
    user_id String,
    
    payload String,  -- JSON
    
    context_channel String,
    context_variant String,
    context_device_type String,
    context_app_version String,
    
    attribution_touchpoint_index Int32,
    attribution_is_conversion Boolean,
    attribution_conversion_value Decimal64(4),
    
    metadata_source String,
    metadata_sdk_version String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (tenant_id, strategy_id, event_time)
TTL event_time + INTERVAL 90 DAY;

-- =============================================
-- 实时指标聚合 (物化视图)
-- =============================================

CREATE MATERIALIZED VIEW strategy_metrics_realtime
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (tenant_id, strategy_id, execution_id, context_channel, event_date, event_hour)
AS SELECT
    toDate(event_time) as event_date,
    toHour(event_time) as event_hour,
    tenant_id,
    strategy_id,
    execution_id,
    context_channel,
    context_variant,
    
    countIf(event_type = 'touchpoint.sent') as sends,
    countIf(event_type = 'touchpoint.delivered') as deliveries,
    countIf(event_type = 'touchpoint.displayed') as displays,
    countIf(event_type = 'touchpoint.clicked') as clicks,
    countIf(event_type = 'conversion.completed') as conversions,
    
    sumIf(attribution_conversion_value, event_type = 'conversion.completed') as gmv,
    
    uniqExact(user_id) as unique_users
FROM strategy_events
GROUP BY 
    event_date, event_hour, tenant_id, strategy_id, 
    execution_id, context_channel, context_variant;

-- =============================================
-- 用户行为序列 (用于AI分析)
-- =============================================

CREATE TABLE user_behavior_sequences (
    tenant_id String,
    user_id String,
    date Date,
    
    strategy_exposures Array(String),  -- 策略曝光列表
    touchpoint_clicks Array(String),   -- 点击列表
    conversions Array(String),         -- 转化列表
    
    session_count Int32,
    total_session_duration Int32,
    
    -- 特征向量 (用于ML)
    feature_vector Array(Float64)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, user_id, date);
```

### 4.3 向量数据库设计

```typescript
// Pinecone/Milvus Collection设计

/**
 * Agent记忆向量集合
 */
const agentMemoryCollection = {
  name: 'agent_memories',
  dimension: 1536,              // OpenAI embedding维度
  metric: 'cosine',
  
  fields: [
    { name: 'id', type: 'string' },
    { name: 'agent_id', type: 'string' },
    { name: 'user_id', type: 'string' },
    { name: 'type', type: 'string' },
    { name: 'content', type: 'string' },
    { name: 'importance', type: 'float' },
    { name: 'created_at', type: 'timestamp' }
  ],
  
  indexes: [
    { field: 'agent_id', type: 'filter' },
    { field: 'user_id', type: 'filter' },
    { field: 'type', type: 'filter' },
    { field: 'created_at', type: 'range' }
  ]
};

/**
 * 策略知识向量集合
 */
const strategyKnowledgeCollection = {
  name: 'strategy_knowledge',
  dimension: 1536,
  metric: 'cosine',
  
  fields: [
    { name: 'id', type: 'string' },
    { name: 'type', type: 'string' },  // 'best_practice', 'case_study', 'template'
    { name: 'title', type: 'string' },
    { name: 'content', type: 'string' },
    { name: 'category', type: 'string' },
    { name: 'tags', type: 'string[]' },
    { name: 'effectiveness_score', type: 'float' },
    { name: 'usage_count', type: 'int' }
  ],
  
  indexes: [
    { field: 'type', type: 'filter' },
    { field: 'category', type: 'filter' },
    { field: 'tags', type: 'filter' },
    { field: 'effectiveness_score', type: 'range' }
  ]
};

/**
 * 用户画像向量集合
 */
const userProfileCollection = {
  name: 'user_profiles',
  dimension: 1536,
  metric: 'cosine',
  
  fields: [
    { name: 'user_id', type: 'string' },
    { name: 'tenant_id', type: 'string' },
    { name: 'profile_summary', type: 'string' },
    { name: 'expertise_areas', type: 'string[]' },
    { name: 'preferred_categories', type: 'string[]' },
    { name: 'communication_style', type: 'string' },
    { name: 'updated_at', type: 'timestamp' }
  ],
  
  indexes: [
    { field: 'tenant_id', type: 'filter' },
    { field: 'expertise_areas', type: 'filter' },
    { field: 'updated_at', type: 'range' }
  ]
};
```

---

## 五、数据流设计

### 5.1 实时数据流

```
用户行为事件 → Kafka → Flink处理 → ClickHouse存储
                      ↓
                实时特征计算 → Redis缓存
                      ↓
                异常检测 → 告警通知
                      ↓
                AI Agent消费 → 实时决策
```

### 5.2 离线数据流

```
业务数据库(MySQL) → CDC → 数据仓库 → ETL → 特征工程
                                          ↓
                                    模型训练(调度)
                                          ↓
                                    模型服务部署
```

### 5.3 AI数据流

```
用户查询 → 向量化 → 向量检索 → RAG增强 → LLM生成
              ↓
         知识库更新 ← 策略效果反馈
```

---

## 六、数据治理

### 6.1 数据质量

| 维度 | 措施 |
|-----|------|
| 完整性 | 非空检查、默认值填充 |
| 准确性 | 数据校验规则、异常检测 |
| 一致性 | 分布式事务、最终一致性 |
| 时效性 | TTL管理、增量更新 |
| 安全性 | 加密存储、脱敏展示 |

### 6.2 数据安全

```typescript
// 数据脱敏规则
const dataMaskingRules = {
  'user_id': { type: 'hash', algorithm: 'sha256' },
  'phone': { type: 'mask', pattern: '*** **** {last4}' },
  'email': { type: 'mask', pattern: '{first}***@{domain}' },
  'id_card': { type: 'mask', pattern: '**************{last4}' },
  'location': { type: 'fuzz', precision: 'city' }
};

// 字段级加密
interface EncryptedField {
  value: string;           // 加密后的值
  algorithm: 'AES-256-GCM';
  keyVersion: string;      // 密钥版本
  encryptedAt: Date;
}
```

### 6.3 数据生命周期

| 数据类型 | 热存储 | 温存储 | 冷存储 | 销毁 |
|---------|-------|-------|-------|------|
| 策略配置 | 永久 | - | - | - |
| 执行记录 | 90天 | 1年 | 3年 | ✓ |
| 事件数据 | 30天 | 90天 | 1年 | ✓ |
| AI记忆 | 永久 | - | - | ✓(用户要求) |
| 向量数据 | 90天 | - | - | ✓ |

---

## 七、扩展设计

### 7.1 多租户设计

```sql
-- 租户隔离策略
-- 1. 表级隔离：表名包含tenant_id (不推荐)
-- 2. 行级隔离：所有表都有tenant_id字段 (推荐)
-- 3. 数据库级隔离：每个租户独立数据库 (大客户)

-- 行级隔离实现
CREATE TABLE strategies (
    id VARCHAR(64),
    tenant_id VARCHAR(64) NOT NULL,
    -- ...
    PRIMARY KEY (tenant_id, id)  -- 复合主键
) ENGINE=InnoDB;

-- 查询时自动过滤
-- 使用MySQL Proxy或应用层实现租户隔离
```

### 7.2 分库分表

```sql
-- 策略表按租户分表
-- strategies_001, strategies_002, ...

-- 事件表按时间分区 (ClickHouse自动处理)

-- 用户画像按租户分片
-- 使用一致性哈希
```

---

## 八、性能优化

### 8.1 读写分离

```
写操作 → MySQL Master
读操作 → MySQL Slave / Redis / ES
```

### 8.2 缓存策略

| 数据 | 缓存层 | TTL | 更新策略 |
|-----|-------|-----|---------|
| 策略配置 | Redis | 1小时 | 主动失效 |
| 人群规模 | Redis | 5分钟 | 定时刷新 |
| 连接器配置 | Local Cache | 永久 | 推送更新 |
| AI记忆 | Redis + VectorDB | 按需 | 实时更新 |

### 8.3 索引优化

```sql
-- 常用查询索引
CREATE INDEX idx_strategies_tenant_status ON strategies(tenant_id, status);
CREATE INDEX idx_strategies_ai_generated ON strategies(ai_generated, created_at);
CREATE INDEX idx_segments_tenant_level ON strategic_segments(tenant_id, level);
CREATE INDEX idx_events_time ON strategy_events(tenant_id, strategy_id, event_time);

-- 全文索引 (用于AI记忆检索)
CREATE FULLTEXT INDEX idx_memory_content ON agent_memories(content_text);
```
