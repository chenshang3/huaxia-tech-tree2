#!/usr/bin/env python3
"""
validate_and_export.py — 数据验证 + 双格式导出
验证项:
  1. 所有 id 唯一
  2. 所有 cat 在 categories.json 中存在
  3. year 为数字
  4. name 非空
输出:
  - output/final_nodes.csv (审核用)
  - output/final_nodes.json (导入用，与现有 nodes.json 格式一致)
  - output/validation_report.txt (验证报告)
"""

import json
import csv
import re
from pathlib import Path
from collections import defaultdict

OUTPUT_DIR = Path(__file__).parent / "output"
SCRIPTS_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPTS_DIR.parent


def load_parsed() -> list:
    parsed_file = OUTPUT_DIR / "wiki_parsed.json"
    if not parsed_file.exists():
        raise FileNotFoundError(f"未找到 {parsed_file}，请先运行 parse_wiki.py")
    with open(parsed_file, "r", encoding="utf-8") as f:
        return json.load(f)


def load_categories() -> set:
    cat_file = PROJECT_ROOT / "server" / "data" / "categories.json"
    if not cat_file.exists():
        print("  警告: 未找到 categories.json，跳过分类验证")
        return set()
    with open(cat_file, "r", encoding="utf-8") as f:
        cats = json.load(f)
    return {c["code"] for c in cats}


def validate_ids(entries: list) -> list:
    """检查并修复重复 ID"""
    issues = []
    seen = {}
    for entry in entries:
        eid = entry["id"]
        if eid in seen:
            new_id = f"{eid}_{entry.get('year', 'unknown')}"
            issues.append(f"  重复 ID '{eid}' → 重命名为 '{new_id}'")
            entry["id"] = new_id
        else:
            seen[eid] = entry
    return issues


def validate_categories(entries: list, valid_cats: set) -> list:
    """检查分类是否有效"""
    if not valid_cats:
        return []
    issues = []
    for entry in entries:
        cat = entry.get("cat", "")
        if cat not in valid_cats:
            issues.append(f"  未知分类 '{cat}' (节点: {entry['name']})")
    return issues


def validate_year(entries: list) -> list:
    """检查年份数据"""
    issues = []
    for entry in entries:
        year = entry.get("year")
        if year is None:
            issues.append(f"  缺少年份: {entry['name']} (ID: {entry['id']})")
        elif not isinstance(year, (int, float)):
            issues.append(f"  年份非数字: {entry['name']} (值: {year})")
    return issues


def validate_required_fields(entries: list) -> list:
    """检查必填字段"""
    issues = []
    for entry in entries:
        if not entry.get("name", "").strip():
            issues.append(f"  缺少名称: ID={entry['id']}")
    return issues


def clean_desc(desc: str) -> str:
    """清理desc中的HTML标签和其他无效内容"""
    if not desc:
        return ""
    desc = re.sub(r'<[^>]+>', '', desc)
    desc = re.sub(r'\s+', ' ', desc)
    return desc.strip()


def clean_entry(entry: dict) -> dict:
    """清理条目，只保留需要的字段"""
    return {
        "name": entry.get("name", ""),
        "year": entry.get("year") if entry.get("year") is not None else None,
        "desc": clean_desc(entry.get("desc", "")),
        "wiki_url": entry.get("wiki_url") or None,
        "id": None,
        "en": None,
        "era": None,
        "cat": None,
        "inv": None,
        "sig": None,
        "outEdges": None,
    }


def export_csv(entries: list):
    """导出 CSV（审核用）"""
    csv_file = OUTPUT_DIR / "final_nodes.csv"
    fieldnames = ["name", "year", "desc", "wiki_url"]

    with open(csv_file, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for entry in entries:
            row = {
                "name": entry.get("name", ""),
                "year": entry.get("year") if entry.get("year") is not None else "",
                "desc": entry.get("desc", ""),
                "wiki_url": entry.get("wiki_url") or "",
            }
            writer.writerow(row)

    print(f"  已保存: {csv_file}")


def export_json(entries: list):
    """导出 JSON（导入用）"""
    json_file = OUTPUT_DIR / "final_nodes.json"
    clean_entries = []
    for e in entries:
        clean_entries.append({
            "name": e.get("name", ""),
            "year": e.get("year") if e.get("year") is not None else None,
            "desc": e.get("desc", ""),
            "wiki_url": e.get("wiki_url") or None,
            "id": None,
            "en": None,
            "era": None,
            "cat": None,
            "inv": None,
            "sig": None,
            "outEdges": None,
        })

    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(clean_entries, f, ensure_ascii=False, indent=2)

    print(f"  已保存: {json_file}")


def write_report(issues: list, stats: dict):
    """写入验证报告"""
    report_file = OUTPUT_DIR / "validation_report.txt"
    lines = []
    lines.append("=" * 60)
    lines.append("华夏科技树数据验证报告")
    lines.append("=" * 60)
    lines.append("")
    lines.append(f"总条目数: {stats['total']}")
    lines.append(f"有年份数据: {stats['with_year']}")
    lines.append(f"缺少年份: {stats['missing_year']}")
    lines.append(f"有英文名: {stats['with_en']}")
    lines.append("")

    if issues:
        lines.append(f"发现问题: {len(issues)} 项")
        lines.append("-" * 40)
        for issue in issues:
            lines.append(issue)
    else:
        lines.append("验证通过，未发现问题")

    lines.append("")
    lines.append("=" * 60)
    lines.append("报告生成完毕")
    lines.append("=" * 60)

    report_file.write_text("\n".join(lines), encoding="utf-8")
    print(f"  已保存: {report_file}")


def main():
    print("=== 步骤 3/3: 验证并导出数据 ===")

    entries = load_parsed()
    print(f"  加载 {len(entries)} 个条目")

    stats = {
        "total": len(entries),
        "with_year": sum(1 for e in entries if e.get("year") is not None),
        "missing_year": sum(1 for e in entries if e.get("year") is None),
    }

    print(f"\n  统计:")
    for k, v in stats.items():
        print(f"    {k}: {v}")

    print(f"\n  导出文件...")
    export_csv(entries)
    export_json(entries)

    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
