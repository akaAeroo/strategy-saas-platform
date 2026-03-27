---
name: ai-diagnosis-harness
description: AI诊断质量保障框架，用于验证策略平台中AI人群诊断的准确性、合理性和一致性。当需要测试AI诊断输出质量、验证诊断结果结构、评估诊断准确性、优化诊断Prompt时使用。提供结构验证、数值检查、逻辑一致性检测、Prompt基准测试和质量报告生成能力。
---

# AI 诊断质量保障 Harness

## 核心能力

1. **结构化验证** - 确保AI诊断输出符合预定义Schema
2. **数值合理性检查** - 验证数值范围、趋势逻辑
3. **一致性检测** - 跨时间、跨人群的逻辑一致性
4. **Prompt 基准测试** - 对比不同Prompt版本效果
5. **质量报告生成** - 输出可量化的质量指标

## 快速开始

### 验证单次诊断结果

```bash
python scripts/validate_diagnosis.py --input diagnosis.json --schema assets/diagnosis_schema.json
```

### 运行 Prompt 基准测试

```bash
python scripts/benchmark_prompt.py --prompt prompt_v2.txt --cases test_cases.json
```

### 生成质量评估报告

```bash
python scripts/evaluate_quality.py --segment-id seg_123 --days 7 --output report.json
```

## 诊断输出 Schema

见 [assets/diagnosis_schema.json](assets/diagnosis_schema.json)

必填字段：
- `health_score`: 健康度评分 (0-100)
- `problems`: 问题列表，每项包含 `severity`/`description`/`metric_change`
- `opportunities`: 机会列表
- `suggestions`: 策略建议

## 验证规则

见 [references/validation_rules.md](references/validation_rules.md)

关键规则：
- 健康度评分 0-100 整数
- 流失率环比变化需有方向标识 (↑↓)
- 问题严重级别：critical/warning/info
- 人群规模与问题影响人数逻辑一致

## 质量指标定义

见 [references/quality_metrics.md](references/quality_metrics.md)

核心指标：
- **结构合规率**: JSON Schema 通过率
- **数值合理率**: 数值在合理范围内比例
- **逻辑一致率**: 内部逻辑自洽比例
- **人工一致率**: 与人工判断一致比例 (采样)

## CLI 集成

Harness 通过 scripts 目录下的脚本与 CLI 集成：

```javascript
// CLI 调用示例
const { execSync } = require('child_process');

// 验证诊断
execSync(`python ${harnessPath}/scripts/validate_diagnosis.py --input ${file}`);

// 基准测试
execSync(`python ${harnessPath}/scripts/benchmark_prompt.py --prompt ${promptFile}`);
```

## 错误码

| 代码 | 含义 |
|-----|------|
| E001 | JSON Schema 验证失败 |
| E002 | 数值超出合理范围 |
| E003 | 逻辑不一致 |
| E004 | 必填字段缺失 |
| E005 | 数据类型错误 |
