#!/usr/bin/env python3
"""
llm_complete_metadata.py

使用 LLM 为已完成 desc/year 清洗的节点补全结构化元数据：
  - en
  - cat
  - inv
  - sig
并基于英文名或中文名规则生成稳定的 id。

默认输入:
  scripts/output/final_nodes_examined_completed.json

默认输出:
  scripts/output/final_nodes_metadata_completed.json

特点:
  1. 只处理缺失元数据的条目，避免重复调用。
  2. 每 N 条保存一次进度。
  3. 分类严格限制在 server/data/categories.json 中已有的 code。
  4. id 尽量规则生成，不把它交给模型自由输出。
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
from pathlib import Path

import openai
from pypinyin import lazy_pinyin
from tqdm import tqdm


SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
# OUTPUT_DIR = SCRIPT_DIR / "output"
DEFAULT_INPUT_FILE = "scripts/output/final_nodes_examined.json"
DEFAULT_OUTPUT_FILE = "scripts/output/final_nodes_examined_1.json"
CATEGORIES_FILE = PROJECT_ROOT / "server" / "data" / "categories.json"

BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com")
API_KEY = 'sk-36e7e3720a8643c8a55a72f85801241e'
MODEL = os.getenv("LLM_MODEL", "deepseek-chat")
SAVE_EVERY_N_ITEMS = 10
REQUEST_INTERVAL_SECONDS = float(os.getenv("LLM_REQUEST_INTERVAL", "1.0"))


SYSTEM_PROMPT_TEMPLATE = """You are a metadata editor specializing in the history of Chinese science and technology.
Your task is to complete structured metadata for one Chinese invention node.

You must output only one valid JSON object with exactly these keys:
- name: string
- en: string
- cat: string
- inv: string
- sig: string

Allowed category codes:
{category_codes}

Category descriptions:
{category_descs}

Rules:
1. Focus only on the Chinese historical context reflected in the input.
2. Keep `en` concise, natural, and suitable as a graph label, usually 2-6 English words.
3. `cat` must be exactly one of the allowed category codes.
4. `inv` should be a short Chinese label such as a person, group, dynasty workshop, or '工匠'/'匠人'/'先民'. Do not invent very specific names unless the input strongly supports them.
5. `sig` should be a concise Chinese summary of historical significance, usually 12-30 Chinese characters.
6. If evidence is weak, prefer conservative wording rather than fabricated detail.
7. Do not include markdown, explanations, or any extra keys.

Example:
{{"name":"活字印刷","en":"Movable Type","cat":"culture","inv":"毕昇","sig":"推动书籍复制效率跃升，开启印刷技术新阶段"}}"""


def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_categories():
    categories = load_json(CATEGORIES_FILE)
    codes = [item["code"] for item in categories]
    descs = [f"- {item['code']}: {item['name']}，{item['desc']}" for item in categories]
    return codes, "\n".join(descs)


def is_missing(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, list):
        return len(value) == 0
    return False


def needs_metadata(entry: dict) -> bool:
    return any(is_missing(entry.get(field)) for field in ["id", "en", "cat", "inv", "sig"])


def normalize_text(value: str) -> str:
    value = re.sub(r"\s+", " ", value or "").strip()
    value = value.replace('"', "'")
    return value


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text


def build_id(name: str, en: str, used_ids: set[str], current_id: str | None = None) -> str:
    candidates = []

    if en:
        candidates.append(slugify(en))

    if name:
        pinyin_name = "_".join(lazy_pinyin(name))
        candidates.append(slugify(pinyin_name))

    candidates.extend(["node", "node_item"])

    for base in candidates:
        if not base:
            continue
        if current_id == base or base not in used_ids:
            return base

    base = candidates[0] if candidates and candidates[0] else "node"
    suffix = 2
    while f"{base}_{suffix}" in used_ids:
        suffix += 1
    return f"{base}_{suffix}"


def build_user_prompt(entry: dict) -> str:
    payload = {
        "name": entry.get("name"),
        "year": entry.get("year"),
        "era": entry.get("era"),
        "desc": entry.get("desc"),
        "wiki_url": entry.get("wiki_url"),
    }
    return "Process the following node:\n\n" + json.dumps(payload, ensure_ascii=False, indent=2)


def parse_json_object(text: str) -> dict:
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("模型返回中未找到 JSON 对象")
    return json.loads(match.group())


def classify_single(client: openai.OpenAI, system_prompt: str, entry: dict) -> dict:
    user_prompt = build_user_prompt(entry)

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_tokens=400,
    )

    model_reply = response.choices[0].message.content.strip()
    parsed = parse_json_object(model_reply)

    return {
        "name": normalize_text(parsed.get("name", "")),
        "en": normalize_text(parsed.get("en", "")),
        "cat": normalize_text(parsed.get("cat", "")),
        "inv": normalize_text(parsed.get("inv", "")),
        "sig": normalize_text(parsed.get("sig", "")),
    }


def complete_metadata(input_file: Path, output_file: Path, limit: int | None = None):
    if not API_KEY:
        raise RuntimeError("未设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY")

    category_codes, category_descs = load_categories()
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        category_codes=", ".join(category_codes),
        category_descs=category_descs,
    )

    client = openai.OpenAI(api_key=API_KEY, base_url=BASE_URL)
    data = load_json(input_file)
    used_ids = {entry["id"] for entry in data if not is_missing(entry.get("id"))}

    pending_indexes = [idx for idx, entry in enumerate(data) if needs_metadata(entry)]
    if limit is not None:
        pending_indexes = pending_indexes[:limit]

    print(f"加载了 {len(data)} 条记录")
    print(f"待补全元数据 {len(pending_indexes)} 条")

    for seq, idx in enumerate(tqdm(pending_indexes), start=1):
        entry = data[idx]

        try:
            result = classify_single(client, system_prompt, entry)
        except Exception as exc:
            print(f"API调用失败: {entry.get('name')} -> {exc}")
            continue

        if result["name"] and result["name"] != entry.get("name"):
            print(f"名称不匹配，跳过: {entry.get('name')} -> {result['name']}")
            continue

        if result["cat"] not in category_codes:
            print(f"分类非法，跳过: {entry.get('name')} -> {result['cat']}")
            continue

        entry["en"] = result["en"] or entry.get("en")
        entry["cat"] = result["cat"] or entry.get("cat")
        entry["inv"] = result["inv"] or entry.get("inv")
        entry["sig"] = result["sig"] or entry.get("sig")

        old_id = entry.get("id")
        if is_missing(old_id):
            new_id = build_id(entry.get("name", ""), entry.get("en", ""), used_ids)
            entry["id"] = new_id
            used_ids.add(new_id)
        else:
            used_ids.add(old_id)

        if seq % SAVE_EVERY_N_ITEMS == 0:
            save_json(output_file, data)
            print(f"已保存进度到 {output_file}")

        time.sleep(REQUEST_INTERVAL_SECONDS)

    save_json(output_file, data)
    print(f"最终结果已保存到 {output_file}")


def parse_args():
    parser = argparse.ArgumentParser(description="使用 LLM 补全节点元数据")
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_INPUT_FILE,
        help=f"输入 JSON 文件，默认 {DEFAULT_INPUT_FILE}",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_FILE,
        help=f"输出 JSON 文件，默认 {DEFAULT_OUTPUT_FILE}",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="仅处理前 N 条待补全记录，便于抽样测试",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    complete_metadata(args.input, args.output, args.limit)


if __name__ == "__main__":
    main()