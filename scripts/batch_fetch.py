#!/usr/bin/env python3
import json
import os
import re
import subprocess
from urllib.parse import urlparse, unquote, parse_qs
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(SCRIPT_DIR, "output", "images")
NODES_FILE = os.path.join(SCRIPT_DIR, "final_nodes_finals.json")
MAPPING_FILE = os.path.join(SCRIPT_DIR, "output", "image_mapping.json")

def get_title_from_url(url):
    if not url:
        return None
    parsed = urlparse(url)
    query = parsed.query
    if query:
        params = parse_qs(query)
        if "title" in params:
            return params["title"][0]
    path = parsed.path
    parts = path.split("/")
    if parts:
        return unquote(parts[-1])
    return None

def fetch_page_html(url):
    try:
        result = subprocess.run(["curl", "-sL", "--max-time", "15", url], capture_output=True)
        if result.returncode == 0 and result.stdout:
            return result.stdout.decode('utf-8', errors='ignore')
    except:
        pass
    return None

def extract_images(html):
    if not html:
        return []
    
    all_images = []
    for line in html.split('\n'):
        if 'upload.wikimedia.org' not in line:
            continue
        matches = re.findall(r'src="([^"]+)"', line)
        for src in matches:
            if 'upload.wikimedia.org' not in src:
                continue
            if not src.endswith(('.jpg', '.jpeg', '.png', '.gif', '.svg')):
                continue
            width_match = re.search(r'(\d+)px-', src)
            if width_match:
                width = int(width_match.group(1))
                if width < 150:
                    continue
            exclude_patterns = ["disambig", "ambox", "logo", "icon", "flag", "button", "arrow", "wikibooks", "wikiquote", "wikisource", "wikiversity", "commons-logo", "tango"]
            if any(p in src.lower() for p in exclude_patterns):
                continue
            full_url = "https:" + src if src.startswith("//") else src
            all_images.append(full_url)
    
    if not all_images:
        return []
    jpg_png = [img for img in all_images if img.endswith(('.jpg', '.jpeg', '.png'))]
    return [jpg_png[0]] if jpg_png else [all_images[0]]

def download_image(url, save_path):
    try:
        result = subprocess.run(["curl", "-s", "--max-time", "30", "-o", save_path, url], capture_output=True)
        if result.returncode == 0 and os.path.exists(save_path):
            size = os.path.getsize(save_path)
            if size > 1000:
                return True
            else:
                os.remove(save_path)
    except:
        pass
    return False

def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)
    
    with open(NODES_FILE, 'r', encoding='utf-8') as f:
        nodes = json.load(f)
    
    existing = {}
    if os.path.exists(MAPPING_FILE):
        with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    
    matched_ids = {node_id for node_id, info in existing.items() if info.get("image")}
    print(f"总节点数: {len(nodes)}")
    print(f"已匹配图片: {len(matched_ids)}")
    print()
    
    success = 0
    fail = 0
    
    for i, node in enumerate(nodes):
        node_id = node.get("id", "")
        if not node_id:
            continue
        
        if node_id in matched_ids:
            continue
        
        name = node.get("name", "")
        wiki_url = node.get("wiki_url", "")
        
        print(f"[{i+1}] 爬取: {name} ({node_id})")
        
        if not wiki_url or 'redlink=1' in wiki_url:
            print(f"  -> 无 Wikipedia 链接")
            existing[node_id] = {"name": name, "image": None}
            fail += 1
            continue
        
        html = fetch_page_html(wiki_url)
        if not html or len(html) < 1000:
            print(f"  -> 获取页面失败")
            existing[node_id] = {"name": name, "image": None}
            fail += 1
            continue
        
        images = extract_images(html)
        if not images:
            print(f"  -> 无可用图片")
            existing[node_id] = {"name": name, "image": None}
            fail += 1
            continue
        
        image_url = images[0]
        ext = os.path.splitext(image_url.split('?')[0])[1] or ".jpg"
        if ext not in ['.jpg', '.jpeg', '.png', '.gif']:
            ext = ".jpg"
        
        filename = f"{node_id}{ext}"
        save_path = os.path.join(IMAGES_DIR, filename)
        
        if download_image(image_url, save_path):
            print(f"  -> 保存: {filename}")
            existing[node_id] = {"name": name, "image": filename}
            success += 1
        else:
            print(f"  -> 下载失败")
            existing[node_id] = {"name": name, "image": None}
            fail += 1
        
        with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
        
        time.sleep(0.3)
    
    with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    
    print(f"\n完成! 成功: {success}, 失败: {fail}")
    print(f"图片目录: {IMAGES_DIR}")
    print(f"映射文件: {MAPPING_FILE}")

if __name__ == "__main__":
    main()