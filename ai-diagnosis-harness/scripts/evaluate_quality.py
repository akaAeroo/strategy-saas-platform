#!/usr/bin/env python3
"""
质量评估报告生成
分析历史诊断数据，生成质量报告

Usage:
    python evaluate_quality.py --days 7
    python evaluate_quality.py --segment-id seg_123 --days 30
    python evaluate_quality.py --input-dir ./diagnoses --output report.json
"""

import json
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any
from collections import defaultdict


class QualityEvaluator:
    """质量评估器"""
    
    def __init__(self, diagnoses_dir: Path = None):
        self.diagnoses_dir = diagnoses_dir or Path("./diagnoses")
        self.diagnoses: List[Dict] = []
    
    def load_diagnoses(self, days: int = 7, segment_id: str = None):
        """加载诊断数据"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        if not self.diagnoses_dir.exists():
            print(f"警告: 诊断数据目录不存在: {self.diagnoses_dir}")
            return
        
        for file in self.diagnoses_dir.glob("*.json"):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # 时间过滤
                generated = data.get('generated_at', '')
                if generated:
                    try:
                        dt = datetime.fromisoformat(generated.replace('Z', '+00:00'))
                        if dt < cutoff_date:
                            continue
                    except:
                        pass
                
                # 人群过滤
                if segment_id and data.get('segment_id') != segment_id:
                    continue
                
                self.diagnoses.append(data)
            except Exception as e:
                print(f"警告: 无法加载 {file}: {e}")
    
    def evaluate(self) -> Dict[str, Any]:
        """执行质量评估"""
        if not self.diagnoses:
            return {"error": "没有可用的诊断数据"}
        
        total = len(self.diagnoses)
        
        # 基础统计
        stats = {
            "total_diagnoses": total,
            "segment_count": len(set(d.get('segment_id') for d in self.diagnoses)),
            "date_range": self._get_date_range()
        }
        
        # 质量指标
        metrics = self._calculate_metrics()
        
        # 问题分析
        issues = self._analyze_issues()
        
        # 趋势分析
        trends = self._analyze_trends()
        
        # 综合评级
        grade = self._calculate_overall_grade(metrics)
        
        return {
            "report_id": f"qr_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "generated_at": datetime.now().isoformat(),
            "stats": stats,
            "metrics": metrics,
            "issues": issues,
            "trends": trends,
            "overall_grade": grade,
            "recommendations": self._generate_recommendations(metrics, issues)
        }
    
    def _get_date_range(self) -> Dict:
        """获取数据时间范围"""
        dates = []
        for d in self.diagnoses:
            generated = d.get('generated_at', '')
            if generated:
                try:
                    dt = datetime.fromisoformat(generated.replace('Z', '+00:00'))
                    dates.append(dt)
                except:
                    pass
        
        if dates:
            return {
                "start": min(dates).isoformat(),
                "end": max(dates).isoformat()
            }
        return {}
    
    def _calculate_metrics(self) -> Dict:
        """计算质量指标"""
        from validate_diagnosis import DiagnosisValidator
        
        validator = DiagnosisValidator()
        
        structure_pass = 0
        value_pass = 0
        logic_pass = 0
        total_valid = 0
        
        health_scores = []
        problem_counts = defaultdict(int)
        severity_distribution = defaultdict(int)
        
        for diagnosis in self.diagnoses:
            is_valid, report = validator.validate(diagnosis)
            
            if is_valid:
                total_valid += 1
            
            if report['checks']['structure']:
                structure_pass += 1
            if report['checks']['values']:
                value_pass += 1
            if report['checks']['logic']:
                logic_pass += 1
            
            # 统计健康度
            score = diagnosis.get('health_score')
            if score is not None:
                health_scores.append(score)
            
            # 统计问题
            for problem in diagnosis.get('problems', []):
                problem_counts[problem.get('title', 'unknown')] += 1
                severity_distribution[problem.get('severity', 'unknown')] += 1
        
        total = len(self.diagnoses)
        
        return {
            "structure_compliance": {
                "value": round(structure_pass / total * 100, 2) if total > 0 else 0,
                "target": 99,
                "status": "pass" if structure_pass / total >= 0.99 else "warning"
            },
            "value_rationality": {
                "value": round(value_pass / total * 100, 2) if total > 0 else 0,
                "target": 98,
                "status": "pass" if value_pass / total >= 0.98 else "warning"
            },
            "logical_consistency": {
                "value": round(logic_pass / total * 100, 2) if total > 0 else 0,
                "target": 95,
                "status": "pass" if logic_pass / total >= 0.95 else "warning"
            },
            "overall_validity": {
                "value": round(total_valid / total * 100, 2) if total > 0 else 0,
                "target": 95,
                "status": "pass" if total_valid / total >= 0.95 else "warning"
            },
            "health_score_stats": {
                "avg": round(sum(health_scores) / len(health_scores), 2) if health_scores else 0,
                "min": min(health_scores) if health_scores else 0,
                "max": max(health_scores) if health_scores else 0
            },
            "top_problems": sorted(problem_counts.items(), key=lambda x: x[1], reverse=True)[:5],
            "severity_distribution": dict(severity_distribution)
        }
    
    def _analyze_issues(self) -> List[Dict]:
        """分析问题"""
        from validate_diagnosis import DiagnosisValidator
        
        validator = DiagnosisValidator()
        issue_counts = defaultdict(lambda: {"count": 0, "examples": []})
        
        for diagnosis in self.diagnoses:
            _, report = validator.validate(diagnosis)
            
            for error in report['errors']:
                code = error['code']
                issue_counts[code]["count"] += 1
                if len(issue_counts[code]["examples"]) < 3:
                    issue_counts[code]["examples"].append({
                        "segment": diagnosis.get('segment_id'),
                        "error": error
                    })
        
        return [
            {
                "code": code,
                "count": info["count"],
                "percentage": round(info["count"] / len(self.diagnoses) * 100, 2),
                "examples": info["examples"]
            }
            for code, info in sorted(issue_counts.items(), key=lambda x: x[1]["count"], reverse=True)
        ]
    
    def _analyze_trends(self) -> Dict:
        """分析趋势"""
        daily_stats = defaultdict(lambda: {"count": 0, "avg_score": []})
        
        for diagnosis in self.diagnoses:
            generated = diagnosis.get('generated_at', '')
            if generated:
                try:
                    date = generated[:10]  # YYYY-MM-DD
                    daily_stats[date]["count"] += 1
                    score = diagnosis.get('health_score')
                    if score is not None:
                        daily_stats[date]["avg_score"].append(score)
                except:
                    pass
        
        # 计算每日平均
        trend_data = []
        for date in sorted(daily_stats.keys()):
            stats = daily_stats[date]
            scores = stats["avg_score"]
            trend_data.append({
                "date": date,
                "count": stats["count"],
                "avg_health_score": round(sum(scores) / len(scores), 2) if scores else 0
            })
        
        return {
            "daily": trend_data[-7:],  # 最近7天
            "direction": self._trend_direction(trend_data)
        }
    
    def _trend_direction(self, trend_data: List[Dict]) -> str:
        """判断趋势方向"""
        if len(trend_data) < 3:
            return "insufficient_data"
        
        recent = trend_data[-3:]
        scores = [d["avg_health_score"] for d in recent]
        
        if scores[-1] > scores[0] * 1.05:
            return "improving"
        elif scores[-1] < scores[0] * 0.95:
            return "declining"
        else:
            return "stable"
    
    def _calculate_overall_grade(self, metrics: Dict) -> str:
        """计算综合评级"""
        score = (
            metrics["structure_compliance"]["value"] * 0.2 +
            metrics["value_rationality"]["value"] * 0.2 +
            metrics["logical_consistency"]["value"] * 0.25 +
            metrics["overall_validity"]["value"] * 0.35
        )
        
        if score >= 95:
            return "A"
        elif score >= 85:
            return "B"
        elif score >= 70:
            return "C"
        else:
            return "D"
    
    def _generate_recommendations(self, metrics: Dict, issues: List[Dict]) -> List[str]:
        """生成改进建议"""
        recommendations = []
        
        if metrics["structure_compliance"]["status"] != "pass":
            recommendations.append("优化Prompt确保输出符合JSON Schema")
        
        if metrics["value_rationality"]["status"] != "pass":
            recommendations.append("加强数值范围约束，避免异常值")
        
        if metrics["logical_consistency"]["status"] != "pass":
            recommendations.append("改进逻辑一致性，确保健康度与问题描述匹配")
        
        # 基于常见问题
        if issues:
            top_issue = issues[0]
            if top_issue["code"] == "E001":
                recommendations.append("修复必填字段缺失问题")
            elif top_issue["code"] == "E002":
                recommendations.append("校准数值计算逻辑")
        
        return recommendations[:3]


def main():
    parser = argparse.ArgumentParser(description="质量评估报告生成工具")
    parser.add_argument("--input-dir", "-i", help="诊断数据目录")
    parser.add_argument("--days", "-d", type=int, default=7, help="分析天数")
    parser.add_argument("--segment-id", "-s", help="指定人群ID")
    parser.add_argument("--output", "-o", help="输出报告路径")
    parser.add_argument("--format", "-f", choices=["json", "pretty"], default="pretty")
    
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir) if args.input_dir else None
    evaluator = QualityEvaluator(input_dir)
    
    print(f"加载最近 {args.days} 天的诊断数据...")
    evaluator.load_diagnoses(days=args.days, segment_id=args.segment_id)
    
    print(f"已加载 {len(evaluator.diagnoses)} 条诊断记录")
    print("正在分析...")
    
    report = evaluator.evaluate()
    
    if "error" in report:
        print(f"错误: {report['error']}")
        return 1
    
    # 输出报告
    if args.format == "json":
        output = json.dumps(report, ensure_ascii=False, indent=2)
    else:
        lines = [
            "=" * 60,
            "AI诊断质量评估报告",
            "=" * 60,
            f"报告ID: {report['report_id']}",
            f"生成时间: {report['generated_at']}",
            "",
            "📊 数据统计:",
            f"  总诊断数: {report['stats']['total_diagnoses']}",
            f"  覆盖人群: {report['stats']['segment_count']}",
            "",
            "📈 质量指标:",
        ]
        
        for metric_name, metric_data in report['metrics'].items():
            if isinstance(metric_data, dict) and "value" in metric_data:
                status_icon = "✅" if metric_data['status'] == 'pass' else "⚠️"
                lines.append(f"  {status_icon} {metric_name}: {metric_data['value']}% (目标: {metric_data['target']}%)")
        
        lines.extend([
            "",
            f"🎯 综合评级: {report['overall_grade']}",
            "",
            "🔍 主要问题:"
        ])
        
        if report['issues']:
            for issue in report['issues'][:5]:
                lines.append(f"  [{issue['code']}] 出现 {issue['count']} 次 ({issue['percentage']}%)")
        else:
            lines.append("  未发现严重问题")
        
        if report['recommendations']:
            lines.extend(["", "💡 改进建议:"])
            for rec in report['recommendations']:
                lines.append(f"  • {rec}")
        
        lines.append("=" * 60)
        output = "\n".join(lines)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"\n报告已保存: {args.output}")
    else:
        print("\n" + output)
    
    return 0


if __name__ == "__main__":
    exit(main())
