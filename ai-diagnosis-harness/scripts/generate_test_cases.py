#!/usr/bin/env python3
"""
生成测试用例
为 Prompt 测试生成多样化的测试用例

Usage:
    python generate_test_cases.py --count 20 --output test_cases.json
    python generate_test_cases.py --scenario critical --count 10
"""

import json
import argparse
from pathlib import Path
from typing import List, Dict
import random


# 测试场景模板
SCENARIOS = {
    "critical": [
        {"name": "高价值流失风险", "scale": 500000, "churn_rate": 0.15, "conversion": 0.02},
        {"name": "沉默用户", "scale": 800000, "churn_rate": 0.25, "conversion": 0.005},
        {"name": "竞品流失", "scale": 300000, "churn_rate": 0.20, "conversion": 0.01},
    ],
    "warning": [
        {"name": "活跃度下降", "scale": 600000, "churn_rate": 0.08, "conversion": 0.04},
        {"name": "新用户留存", "scale": 1200000, "churn_rate": 0.10, "conversion": 0.03},
        {"name": "中价值用户", "scale": 700000, "churn_rate": 0.06, "conversion": 0.05},
    ],
    "good": [
        {"name": "忠诚用户", "scale": 400000, "churn_rate": 0.02, "conversion": 0.12},
        {"name": "高活跃用户", "scale": 300000, "churn_rate": 0.01, "conversion": 0.15},
        {"name": "复购用户", "scale": 500000, "churn_rate": 0.03, "conversion": 0.10},
    ],
    "edge": [
        {"name": "超小人群", "scale": 100, "churn_rate": 0.5, "conversion": 0.0},
        {"name": "超大人群", "scale": 5000000, "churn_rate": 0.01, "conversion": 0.02},
        {"name": "零转化", "scale": 10000, "churn_rate": 0.1, "conversion": 0.0},
        {"name": "全转化", "scale": 1000, "churn_rate": 0.0, "conversion": 1.0},
    ]
}


def generate_test_case(scenario: str, index: int) -> Dict:
    """生成单个测试用例"""
    templates = SCENARIOS.get(scenario, SCENARIOS["warning"])
    template = random.choice(templates)
    
    # 添加一些随机变化
    scale_variation = random.uniform(0.8, 1.2)
    
    return {
        "segment_id": f"seg_{scenario}_{index:03d}",
        "segment_name": f"{template['name']}_{index}",
        "scale": int(template['scale'] * scale_variation),
        "expected_severity": scenario,
        "metrics": {
            "churn_rate_7d": round(template['churn_rate'] * random.uniform(0.9, 1.1), 4),
            "churn_rate_30d": round(template['churn_rate'] * 3 * random.uniform(0.9, 1.1), 4),
            "conversion_rate": round(template['conversion'] * random.uniform(0.9, 1.1), 4),
            "avg_order_value": round(random.uniform(100, 500), 2)
        },
        "description": f"{template['name']}测试场景",
        "expected_output": {
            "health_score_range": get_expected_health_range(scenario),
            "should_have_problems": scenario in ["critical", "warning"],
            "problem_severity": scenario
        }
    }


def get_expected_health_range(severity: str) -> List[int]:
    """获取期望健康度范围"""
    ranges = {
        "critical": [0, 49],
        "warning": [50, 69],
        "good": [70, 100],
        "edge": [0, 100]
    }
    return ranges.get(severity, [0, 100])


def generate_test_cases(
    count: int = 20,
    scenarios: List[str] = None,
    include_edge: bool = False
) -> List[Dict]:
    """生成测试用例集合"""
    cases = []
    
    if scenarios is None:
        scenarios = ["critical", "warning", "good"]
    
    if include_edge:
        scenarios.append("edge")
    
    # 均匀分配
    per_scenario = count // len(scenarios)
    remainder = count % len(scenarios)
    
    for i, scenario in enumerate(scenarios):
        scenario_count = per_scenario + (1 if i < remainder else 0)
        for j in range(scenario_count):
            cases.append(generate_test_case(scenario, j))
    
    # 打乱顺序
    random.shuffle(cases)
    
    return cases


def main():
    parser = argparse.ArgumentParser(description="测试用例生成工具")
    parser.add_argument("--count", "-n", type=int, default=20, help="生成数量")
    parser.add_argument("--scenario", "-s", choices=["critical", "warning", "good", "edge", "all"],
                       help="指定场景类型")
    parser.add_argument("--include-edge", "-e", action="store_true", help="包含边界测试")
    parser.add_argument("--output", "-o", required=True, help="输出文件路径")
    parser.add_argument("--pretty", "-p", action="store_true", help="格式化输出")
    
    args = parser.parse_args()
    
    # 确定场景
    scenarios = None
    if args.scenario and args.scenario != "all":
        scenarios = [args.scenario]
    
    # 生成
    print(f"生成 {args.count} 个测试用例...")
    cases = generate_test_cases(
        count=args.count,
        scenarios=scenarios,
        include_edge=args.include_edge
    )
    
    # 统计
    scenario_counts = {}
    for case in cases:
        s = case.get("expected_severity", "unknown")
        scenario_counts[s] = scenario_counts.get(s, 0) + 1
    
    print("生成统计:")
    for s, c in scenario_counts.items():
        print(f"  {s}: {c}")
    
    # 保存
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    indent = 2 if args.pretty else None
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(cases, f, ensure_ascii=False, indent=indent)
    
    print(f"\n已保存到: {output_path}")
    return 0


if __name__ == "__main__":
    exit(main())
