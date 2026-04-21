#!/usr/bin/env python3
"""
使用 LLM 为节点补全中文维基百科链接 `wiki_url`。

默认输入/输出:
  scripts/output/final_nodes_examined_1.json

特点:
  1. 仅处理缺失 `wiki_url` 的条目，便于断点续跑。
  2. 每 N 条自动保存一次。
  3. 强约束返回 `https://zh.wikipedia.org/wiki/...` 格式链接。
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
from pathlib import Path

import openai
from tqdm import tqdm


SCRIPT_DIR = Path(__file__).parent
DEFAULT_INPUT_FILE = SCRIPT_DIR / "output" / "final_nodes_examined_1.json"
DEFAULT_OUTPUT_FILE = SCRIPT_DIR / "output" / "final_nodes_examined_1.json"

BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com")
API_KEY = os.getenv("OPENAI_API_KEY") or "sk-36e7e3720a8643c8a55a72f85801241e"
MODEL = os.getenv("LLM_MODEL", "deepseek-chat")
SAVE_EVERY_N_ITEMS = 10
REQUEST_INTERVAL_SECONDS = float(os.getenv("LLM_REQUEST_INTERVAL", "1.0"))

ZH_WIKI_PREFIX = "https://zh.wikipedia.org/wiki/"

SYSTEM_PROMPT = """You are a precise metadata assistant specializing in Chinese historical inventions.
Your task is to determine the most appropriate Chinese Wikipedia page URL for one node.

You must output only one valid JSON object with exactly these keys:
- name: string
- wiki_url: string

Rules:
1. Return a full URL from Chinese Wikipedia only, and it must start with https://zh.wikipedia.org/wiki/
2. Prefer the page directly about the invention, artifact, technology, or structure itself.
3. If there is no exact invention page but there is a clearly corresponding Chinese Wikipedia page, return that best matching page.
4. Do not return English Wikipedia, mobile links, anchors, search links, or any non-Wikipedia domain.
5. If you are genuinely unsure that a suitable Chinese Wikipedia page exists, return an empty string for wiki_url.
6. Keep the `name` identical to the input name.
7. Output JSON only, with no markdown or explanation.

Example:
{"name":"赵州桥","wiki_url":"https://zh.wikipedia.org/wiki/赵州桥"}"""


def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def is_missing(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def needs_wiki_url(entry: dict, overwrite: bool = False) -> bool:
    if overwrite:
        return True
    return is_missing(entry.get("wiki_url"))


def build_user_prompt(entry: dict) -> str:
    payload = {
        "name": entry.get("name"),
        "en": entry.get("en"),
        "year": entry.get("year"),
        "desc": entry.get("desc"),
        "sig": entry.get("sig"),
    }
    return "Process the following node:\n\n" + json.dumps(payload, ensure_ascii=False, indent=2)


def parse_json_object(text: str) -> dict:
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("模型返回中未找到 JSON 对象")
    return json.loads(match.group())


def normalize_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if url.startswith("http://zh.wikipedia.org/wiki/"):
        url = "https://" + url[len("http://"):]
    return url


def is_valid_zh_wiki_url(url: str) -> bool:
    return url.startswith(ZH_WIKI_PREFIX)


def classify_single(client: openai.OpenAI, entry: dict) -> dict:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(entry)},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=200,
    )

    model_reply = response.choices[0].message.content.strip()
    parsed = parse_json_object(model_reply)
    return {
        "name": (parsed.get("name") or "").strip(),
        "wiki_url": normalize_url(parsed.get("wiki_url", "")),
    }


def complete_wiki_urls(input_file: Path, output_file: Path, limit: int | None = None, overwrite: bool = False):
    if not API_KEY:
        raise RuntimeError("未设置 OPENAI_API_KEY")

    client = openai.OpenAI(api_key=API_KEY, base_url=BASE_URL)
    data = load_json(input_file)

    pending_indexes = [idx for idx, entry in enumerate(data) if needs_wiki_url(entry, overwrite=overwrite)]
    if limit is not None:
        pending_indexes = pending_indexes[:limit]

    print(f"加载了 {len(data)} 条记录")
    print(f"待补全 wiki_url {len(pending_indexes)} 条")

    for seq, idx in enumerate(tqdm(pending_indexes), start=1):
        entry = data[idx]

        try:
            result = classify_single(client, entry)
        except Exception as exc:
            print(f"API调用失败: {entry.get('name')} -> {exc}")
            continue

        if result["name"] and result["name"] != entry.get("name"):
            print(f"名称不匹配，跳过: {entry.get('name')} -> {result['name']}")
            continue

        wiki_url = result["wiki_url"]
        if wiki_url and not is_valid_zh_wiki_url(wiki_url):
            print(f"链接非法，跳过: {entry.get('name')} -> {wiki_url}")
            continue

        entry["wiki_url"] = wiki_url

        if seq % SAVE_EVERY_N_ITEMS == 0:
            save_json(output_file, data)
            print(f"已保存进度到 {output_file}")

        time.sleep(REQUEST_INTERVAL_SECONDS)

    save_json(output_file, data)
    print(f"最终结果已保存到 {output_file}")


def parse_args():
    parser = argparse.ArgumentParser(description="使用 LLM 补全节点中文维基百科链接")
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
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="强制重写已有 wiki_url",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    complete_wiki_urls(args.input, args.output, args.limit, args.overwrite)


if __name__ == "__main__":
    main()
