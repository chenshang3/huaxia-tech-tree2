#!/usr/bin/env python3
import json
import os
import re
import subprocess
from urllib.parse import urlparse, unquote, parse_qs
import time

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

def sanitize_filename(name):
    invalid_chars = r'[<>:"/\\|?*]'
    name = re.sub(invalid_chars, "_", name)
    return name[:50]

def fetch_page_html(url):
    try:
        result = subprocess.run(
            ["curl", "-sL", "--max-time", "15", url],
            capture_output=True
        )
        if result.returncode == 0 and result.stdout:
            return result.stdout.decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"  获取页面失败: {e}")
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
            
            src_lower = src.lower()
            
            # 排除小图标
            width_match = re.search(r'(\d+)px-', src)
            if width_match:
                width = int(width_match.group(1))
                if width < 150:
                    continue
            
            # 排除维基百科系统图标
            exclude_patterns = [
                "disambig", "ambox", "icon", "logo", "flag", 
                "button", "arrow", "wikibooks", "wikiquote", 
                "wikisource", "wikiversity", "commons-logo", 
                "tango", "symbol", "wiki-project"
            ]
            if any(p in src_lower for p in exclude_patterns):
                continue
            
            full_url = "https:" + src if src.startswith("//") else src
            all_images.append(full_url)
    
    if not all_images:
        return []
    
    # 优先选择 jpg/png 格式的大图
    jpg_png = [img for img in all_images if img.endswith(('.jpg', '.jpeg', '.png'))]
    if jpg_png:
        return [jpg_png[0]]
    
    return [all_images[0]]

def download_image(url, save_path):
    try:
        result = subprocess.run(
            ["curl", "-s", "--max-time", "30", "-o", save_path, url],
            capture_output=True, text=True
        )
        if result.returncode == 0 and os.path.exists(save_path):
            size = os.path.getsize(save_path)
            if size > 1000:
                return True
            else:
                os.remove(save_path)
    except Exception as e:
        pass
    return False

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, "output")
    json_path = os.path.join(output_dir, "final_nodes.json")
    images_dir = os.path.join(output_dir, "images")
    mapping_path = os.path.join(output_dir, "image_mapping.json")
    
    os.makedirs(images_dir, exist_ok=True)
    
    with open(json_path, "r", encoding="utf-8") as f:
        entries = json.load(f)
    
    print(f"共 {len(entries)} 条记录")
    
    mapping = {}
    success_count = 0
    fail_count = 0
    
    for i, entry in enumerate(entries):
        entry_id = entry.get("id", str(i + 1))
        name = entry.get("name", "")
        wiki_url = entry.get("wiki_url", "")
        
        print(f"[{i+1}/{len(entries)}] 处理: {name}")
        
        title = get_title_from_url(wiki_url)
        if not title:
            print(f"  无法提取标题，跳过")
            fail_count += 1
            mapping[entry_id] = {"name": name, "image": None}
            continue
        
        html = fetch_page_html(wiki_url)
        if not html:
            print(f"  无法获取页面")
            fail_count += 1
            mapping[entry_id] = {"name": name, "image": None}
            continue
        
        images = extract_images(html)
        if not images:
            print(f"  无可用图片")
            fail_count += 1
            mapping[entry_id] = {"name": name, "image": None}
            continue
        
        image_url = images[0]
        
        ext = os.path.splitext(urlparse(image_url).path)[1]
        if not ext or ext not in ['.jpg', '.jpeg', '.png', '.gif']:
            ext = ".jpg"
        
        filename = f"{sanitize_filename(name)}{ext}"
        save_path = os.path.join(images_dir, filename)
        
        if download_image(image_url, save_path):
            print(f"  保存: {filename}")
            mapping[entry_id] = {"name": name, "image": filename}
            success_count += 1
        else:
            print(f"  下载失败")
            fail_count += 1
            mapping[entry_id] = {"name": name, "image": None}
        
        # 每条都保存映射
        with open(mapping_path, "w", encoding="utf-8") as f:
            json.dump(mapping, f, ensure_ascii=False, indent=2)
        
        time.sleep(0.3)
    
    with open(mapping_path, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
    
    print(f"\n完成! 成功: {success_count}, 失败: {fail_count}")
    print(f"图片目录: {images_dir}")
    print(f"映射文件: {mapping_path}")

if __name__ == "__main__":
    main()
