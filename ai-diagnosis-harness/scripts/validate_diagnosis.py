#!/usr/bin/env python3
"""
AI诊断结果验证脚本
验证诊断输出是否符合Schema、数值是否合理、逻辑是否一致

Usage:
    python validate_diagnosis.py --input diagnosis.json [--schema schema.json]
    python validate_diagnosis.py --stdin [--schema schema.json]

Exit Codes:
    0 - 验证通过
    1 - 验证失败
    2 - 参数错误
"""

import json
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Any, Tuple
from datetime import datetime

# 默认Schema路径
DEFAULT_SCHEMA = Path(__file__).parent.parent / "assets" / "diagnosis_schema.json"


class DiagnosisValidator:
    """诊断结果验证器"""
    
    def __init__(self, schema_path: Path = None):
        self.schema = self._load_schema(schema_path or DEFAULT_SCHEMA)
        self.errors: List[Dict] = []
        self.warnings: List[Dict] = []
    
    def _load_schema(self, path: Path) -> Dict:
        """加载Schema"""
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def validate(self, diagnosis: Dict) -> Tuple[bool, Dict]:
        """
        验证诊断结果
        返回: (是否通过, 详细报告)
        """
        self.errors = []
        self.warnings = []
        
        # 1. 结构验证
        self._validate_structure(diagnosis)
        
        # 2. 数值范围验证
        self._validate_values(diagnosis)
        
        # 3. 逻辑一致性验证
        self._validate_logic(diagnosis)
        
        # 4. 业务规则验证
        self._validate_business_rules(diagnosis)
        
        report = {
            "valid": len(self.errors) == 0,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "errors": self.errors,
            "warnings": self.warnings,
            "checks": {
                "structure": self._count_errors("E001") == 0,
                "values": self._count_errors("E002") == 0,
                "logic": self._count_errors("E003") == 0,
                "business": self._count_errors("E004") == 0
            }
        }
        
        return report["valid"], report
    
    def _count_errors(self, code_prefix: str) -> int:
        """统计特定错误码数量"""
        return sum(1 for e in self.errors if e["code"].startswith(code_prefix))
    
    def _validate_structure(self, data: Dict):
        """验证JSON结构"""
        required = self.schema.get("required", [])
        for field in required:
            if field not in data:
                self.errors.append({
                    "code": "E001",
                    "field": field,
                    "message": f"必填字段缺失: {field}"
                })
        
        # 类型检查
        props = self.schema.get("properties", {})
        for field, schema_def in props.items():
            if field in data:
                expected_type = schema_def.get("type")
                value = data[field]
                if not self._check_type(value, expected_type):
                    self.errors.append({
                        "code": "E001",
                        "field": field,
                        "message": f"类型错误: {field} 应为 {expected_type}"
                    })
    
    def _check_type(self, value: Any, expected: str) -> bool:
        """检查类型"""
        type_map = {
            "string": str,
            "integer": int,
            "number": (int, float),
            "boolean": bool,
            "array": list,
            "object": dict
        }
        return isinstance(value, type_map.get(expected, object))
    
    def _validate_values(self, data: Dict):
        """验证数值范围"""
        # 健康度评分
        score = data.get("health_score")
        if score is not None:
            if not (0 <= score <= 100):
                self.errors.append({
                    "code": "E002",
                    "field": "health_score",
                    "message": f"健康度评分超出范围: {score} (应为 0-100)"
                })
        
        # 数值字段范围检查
        metrics = data.get("metrics", {})
        for field, value in metrics.items():
            if isinstance(value, (int, float)):
                if "rate" in field and not (0 <= value <= 1):
                    self.warnings.append({
                        "code": "W001",
                        "field": f"metrics.{field}",
                        "message": f"比率值异常: {field}={value} (通常应在 0-1 之间)"
                    })
        
        # 检查问题中的数值
        for problem in data.get("problems", []):
            affected = problem.get("affected_users")
            scale = metrics.get("scale", 0)
            if affected and scale and affected > scale:
                self.errors.append({
                    "code": "E002",
                    "field": f"problems.{problem.get('id', 'unknown')}.affected_users",
                    "message": f"影响人数({affected})超过人群规模({scale})"
                })
    
    def _validate_logic(self, data: Dict):
        """验证逻辑一致性"""
        score = data.get("health_score", 50)
        problems = data.get("problems", [])
        
        # 检查严重问题与健康度匹配
        has_critical = any(p.get("severity") == "critical" for p in problems)
        
        if score < 50 and not has_critical:
            self.warnings.append({
                "code": "W002",
                "field": "health_score",
                "message": f"健康度较低({score})但未发现问题"
            })
        
        if score > 80 and has_critical:
            self.errors.append({
                "code": "E003",
                "field": "health_score",
                "message": f"健康度较高({score})但存在严重问题"
            })
        
        # 检查建议与问题对应
        suggestions = data.get("suggestions", [])
        problem_ids = {p.get("id") for p in problems}
        
        for sugg in suggestions:
            related = sugg.get("related_problem_id")
            if related and related not in problem_ids:
                self.warnings.append({
                    "code": "W003",
                    "field": f"suggestions.{sugg.get('id', 'unknown')}",
                    "message": f"建议关联的问题不存在: {related}"
                })
    
    def _validate_business_rules(self, data: Dict):
        """验证业务规则"""
        # 检查时间格式
        generated = data.get("generated_at")
        if generated:
            try:
                dt = datetime.fromisoformat(generated.replace('Z', '+00:00'))
                # 检查是否未来时间
                if dt > datetime.now(dt.tzinfo):
                    self.errors.append({
                        "code": "E004",
                        "field": "generated_at",
                        "message": "生成时间不能是未来"
                    })
            except ValueError:
                self.errors.append({
                    "code": "E004",
                    "field": "generated_at",
                    "message": "时间格式不正确，应为 ISO 8601"
                })
        
        # 检查健康等级与评分匹配
        score = data.get("health_score", 50)
        level = data.get("health_level")
        
        expected_level = None
        if score >= 90:
            expected_level = "excellent"
        elif score >= 70:
            expected_level = "good"
        elif score >= 50:
            expected_level = "warning"
        else:
            expected_level = "critical"
        
        if level and level != expected_level:
            self.warnings.append({
                "code": "W004",
                "field": "health_level",
                "message": f"健康等级({level})与评分({score})不匹配，应为 {expected_level}"
            })


def main():
    parser = argparse.ArgumentParser(description="AI诊断结果验证工具")
    parser.add_argument("--input", "-i", help="输入JSON文件路径")
    parser.add_argument("--schema", "-s", help="Schema文件路径")
    parser.add_argument("--stdin", action="store_true", help="从stdin读取JSON")
    parser.add_argument("--output", "-o", help="输出报告路径")
    parser.add_argument("--format", "-f", choices=["json", "pretty"], default="pretty", 
                       help="输出格式")
    
    args = parser.parse_args()
    
    # 读取输入
    if args.stdin:
        data = json.load(sys.stdin)
    elif args.input:
        with open(args.input, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        print("错误: 请指定 --input 或 --stdin", file=sys.stderr)
        sys.exit(2)
    
    # 验证
    schema_path = Path(args.schema) if args.schema else None
    validator = DiagnosisValidator(schema_path)
    is_valid, report = validator.validate(data)
    
    # 输出结果
    if args.format == "json":
        output = json.dumps(report, ensure_ascii=False, indent=2)
    else:
        # 漂亮格式
        lines = [
            "=" * 50,
            "AI诊断验证报告",
            "=" * 50,
            f"验证结果: {'✅ 通过' if is_valid else '❌ 失败'}",
            f"错误数: {report['error_count']}",
            f"警告数: {report['warning_count']}",
            "-" * 50,
            "检查项:",
        ]
        for check, passed in report['checks'].items():
            lines.append(f"  {'✓' if passed else '✗'} {check}")
        
        if report['errors']:
            lines.extend(["-" * 50, "错误详情:"])
            for err in report['errors']:
                lines.append(f"  [{err['code']}] {err['field']}: {err['message']}")
        
        if report['warnings']:
            lines.extend(["-" * 50, "警告详情:"])
            for warn in report['warnings']:
                lines.append(f"  [{warn['code']}] {warn['field']}: {warn['message']}")
        
        lines.append("=" * 50)
        output = "\n".join(lines)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
    else:
        print(output)
    
    sys.exit(0 if is_valid else 1)


if __name__ == "__main__":
    main()
