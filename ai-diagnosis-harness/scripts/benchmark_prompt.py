#!/usr/bin/env python3
"""
Prompt 基准测试脚本
测试不同 Prompt 版本的诊断效果

Usage:
    python benchmark_prompt.py --prompt prompt_v1.txt --cases test_cases.json
    python benchmark_prompt.py --prompt prompt_v1.txt --segment-id seg_123 --count 10
"""

import json
import argparse
import asyncio
import time
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass, asdict
import random


@dataclass
class BenchmarkResult:
    """基准测试结果"""
    prompt_version: str
    total_cases: int
    success_count: int
    structure_pass: int
    value_pass: int
    logic_pass: int
    avg_latency_ms: float
    avg_token_count: int
    issues: List[Dict]


class PromptBenchmark:
    """Prompt基准测试器"""
    
    def __init__(self, prompt_file: Path):
        self.prompt = prompt_file.read_text(encoding='utf-8')
        self.prompt_version = prompt_file.stem
        self.results: List[Dict] = []
    
    async def run_benchmark(self, test_cases: List[Dict]) -> BenchmarkResult:
        """运行基准测试"""
        success_count = 0
        structure_pass = 0
        value_pass = 0
        logic_pass = 0
        total_latency = 0
        total_tokens = 0
        issues = []
        
        for i, case in enumerate(test_cases):
            print(f"  测试 {i+1}/{len(test_cases)}: {case.get('name', 'unknown')}...")
            
            start_time = time.time()
            
            try:
                # 调用AI生成诊断（模拟或真实调用）
                diagnosis = await self._call_ai(case)
                
                latency = (time.time() - start_time) * 1000
                total_latency += latency
                
                # 验证结果
                from validate_diagnosis import DiagnosisValidator
                validator = DiagnosisValidator()
                is_valid, report = validator.validate(diagnosis)
                
                if is_valid:
                    success_count += 1
                
                if report['checks']['structure']:
                    structure_pass += 1
                if report['checks']['values']:
                    value_pass += 1
                if report['checks']['logic']:
                    logic_pass += 1
                
                # 记录问题
                for err in report['errors']:
                    issues.append({
                        "case": case.get('name'),
                        "error": err
                    })
                
                self.results.append({
                    "case": case,
                    "diagnosis": diagnosis,
                    "valid": is_valid,
                    "latency_ms": latency,
                    "report": report
                })
                
            except Exception as e:
                issues.append({
                    "case": case.get('name'),
                    "error": str(e)
                })
        
        total = len(test_cases)
        return BenchmarkResult(
            prompt_version=self.prompt_version,
            total_cases=total,
            success_count=success_count,
            structure_pass=structure_pass,
            value_pass=value_pass,
            logic_pass=logic_pass,
            avg_latency_ms=total_latency / total if total > 0 else 0,
            avg_token_count=random.randint(800, 1500),  # 模拟
            issues=issues[:10]  # 只保留前10个问题
        )
    
    async def _call_ai(self, case: Dict) -> Dict:
        """
        调用AI生成诊断
        实际实现需要接入公司的大模型API
        """
        # TODO: 接入真实的AI API
        # 这里返回模拟数据
        return self._generate_mock_diagnosis(case)
    
    def _generate_mock_diagnosis(self, case: Dict) -> Dict:
        """生成模拟诊断结果（用于测试）"""
        from datetime import datetime
        
        severity = case.get('expected_severity', 'warning')
        score = random.randint(40, 95) if severity == 'critical' else random.randint(60, 90)
        
        return {
            "segment_id": case.get('segment_id', 'seg_test'),
            "segment_name": case.get('segment_name', '测试人群'),
            "health_score": score,
            "health_level": "warning" if score < 70 else "good",
            "summary": f"该人群健康度评分为{score}分，存在{severity}级别问题",
            "problems": [
                {
                    "id": "p1",
                    "severity": severity,
                    "title": "测试问题",
                    "description": "这是一个测试用的诊断问题",
                    "metric": "churn_rate",
                    "current_value": 0.05,
                    "previous_value": 0.04,
                    "change_percent": 25,
                    "affected_users": min(1000, case.get('scale', 1000))
                }
            ] if severity != 'good' else [],
            "opportunities": [],
            "suggestions": [
                {
                    "id": "s1",
                    "action": "建议采取召回策略",
                    "priority": 1,
                    "expected_outcome": "提升留存率",
                    "related_problem_id": "p1"
                }
            ] if severity != 'good' else [],
            "metrics": {
                "scale": case.get('scale', 10000),
                "conversion_rate": 0.05,
                "churn_rate_7d": 0.05,
                "churn_rate_30d": 0.15
            },
            "generated_at": datetime.now().isoformat()
        }


def generate_test_cases(segment_id: str = None, count: int = 10) -> List[Dict]:
    """生成测试用例"""
    cases = []
    
    templates = [
        {"name": "高价值用户", "scale": 500000, "expected_severity": "warning"},
        {"name": "新用户", "scale": 1200000, "expected_severity": "info"},
        {"name": "沉默用户", "scale": 800000, "expected_severity": "critical"},
        {"name": "流失风险用户", "scale": 300000, "expected_severity": "critical"},
        {"name": "忠诚用户", "scale": 200000, "expected_severity": "good"},
    ]
    
    for i in range(count):
        template = templates[i % len(templates)]
        cases.append({
            "segment_id": f"seg_test_{i}",
            "segment_name": f"{template['name']}_{i}",
            "scale": template['scale'],
            "expected_severity": template['expected_severity'],
            "description": f"测试用例 {i+1}"
        })
    
    return cases


def main():
    parser = argparse.ArgumentParser(description="Prompt 基准测试工具")
    parser.add_argument("--prompt", "-p", required=True, help="Prompt文件路径")
    parser.add_argument("--cases", "-c", help="测试用例JSON文件")
    parser.add_argument("--segment-id", "-s", help="指定人群ID进行测试")
    parser.add_argument("--count", "-n", type=int, default=10, help="测试用例数量")
    parser.add_argument("--output", "-o", help="输出报告路径")
    
    args = parser.parse_args()
    
    prompt_file = Path(args.prompt)
    if not prompt_file.exists():
        print(f"错误: Prompt文件不存在: {prompt_file}")
        return 1
    
    # 加载测试用例
    if args.cases:
        with open(args.cases, 'r', encoding='utf-8') as f:
            test_cases = json.load(f)
    else:
        test_cases = generate_test_cases(args.segment_id, args.count)
    
    print(f"开始基准测试: {prompt_file.stem}")
    print(f"测试用例数: {len(test_cases)}")
    print("-" * 50)
    
    # 运行测试
    benchmark = PromptBenchmark(prompt_file)
    result = asyncio.run(benchmark.run_benchmark(test_cases))
    
    # 生成报告
    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "prompt_version": result.prompt_version,
        "summary": {
            "total_cases": result.total_cases,
            "success_rate": round(result.success_count / result.total_cases * 100, 2),
            "structure_pass_rate": round(result.structure_pass / result.total_cases * 100, 2),
            "value_pass_rate": round(result.value_pass / result.total_cases * 100, 2),
            "logic_pass_rate": round(result.logic_pass / result.total_cases * 100, 2),
            "avg_latency_ms": round(result.avg_latency_ms, 2),
            "avg_token_count": result.avg_token_count
        },
        "grade": calculate_grade(result),
        "issues": result.issues
    }
    
    # 输出报告
    output = json.dumps(report, ensure_ascii=False, indent=2)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"\n报告已保存: {args.output}")
    else:
        print("\n" + "=" * 50)
        print("基准测试报告")
        print("=" * 50)
        print(f"Prompt版本: {report['prompt_version']}")
        print(f"测试时间: {report['timestamp']}")
        print(f"测试用例: {report['summary']['total_cases']}")
        print(f"成功率: {report['summary']['success_rate']}%")
        print(f"结构通过率: {report['summary']['structure_pass_rate']}%")
        print(f"逻辑通过率: {report['summary']['logic_pass_rate']}%")
        print(f"平均延迟: {report['summary']['avg_latency_ms']}ms")
        print(f"质量等级: {report['grade']}")
        print("=" * 50)
    
    return 0


def calculate_grade(result: BenchmarkResult) -> str:
    """计算质量等级"""
    score = (
        result.success_count / result.total_cases * 0.4 +
        result.structure_pass / result.total_cases * 0.2 +
        result.logic_pass / result.total_cases * 0.4
    ) * 100
    
    if score >= 95:
        return "A (优秀)"
    elif score >= 85:
        return "B (良好)"
    elif score >= 70:
        return "C (及格)"
    else:
        return "D (不合格)"


if __name__ == "__main__":
    exit(main())
