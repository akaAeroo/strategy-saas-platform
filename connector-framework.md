# 连接器框架与API扩展设计

## 一、连接器框架概述

### 1.1 设计理念

连接器框架是智能策略平台与外部系统（数据、触达、营销等）的桥梁，提供**即插即用**的集成能力。

```
┌─────────────────────────────────────────────────────────────────┐
│                      连接器核心理念                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔌 即插即用 (Plug & Play)                                       │
│     • 标准化接口，快速接入新系统                                  │
│     • 配置化连接，无需代码开发                                    │
│     • 热插拔支持，动态启用/停用                                   │
│                                                                  │
│  🧩 统一抽象 (Unified Abstraction)                               │
│     • 不同系统，统一调用方式                                      │
│     • 数据格式自动转换                                            │
│     • 错误处理标准化                                              │
│                                                                  │
│  🔒 安全可靠 (Security & Reliability)                            │
│     • 连接加密，认证隔离                                          │
│     • 限流熔断，故障隔离                                          │
│     • 审计日志，全链路追踪                                        │
│                                                                  │
│  📊 可观测 (Observability)                                       │
│     • 连接状态实时监控                                            │
│     • 调用指标自动采集                                            │
│     • 异常告警及时通知                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 连接器类型

```
┌─────────────────────────────────────────────────────────────────┐
│                      连接器类型体系                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 数据源连接器 (Data Source Connectors)                        │
│     • 人群标签API                                                │
│     • 用户画像API                                                │
│     • 行为数据API                                                │
│     • 交易数据API                                                │
│                                                                  │
│  📱 触达渠道连接器 (Channel Connectors)                          │
│     • Push推送连接器                                             │
│     • 短信(SMS)连接器                                            │
│     • 微信生态连接器                                             │
│     • 邮件(Email)连接器                                          │
│     • App弹窗连接器                                              │
│                                                                  │
│  🎁 营销能力连接器 (Marketing Connectors)                        │
│     • 优惠券系统连接器                                           │
│     • 积分系统连接器                                             │
│     • 会员系统连接器                                             │
│     • 红包/抽奖连接器                                            │
│                                                                  │
│  🛒 业务系统连接器 (Business Connectors)                         │
│     • 商品中心连接器                                             │
│     • 订单系统连接器                                             │
│     • 库存系统连接器                                             │
│     • 支付系统连接器                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、连接器架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        业务服务层                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ 策略服务   │  │ 执行服务   │  │ 诊断服务   │  │ 效果服务   │   │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘   │
│         │               │               │               │         │
└─────────┼───────────────┼───────────────┼───────────────┼─────────┘
          │               │               │               │
          └───────────────┴───────┬───────┴───────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     连接器网关层 (Connector Gateway)                   │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    统一API调用接口                             │ │
│  │                                                                │ │
│  │   call(connectorId, operation, params) → Promise<Result>      │ │
│  │                                                                │ │
│  │   功能：                                                       │ │
│  │   • 连接器路由                                                 │ │
│  │   • 认证鉴权                                                   │ │
│  │   • 限流熔断                                                   │ │
│  │   • 日志追踪                                                   │ │
│  │   • 数据转换                                                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     连接器运行时 (Connector Runtime)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ 连接器管理器  │  │ 配置中心     │  │ 连接器市场               │ │
│  │              │  │              │  │                          │ │
│  │ • 生命周期   │  │ • 连接配置   │  │ • 官方连接器             │ │
│  │ • 健康检查   │  │ • 认证管理   │  │ • 社区连接器             │ │
│  │ • 版本管理   │  │ • 参数映射   │  │ • 自定义连接器           │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     具体连接器实例                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │人群API   │ │Push API  │ │SMS API   │ │营销API   │ │商品API   │ │
│  │Connector │ │Connector │ │Connector │ │Connector │ │Connector │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心接口定义

```typescript
// ============================================================================
// 连接器核心接口
// ============================================================================

/**
 * 连接器接口 - 所有连接器的基类
 */
interface IConnector {
  // 元数据
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: ConnectorType;
  readonly capabilities: Capability[];
  
  // 生命周期
  initialize(config: ConnectorConfig): Promise<void>;
  connect(): Promise<ConnectionStatus>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  
  // 操作执行
  execute(operation: string, params: any): Promise<OperationResult>;
  query(query: Query): Promise<QueryResult>;
  
  // 元数据
  getSchema(): Promise<DataSchema>;
  getOperations(): OperationDefinition[];
}

/**
 * 连接器配置
 */
interface ConnectorConfig {
  id: string;
  name: string;
  type: ConnectorType;
  
  // 连接信息
  endpoint: {
    baseUrl: string;
    timeout?: number;
    retryPolicy?: RetryPolicy;
  };
  
  // 认证配置
  authentication: {
    type: 'apikey' | 'oauth2' | 'basic' | 'jwt';
    config: AuthConfig;
  };
  
  // 限流配置
  rateLimit?: {
    requestsPerSecond: number;
    burstSize: number;
  };
  
  // 自定义参数
  customParams?: Record<string, any>;
  
  // 数据映射规则
  mappings?: DataMapping[];
}

/**
 * 数据源连接器 - 用于查询数据
 */
interface IDataSourceConnector extends IConnector {
  type: 'datasource';
  
  // 数据查询
  query(params: QueryParams): Promise<DataSet>;
  
  // 实时数据流
  subscribe(filter: Filter): EventStream;
  
  // 数据预览
  preview(query: Query, limit: number): Promise<DataSample>;
}

/**
 * 触达渠道连接器 - 用于触达用户
 */
interface IChannelConnector extends IConnector {
  type: 'channel';
  
  // 发送消息
  send(recipients: string[], message: Message): Promise<SendResult>;
  
  // 批量发送
  sendBatch(batch: BatchMessage): Promise<BatchSendResult>;
  
  // 查询发送状态
  queryStatus(batchId: string): Promise<DeliveryStatus[]>;
  
  // 模板管理
  getTemplates(): Promise<MessageTemplate[]>;
  validateTemplate(template: MessageTemplate): Promise<ValidationResult>;
}

/**
 * 营销能力连接器 - 用于发放权益
 */
interface IMarketingConnector extends IConnector {
  type: 'marketing';
  
  // 权益发放
  grantBenefit(users: string[], benefit: Benefit): Promise<GrantResult>;
  
  // 权益查询
  queryBenefitStatus(grantId: string): Promise<BenefitStatus>;
  
  // 库存查询
  checkInventory(benefitType: string, benefitId: string): Promise<Inventory>;
  
  // 权益模板
  getBenefitTemplates(): Promise<BenefitTemplate[]>;
}
```

---

## 三、连接器实现

### 3.1 人群API连接器

```typescript
/**
 * 人群API连接器实现
 */
class AudienceConnector implements IDataSourceConnector {
  readonly id = 'audience_api';
  readonly name = '人群数据API';
  readonly version = '1.0.0';
  readonly type = 'datasource' as const;
  readonly capabilities = [
    'segment_query',
    'tag_query',
    'portrait_query',
    'realtime_segment'
  ];
  
  private config!: ConnectorConfig;
  private httpClient!: AxiosInstance;
  private connectionStatus: ConnectionStatus = 'disconnected';
  
  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
    
    // 创建HTTP客户端
    this.httpClient = axios.create({
      baseURL: config.endpoint.baseUrl,
      timeout: config.endpoint.timeout || 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // 设置认证拦截器
    this.setupAuthentication();
    
    // 设置重试逻辑
    this.setupRetryPolicy();
    
    // 设置限流
    if (config.rateLimit) {
      this.setupRateLimit(config.rateLimit);
    }
  }
  
  private setupAuthentication(): void {
    const { type, config: authConfig } = this.config.authentication;
    
    this.httpClient.interceptors.request.use(async (config) => {
      switch (type) {
        case 'apikey':
          config.headers['X-API-Key'] = authConfig.apiKey;
          break;
          
        case 'oauth2':
          const token = await this.getOAuthToken(authConfig);
          config.headers['Authorization'] = `Bearer ${token}`;
          break;
          
        case 'jwt':
          const jwt = this.generateJWT(authConfig);
          config.headers['Authorization'] = `Bearer ${jwt}`;
          break;
          
        case 'basic':
          const base64 = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
          config.headers['Authorization'] = `Basic ${base64}`;
          break;
      }
      return config;
    });
  }
  
  async connect(): Promise<ConnectionStatus> {
    try {
      // 测试连接
      await this.httpClient.get('/health');
      this.connectionStatus = 'connected';
      return this.connectionStatus;
    } catch (error) {
      this.connectionStatus = 'error';
      throw new ConnectionError('Failed to connect to Audience API', error);
    }
  }
  
  async disconnect(): Promise<void> {
    this.connectionStatus = 'disconnected';
  }
  
  async healthCheck(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      await this.httpClient.get('/health');
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        latency,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
  
  // ============================================================================
  // 核心数据操作
  // ============================================================================
  
  /**
   * 圈选人群
   */
  async segment(conditions: TagCondition[]): Promise<SegmentResult> {
    const response = await this.httpClient.post('/v1/segments', {
      conditions: this.transformConditions(conditions),
      options: {
        estimateOnly: false,
        includeUsers: false
      }
    });
    
    return {
      segmentId: response.data.segment_id,
      estimatedSize: response.data.estimated_size,
      status: response.data.status,
      createdAt: response.data.created_at
    };
  }
  
  /**
   * 预估人群规模
   */
  async estimateSize(conditions: TagCondition[]): Promise<SizeEstimate> {
    const response = await this.httpClient.post('/v1/segments/estimate', {
      conditions: this.transformConditions(conditions)
    });
    
    return {
      estimatedSize: response.data.estimated_size,
      confidence: response.data.confidence,
      computationTime: response.data.computation_time
    };
  }
  
  /**
   * 查询人群数据
   */
  async query(params: AudienceQueryParams): Promise<AudienceDataSet> {
    const response = await this.httpClient.post('/v1/query', {
      segment_id: params.segmentId,
      fields: params.fields,
      filters: params.filters,
      aggregations: params.aggregations,
      limit: params.limit,
      offset: params.offset
    });
    
    // 应用数据映射转换
    const transformedData = this.applyMappings(response.data.results);
    
    return {
      data: transformedData,
      total: response.data.total,
      schema: await this.getSchema()
    };
  }
  
  /**
   * 获取用户画像
   */
  async getPortrait(userId: string): Promise<UserPortrait> {
    const response = await this.httpClient.get(`/v1/users/${userId}/portrait`);
    return this.transformPortrait(response.data);
  }
  
  /**
   * 下载人群包
   */
  async downloadSegment(segmentId: string): Promise<ReadableStream> {
    const response = await this.httpClient.get(`/v1/segments/${segmentId}/download`, {
      responseType: 'stream'
    });
    return response.data;
  }
  
  // ============================================================================
  // 辅助方法
  // ============================================================================
  
  private transformConditions(conditions: TagCondition[]): any[] {
    // 将内部条件格式转换为API格式
    return conditions.map(cond => ({
      field: cond.field,
      operator: this.mapOperator(cond.operator),
      value: cond.value
    }));
  }
  
  private mapOperator(op: string): string {
    const mapping: Record<string, string> = {
      'eq': 'EQUALS',
      'ne': 'NOT_EQUALS',
      'gt': 'GREATER_THAN',
      'gte': 'GREATER_THAN_OR_EQUAL',
      'lt': 'LESS_THAN',
      'lte': 'LESS_THAN_OR_EQUAL',
      'in': 'IN',
      'between': 'BETWEEN',
      'contains': 'CONTAINS'
    };
    return mapping[op] || op;
  }
  
  private applyMappings(data: any[]): any[] {
    if (!this.config.mappings) return data;
    
    return data.map(item => {
      const mapped: any = {};
      for (const [key, value] of Object.entries(item)) {
        const mapping = this.config.mappings!.find(m => m.source === key);
        mapped[mapping?.target || key] = value;
      }
      return mapped;
    });
  }
  
  async getSchema(): Promise<DataSchema> {
    // 缓存schema，避免重复获取
    return {
      fields: [
        { name: 'user_id', type: 'string', primaryKey: true },
        { name: 'tags', type: 'array', items: { type: 'string' } },
        { name: 'value_score', type: 'number', description: '用户价值分' },
        { name: 'rfm_score', type: 'string', description: 'RFM等级' },
        { name: 'last_active_time', type: 'datetime' },
        { name: 'registration_date', type: 'date' },
        { name: 'total_orders', type: 'integer' },
        { name: 'total_gmv', type: 'number' }
      ]
    };
  }
  
  async execute(operation: string, params: any): Promise<OperationResult> {
    const operations: Record<string, Function> = {
      'segment': () => this.segment(params.conditions),
      'estimate': () => this.estimateSize(params.conditions),
      'query': () => this.query(params),
      'portrait': () => this.getPortrait(params.userId),
      'download': () => this.downloadSegment(params.segmentId)
    };
    
    const handler = operations[operation];
    if (!handler) {
      throw new Error(`Unknown operation: ${operation}`);
    }
    
    return { success: true, data: await handler() };
  }
  
  private setupRetryPolicy(): void {
    const { retries = 3 } = this.config.endpoint.retryPolicy || {};
    
    this.httpClient.interceptors.response.use(
      response => response,
      async error => {
        const { config } = error;
        
        if (!config || !config.retry) {
          config.retry = 0;
        }
        
        if (config.retry < retries && this.isRetryableError(error)) {
          config.retry++;
          const delay = Math.pow(2, config.retry) * 1000;
          await sleep(delay);
          return this.httpClient(config);
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  private isRetryableError(error: any): boolean {
    // 可重试的错误：网络错误、5xx错误、限流错误
    return !error.response || 
           error.response.status >= 500 || 
           error.response.status === 429;
  }
  
  private setupRateLimit(config: RateLimitConfig): void {
    // 使用令牌桶算法实现客户端限流
    const limiter = new RateLimiter({
      tokensPerInterval: config.requestsPerSecond,
      interval: 'second',
      fireImmediately: false
    });
    
    this.httpClient.interceptors.request.use(async (config) => {
      await limiter.removeTokens(1);
      return config;
    });
  }
}
```

### 3.2 Push推送连接器

```typescript
/**
 * Push推送连接器
 */
class PushConnector implements IChannelConnector {
  readonly id = 'push_channel';
  readonly name = 'Push消息推送';
  readonly version = '1.0.0';
  readonly type = 'channel' as const;
  readonly capabilities = [
    'push_send',
    'push_template',
    'push_schedule',
    'push_personalization'
  ];
  
  private config!: ConnectorConfig;
  private httpClient!: AxiosInstance;
  
  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
    
    this.httpClient = axios.create({
      baseURL: config.endpoint.baseUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    this.setupAuthentication();
  }
  
  async connect(): Promise<ConnectionStatus> {
    await this.httpClient.get('/health');
    return 'connected';
  }
  
  async disconnect(): Promise<void> {
    // 清理连接
  }
  
  async healthCheck(): Promise<HealthStatus> {
    // 实现健康检查
    return { status: 'healthy', timestamp: new Date() };
  }
  
  /**
   * 发送Push消息
   */
  async send(recipients: string[], message: PushMessage): Promise<SendResult> {
    // 分批处理（每批不超过5000）
    const batchSize = 5000;
    const batches = chunk(recipients, batchSize);
    
    const results: BatchResult[] = [];
    
    for (const batch of batches) {
      const response = await this.httpClient.post('/v1/push/send', {
        audience: {
          type: 'user_ids',
          values: batch
        },
        message: {
          title: message.title,
          body: message.body,
          deeplink: message.deeplink,
          custom_data: message.customData,
          notification_options: {
            sound: message.sound ?? 'default',
            badge: message.badge,
            category: message.category
          }
        },
        options: {
          priority: message.priority ?? 'high',
          time_to_live: message.ttl ?? 86400
        }
      });
      
      results.push({
        batchId: response.data.batch_id,
        acceptedCount: response.data.accepted_count,
        rejectedCount: response.data.rejected_count
      });
    }
    
    return {
      batchId: results[0].batchId,
      totalAccepted: sum(results.map(r => r.acceptedCount)),
      totalRejected: sum(results.map(r => r.rejectedCount)),
      batches: results.length
    };
  }
  
  /**
   * 批量发送
   */
  async sendBatch(batch: BatchPushMessage): Promise<BatchSendResult> {
    // 支持个性化批量发送
    const response = await this.httpClient.post('/v1/push/send_batch', {
      messages: batch.messages.map(msg => ({
        user_id: msg.userId,
        title: msg.title,
        body: msg.body,
        deeplink: msg.deeplink,
        custom_data: msg.customData
      }))
    });
    
    return {
      batchId: response.data.batch_id,
      totalCount: batch.messages.length,
      acceptedCount: response.data.accepted_count,
      estimatedDelivery: response.data.estimated_delivery_time
    };
  }
  
  /**
   * 查询发送状态
   */
  async queryStatus(batchId: string): Promise<DeliveryStatus[]> {
    const response = await this.httpClient.get(`/v1/push/batches/${batchId}/status`);
    
    return response.data.statuses.map((s: any) => ({
      userId: s.user_id,
      status: s.status,  // 'sent', 'delivered', 'opened', 'failed'
      timestamp: s.timestamp,
      errorCode: s.error_code,
      errorMessage: s.error_message
    }));
  }
  
  /**
   * 获取消息模板
   */
  async getTemplates(): Promise<MessageTemplate[]> {
    const response = await this.httpClient.get('/v1/push/templates');
    
    return response.data.templates.map((t: any) => ({
      id: t.id,
      name: t.name,
      title: t.title_template,
      body: t.body_template,
      variables: t.variables,
      category: t.category
    }));
  }
  
  async validateTemplate(template: MessageTemplate): Promise<ValidationResult> {
    const response = await this.httpClient.post('/v1/push/templates/validate', {
      title: template.title,
      body: template.body,
      variables: template.variables
    });
    
    return {
      valid: response.data.valid,
      errors: response.data.errors,
      warnings: response.data.warnings
    };
  }
  
  async execute(operation: string, params: any): Promise<OperationResult> {
    const operations: Record<string, Function> = {
      'send': () => this.send(params.recipients, params.message),
      'sendBatch': () => this.sendBatch(params.batch),
      'queryStatus': () => this.queryStatus(params.batchId),
      'getTemplates': () => this.getTemplates()
    };
    
    const handler = operations[operation];
    if (!handler) {
      throw new Error(`Unknown operation: ${operation}`);
    }
    
    return { success: true, data: await handler() };
  }
  
  async getSchema(): Promise<DataSchema> {
    return {
      fields: [
        { name: 'user_id', type: 'string' },
        { name: 'device_token', type: 'string' },
        { name: 'platform', type: 'string', enum: ['ios', 'android'] },
        { name: 'app_version', type: 'string' },
        { name: 'last_active', type: 'datetime' }
      ]
    };
  }
}
```

### 3.3 营销权益连接器

```typescript
/**
 * 营销权益连接器
 */
class MarketingConnector implements IMarketingConnector {
  readonly id = 'marketing_api';
  readonly name = '营销权益系统';
  readonly version = '1.0.0';
  readonly type = 'marketing' as const;
  readonly capabilities = [
    'coupon_grant',
    'points_grant',
    'vip_grant',
    'inventory_query'
  ];
  
  private config!: ConnectorConfig;
  private httpClient!: AxiosInstance;
  
  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
    
    this.httpClient = axios.create({
      baseURL: config.endpoint.baseUrl,
      timeout: 15000
    });
    
    this.setupAuthentication();
  }
  
  async connect(): Promise<ConnectionStatus> {
    await this.httpClient.get('/health');
    return 'connected';
  }
  
  async disconnect(): Promise<void> {}
  
  async healthCheck(): Promise<HealthStatus> {
    return { status: 'healthy', timestamp: new Date() };
  }
  
  /**
   * 发放权益
   */
  async grantBenefit(users: string[], benefit: Benefit): Promise<GrantResult> {
    const response = await this.httpClient.post('/v1/benefits/grant', {
      user_ids: users,
      benefit_type: benefit.type,  // 'coupon', 'points', 'vip'
      benefit_config: {
        template_id: benefit.templateId,
        value: benefit.value,
        validity_days: benefit.validityDays,
        minimum_order: benefit.minimumOrder,
        applicable_scope: benefit.scope
      },
      grant_options: {
        send_notification: benefit.sendNotification ?? true,
        notification_channel: benefit.notificationChannel ?? 'push'
      }
    });
    
    return {
      grantId: response.data.grant_id,
      successCount: response.data.success_count,
      failCount: response.data.fail_count,
      failedUsers: response.data.failed_users,
      estimatedArrival: response.data.estimated_arrival_time
    };
  }
  
  /**
   * 查询发放状态
   */
  async queryBenefitStatus(grantId: string): Promise<BenefitStatus> {
    const response = await this.httpClient.get(`/v1/benefits/grants/${grantId}/status`);
    
    return {
      grantId,
      status: response.data.status,  // 'processing', 'completed', 'partial', 'failed'
      totalCount: response.data.total_count,
      successCount: response.data.success_count,
      details: response.data.details.map((d: any) => ({
        userId: d.user_id,
        status: d.status,
        benefitCode: d.benefit_code,
        grantedAt: d.granted_at
      }))
    };
  }
  
  /**
   * 检查库存
   */
  async checkInventory(benefitType: string, benefitId: string): Promise<Inventory> {
    const response = await this.httpClient.get('/v1/benefits/inventory', {
      params: { benefit_type: benefitType, benefit_id: benefitId }
    });
    
    return {
      total: response.data.total,
      available: response.data.available,
      reserved: response.data.reserved,
      dailyLimit: response.data.daily_limit,
      dailyUsed: response.data.daily_used
    };
  }
  
  /**
   * 预占库存
   */
  async reserveInventory(benefitType: string, benefitId: string, count: number): Promise<Reservation> {
    const response = await this.httpClient.post('/v1/benefits/inventory/reserve', {
      benefit_type: benefitType,
      benefit_id: benefitId,
      count,
      expire_seconds: 3600  // 1小时后释放
    });
    
    return {
      reservationId: response.data.reservation_id,
      reservedCount: response.data.reserved_count,
      expireAt: response.data.expire_at
    };
  }
  
  /**
   * 获取权益模板
   */
  async getBenefitTemplates(): Promise<BenefitTemplate[]> {
    const response = await this.httpClient.get('/v1/benefits/templates');
    
    return response.data.templates.map((t: any) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      config: t.config,
      inventory: t.inventory,
      constraints: t.constraints
    }));
  }
  
  async execute(operation: string, params: any): Promise<OperationResult> {
    const operations: Record<string, Function> = {
      'grantBenefit': () => this.grantBenefit(params.users, params.benefit),
      'queryStatus': () => this.queryBenefitStatus(params.grantId),
      'checkInventory': () => this.checkInventory(params.benefitType, params.benefitId),
      'reserveInventory': () => this.reserveInventory(params.benefitType, params.benefitId, params.count),
      'getTemplates': () => this.getBenefitTemplates()
    };
    
    const handler = operations[operation];
    if (!handler) {
      throw new Error(`Unknown operation: ${operation}`);
    }
    
    return { success: true, data: await handler() };
  }
  
  async getSchema(): Promise<DataSchema> {
    return {
      fields: [
        { name: 'benefit_id', type: 'string' },
        { name: 'benefit_type', type: 'string', enum: ['coupon', 'points', 'vip'] },
        { name: 'user_id', type: 'string' },
        { name: 'status', type: 'string', enum: ['active', 'used', 'expired'] },
        { name: 'granted_at', type: 'datetime' },
        { name: 'expired_at', type: 'datetime' },
        { name: 'used_at', type: 'datetime' }
      ]
    };
  }
}
```

---

## 四、连接器市场

### 4.1 连接器市场设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                      连接器市场 (Connector Marketplace)               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  🔍 搜索连接器...                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  分类筛选: [全部] [数据源] [触达渠道] [营销能力] [业务系统]          │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 官方连接器                    [查看全部 >]                    │   │
│  │                                                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │
│  │  │ 👤       │ │ 📱       │ │ 🎁       │ │ 🛒       │        │   │
│  │  │ 人群API  │ │ Push     │ │ 优惠券   │ │ 商品     │        │   │
│  │  │ 已安装 ✓ │ │ 已安装 ✓ │ │ 已安装 ✓ │ │ 未安装   │        │   │
│  │  │ [配置]   │ │ [配置]   │ │ [配置]   │ │ [安装]   │        │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 社区连接器                    [提交连接器 >]                   │   │
│  │                                                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                      │   │
│  │  │ 📧       │ │ 💬       │ │ 📊       │                      │   │
│  │  │ Email    │ │ 企业微信 │ │ 友盟统计 │                      │   │
│  │  │ 安装: 1k │ │ 安装: 856│ │ 安装: 523│                      │   │
│  │  │ [安装]   │ │ [安装]   │ │ [安装]   │                      │   │
│  │  └──────────┘ └──────────┘ └──────────┘                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 自定义连接器                                                 │   │
│  │                                                              │   │
│  │  [+ 新建连接器]  -  通过OpenAPI规范快速接入你的系统           │   │
│  │                                                              │   │
│  │  我的连接器:                                                 │   │
│  │  • 内部CRM系统 (已启用)  [编辑] [查看日志]                   │   │
│  │  • 自有短信平台 (开发中) [继续配置]                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 连接器开发规范

```typescript
/**
 * 连接器开发SDK
 */
export abstract class BaseConnector implements IConnector {
  protected config!: ConnectorConfig;
  protected logger: Logger;
  protected metrics: MetricsCollector;
  
  constructor() {
    this.logger = new Logger(this.constructor.name);
    this.metrics = new MetricsCollector();
  }
  
  // 子类必须实现的方法
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly type: ConnectorType;
  abstract readonly capabilities: Capability[];
  
  abstract initialize(config: ConnectorConfig): Promise<void>;
  abstract connect(): Promise<ConnectionStatus>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<HealthStatus>;
  abstract getSchema(): Promise<DataSchema>;
  abstract getOperations(): OperationDefinition[];
  abstract execute(operation: string, params: any): Promise<OperationResult>;
  
  // 通用方法
  protected async withMetrics<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      this.metrics.recordSuccess(this.id, operation, Date.now() - startTime);
      return result;
    } catch (error) {
      this.metrics.recordError(this.id, operation, error);
      throw error;
    }
  }
  
  protected async withRetry<T>(
    fn: () => Promise<T>,
    retries: number = 3
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await sleep(Math.pow(2, i) * 1000);
      }
    }
    throw new Error('Max retries exceeded');
  }
}

/**
 * 连接器配置文件 (connector.json)
 */
interface ConnectorManifest {
  id: string;
  name: string;
  version: string;
  type: ConnectorType;
  description: string;
  author: string;
  
  // 能力声明
  capabilities: {
    name: string;
    description: string;
    operations: string[];
  }[];
  
  // 配置schema
  configSchema: JSONSchema;
  
  // 认证schema
  authSchema: JSONSchema;
  
  // 依赖
  dependencies?: string[];
  
  // 运行时
  runtime: {
    type: 'nodejs' | 'python' | 'wasm';
    entry: string;
  };
}

// 示例 connector.json
const exampleManifest: ConnectorManifest = {
  id: 'custom_push_channel',
  name: '自定义Push通道',
  version: '1.0.0',
  type: 'channel',
  description: '接入自研Push推送系统',
  author: 'your-team@company.com',
  
  capabilities: [
    {
      name: 'push_send',
      description: '发送Push消息',
      operations: ['send', 'sendBatch', 'queryStatus']
    }
  ],
  
  configSchema: {
    type: 'object',
    properties: {
      endpoint: {
        type: 'string',
        format: 'uri',
        description: 'API地址'
      },
      timeout: {
        type: 'number',
        default: 10000,
        description: '超时时间(ms)'
      }
    },
    required: ['endpoint']
  },
  
  authSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['apikey', 'oauth2'],
        description: '认证方式'
      },
      apiKey: {
        type: 'string',
        description: 'API Key'
      }
    }
  },
  
  runtime: {
    type: 'nodejs',
    entry: 'index.js'
  }
};
```

---

## 五、连接器管理

### 5.1 连接器生命周期

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  注册   │───→│  配置   │───→│  测试   │───→│  启用   │───→│  运行   │
│Register │    │Configure│    │  Test   │    │ Enable  │    │ Running │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └────┬────┘
     │                                                            │
     │         ┌─────────┐    ┌─────────┐                        │
     └────────→│  禁用   │←───│  错误   │←───────────────────────┘
               │Disable  │    │  Error  │
               └─────────┘    └─────────┘
```

### 5.2 连接器监控系统

```typescript
// 连接器监控
interface ConnectorMonitoring {
  // 健康检查
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    latency: number;
  };
  
  // 调用统计
  metrics: {
    totalCalls: number;
    successCalls: number;
    errorCalls: number;
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
  };
  
  // 错误分析
  errors: {
    recentErrors: ErrorLog[];
    errorRate: number;
    topErrorTypes: string[];
  };
  
  // 限流状态
  rateLimit: {
    currentQPS: number;
    limitQPS: number;
    throttledRequests: number;
  };
}

// 告警规则
interface AlertRule {
  connectorId: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
}

type AlertCondition = 
  | { type: 'error_rate'; threshold: number; duration: number }
  | { type: 'latency'; threshold: number; percentile: number }
  | { type: 'health_check_failed'; consecutive: number }
  | { type: 'rate_limit_hit'; threshold: number };
```

---

## 六、使用示例

### 6.1 在策略中使用连接器

```typescript
// 在策略服务中使用连接器
class StrategyService {
  constructor(
    private connectorGateway: ConnectorGateway
  ) {}
  
  async executeStrategy(strategy: Strategy): Promise<ExecutionResult> {
    // 1. 获取人群数据
    const audienceConnector = this.connectorGateway.getConnector<AudienceConnector>('audience_api');
    const segment = await audienceConnector.segment(strategy.audience.conditions);
    
    // 2. 发送Push
    const pushConnector = this.connectorGateway.getConnector<PushConnector>('push_channel');
    const sendResult = await pushConnector.send(
      segment.userIds,
      {
        title: strategy.touchpoints.push.title,
        body: strategy.touchpoints.push.body,
        deeplink: strategy.touchpoints.push.deeplink
      }
    );
    
    // 3. 发放优惠券
    const marketingConnector = this.connectorGateway.getConnector<MarketingConnector>('marketing_api');
    await marketingConnector.grantBenefit(
      segment.userIds,
      {
        type: 'coupon',
        templateId: strategy.benefits.couponTemplateId
      }
    );
    
    return {
      executionId: generateId(),
      status: 'success',
      sentCount: sendResult.totalAccepted
    };
  }
}
```

### 6.2 AI使用连接器

```typescript
// AI Agent通过Function Calling使用连接器
const connectorTools: ToolDefinition[] = [
  {
    name: 'query_audience',
    description: '查询人群数据',
    parameters: {
      connectorId: { type: 'string', enum: ['audience_api'] },
      operation: { type: 'string', enum: ['segment', 'estimate', 'query'] },
      params: { type: 'object' }
    },
    handler: async ({ connectorId, operation, params }) => {
      const connector = connectorGateway.getConnector(connectorId);
      return connector.execute(operation, params);
    }
  },
  {
    name: 'send_push',
    description: '发送Push消息',
    parameters: {
      connectorId: { type: 'string', enum: ['push_channel'] },
      recipients: { type: 'array', items: { type: 'string' } },
      message: { type: 'object' }
    },
    handler: async ({ connectorId, recipients, message }) => {
      const connector = connectorGateway.getConnector<PushConnector>(connectorId);
      return connector.send(recipients, message);
    }
  }
];
```

---

## 七、扩展性保障

### 7.1 新增连接器步骤

1. **创建连接器项目**
   ```bash
   npm create connector my-connector
   cd my-connector
   npm install
   ```

2. **实现连接器接口**
   ```typescript
   export default class MyConnector extends BaseConnector {
     // 实现必要方法
   }
   ```

3. **配置连接器清单**
   ```json
   {
     "id": "my_connector",
     "name": "我的连接器",
     "type": "datasource"
   }
   ```

4. **打包发布**
   ```bash
   npm run build
   npm run publish
   ```

5. **在平台安装配置**
   - 上传连接器包
   - 配置连接参数
   - 测试连接
   - 启用连接器
