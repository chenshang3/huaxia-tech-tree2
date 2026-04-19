#!/usr/bin/env python3
"""
parse_wiki.py — 解析维基百科 HTML，提取结构化发明数据
- 从中文版提取: name, desc, wiki_category, wiki_url
- 从英文版提取: en_name (英文名称)
- 正则提取: era (朝代), year (年份), inv (发明者)
- 分类映射: wiki_category → project category
- 自动生成: id (拼音转写)
输出: output/wiki_parsed.json
"""

import json
import re
import os
from pathlib import Path
from bs4 import BeautifulSoup
from pypinyin import pinyin, Style

OUTPUT_DIR = Path(__file__).parent / "output"
SCRIPTS_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPTS_DIR.parent

# ── 分类映射表 ──
WIKI_TO_PROJECT_CAT = {
    "农业": "agriculture",
    "军事": "military",
    "武器": "military",
    "兵器": "military",
    "造纸": "culture",
    "印刷": "culture",
    "文化": "culture",
    "文字": "culture",
    "文学": "culture",
    "天文": "science",
    "科学": "science",
    "数学": "math",
    "医学": "medicine",
    "医药": "medicine",
    "工程": "engineering",
    "建筑": "engineering",
    "冶金": "metallurgy",
    "冶金术": "metallurgy",
    "金属": "metallurgy",
    "纺织": "textile",
    "丝绸": "textile",
    "贸易": "trade",
    "商业": "trade",
    "工艺": "craft",
    "手工业": "craft",
    "航海": "navigation",
    "导航": "navigation",
    "陶瓷": "craft",
    "瓷器": "craft",
    "农业技术": "agriculture",
    "农具": "agriculture",
    "农业工具": "agriculture",
    "食品": "craft",
    "饮食": "craft",
    "酿造": "craft",
    "交通": "engineering",
    "运输": "engineering",
    "通讯": "culture",
    "通信": "culture",
}

# ── 朝代到年份的映射（近似值） ──
ERA_TO_YEAR = {
    "上古": -3000,
    "新石器": -6000,
    "夏朝": -2000,
    "夏": -2000,
    "商朝": -1500,
    "商": -1500,
    "西周": -1000,
    "春秋": -700,
    "战国": -400,
    "秦朝": -220,
    "秦": -220,
    "汉朝": -100,
    "汉": -100,
    "西汉": -100,
    "东汉": 100,
    "三国": 220,
    "魏晋": 265,
    "南北朝": 420,
    "隋朝": 581,
    "隋": 581,
    "唐朝": 618,
    "唐": 618,
    "五代": 907,
    "宋朝": 960,
    "宋": 960,
    "北宋": 960,
    "南宋": 1127,
    "元朝": 1271,
    "元": 1271,
    "明朝": 1368,
    "明": 1368,
    "清朝": 1644,
    "清": 1644,
    "近代": 1840,
    "现代": 1912,
    "当代": 1949,
}

# ── 正则模式 ──
ERA_PATTERN = re.compile(
    r'(新石器|上古|夏[朝]?|商[朝]?|西周|东周|春秋|战国|秦[朝]?|西汉|东汉|汉朝?|三国|魏晋|南北朝|隋[朝]?|唐[朝]?|五代|北宋|南宋|宋朝?|元[朝]?|明[朝]?|清[朝]?|近代|现代|当代)'
)

YEAR_PATTERN = re.compile(
    r'(?:公元前|前|约公元前|约前)\s*(\d+)[\s年]*|'
    r'(\d+)\s*(?:BC|BCE|bc|bce)|'
    r'(?:公元|后|约公元|约)\s*(\d+)[\s年]*|'
    r'(\d+)\s*(?:AD|CE|ad|ce)|'
    r'(\d{4,})\s*年'
)

INV_PATTERN = re.compile(
    r'(?:相传|由)\s*([^\s，,。；;]{2,4})(?:发明|创制|所)|'
    r'(?:发明|创制)\s*(?:者|的)?\s*([^\s，,。；;]{2,4})|'
    r'([^\s，,。；;]{2,4})(?:发明|创制)'
)

SKIP_CATEGORIES = {
    "注释", "参考文献", "外部链接", "参见", "参考资料",
    "延伸阅读", "相关条目", "注释与参考", "外部链接",
    "参见条目", "参考", "来源", "注释",
}

INVALID_NAME_PATTERNS = [
    r'^ISBN[\s\-]?\d',  
    r'^\d{3,}$',        
    r'^[A-Za-z]{2,}\d', 
    r'^\d+\.\d+$',
    r'^\[[\d]+\]$',     
]

COUNTRIES = {
    "英国", "法国", "德国", "美国", "日本", "俄国", "俄罗斯",
    "加拿大", "澳大利亚", "巴西", "印度", "韩国", "朝鲜",
    "意大利", "西班牙", "荷兰", "瑞士", "瑞典", "波兰",
    "墨西哥", "阿根廷", "埃及", "伊朗", "土耳其", "沙特",
    "新加坡", "马来西亚", "泰国", "越南", "菲律宾", "印尼",
    "新西兰", "爱尔兰", "奥地利", "比利时", "丹麦", "挪威",
    "芬兰", "希腊", "葡萄牙", "捷克", "匈牙利", "罗马尼亚",
    "澳洲", "阿塞拜疆", "英格兰", "苏格兰", "塞尔维亚", "南非",
    "台湾", "以色列", "朝鲜半岛", "巴基斯坦", "克罗地亚",
    "美国", "德国", "法国", "意大利", "日本", "朝鲜", "韩国",
    "印度", "俄罗斯", "保加利亚", "威尔士", "波多黎各",
}

INVALID_NAMES = {
    "科学", "历史", "化学", "宇宙", "多重", "发现", "发明",
    "科学发现", "中国发现", "中国科学史", "中国一百发明",
    "印度河文明", "东罗马帝国", "伊斯兰世界", "美洲原住民",
    "世界", "非洲人", "非裔",
    "1890年前", "1890年－1945年", "1946年－1991年", "1991年后",
    "中国", "美国", "技术", "四大发明",
    "类比数位", "多重发现",
    "中华人民共和国", "当代", "现代",
    "为什么", "什么是", "为何",
    "论文", "研究", "理论", "假说",
    "导弹", "电子烟", "磁悬浮", "智轨", "云巴",
    "航天", "核武器", "卫星", "杂交水稻", "青蒿素",
    "胰岛素", "牛黄",
    "中国发明列表", "中国史前发明列表",
    "技术发明", "科学发现",
    "农业", "蚕业", "丝织业", "建筑", "园林", "桥梁",
    "天文学", "历法", "制图", "陶瓷", "铸币", "地理学",
    "算术", "度量衡", "中医学", "中药", "冶金", "军事",
    "印刷", "交通", "水军", "水路交通",
    # 人物
    "司马迁", "扁鹊", "李善兰", "徐光启", "唐慎微", "三上义夫",
    # 史书/古籍
    "资治通鉴", "汉书", "金史", "春秋", "左传", "诗经", "淮南子", 
    "古今图书集成", "明通鉴",
    # 天文
    "超新星", "木星", "天蝎座", "乌鸦座", "荧惑",
    # 其他
    "周朝", "围棋", "几何原本", "1949", "生肖", "六博",
    "兵家理论书", "经济地图",
    # 新增过滤
    "天再旦", "以颜色对应方位", "农历记年365.2425日",
    "仲康日食", "最古老的印刷星图", "渔线轮",
    "捶丸", "八阶标准等级的建筑模组系统",
    "带木俑的人造山自动侍酒器",
    "考古学、目录学和金石学", "法医昆虫学", "弧矢仪",
    "八股文", "爆炸炮弹", "中式骨牌", "铁索吊桥",
    "铸铁炸弹", "多节火箭",
    "使用风箱、芥末烟雾、和石灰进行化学战",
    "通过适当食疗矫正营养缺乏病症", "以天然气作为燃料",
    "胸式马带", "以甲状腺激素来治疗甲状腺肿",
    "糖尿病病征鉴别与治疗", "天花接种疗法",
    # 继续过滤现代内容
    "1949", "现在", "磁悬浮",
    "1949–现在", "磁悬浮风力发电机",
    # 清洗新增
    "伤寒杂病论", "张衡", "沈括",
    # 2026-04-19 清洗
    "从体与用看中国古代科学", "试论中国古代科学的社会、文化史研究",
    "中国古代科学的\"诗性\"与\"礼性\"", "中国科技发展的历史分析",
    "为什么Mr．Science中文叫\"科学\"", "席文（Nathan Sivin）对科学革命及中国科学史研究的见解",
    "日本的中国科学史研究", "中国科学院自然科学史研究所",
    "中国科学技术史学会", "中国科学技术协会",
    "技术主题", "历史主题", "中华人民共和国科学技术史",
    "华北原始土地耕作方式：科学、训诂互证示例", "中国农业的本土起源",
    "中国农业的本土起源(续)", "中国沿海地区的农业起源",
    "关于中国古代稻作文化的考古学调查研究", "稻作农业在传统中国文化中的地位",
    "中国古代农业的发展历程", "中国古代农业的发展历程(下)",
    "科学、技艺、技术：中国农业从物质到知识的穿越",
    "历史上农地经营方式的选择", "中国历史上的粮食单位面积产量",
    "美洲作物的引进、传播及其对中国粮食生产的影响",
    "美洲作物的引进、传播及其对中国粮食生产的影响(二)",
    "美洲作物的引进、传播及其对中国粮食生产的影响(三)",
    "中华人民共和国主题", "中国农业科技史年表",
    "1949–1976年中国工资改革",
    # 地名
    "广东", "江苏", "山东", "香港", "澳门", "西藏", "中原",
}

END_WITH_SKIP = frozenset(["经", "论", "说", "记"])


NAME_KEYWORDS_SKIP = ["中国", "史", "为什么", "见解", "主题", "示例", "史研究", "农业科技"]

def is_valid_name(name: str) -> bool:
    """过滤无效名称"""
    if not name or len(name) < 2:
        return False

    for pattern in INVALID_NAME_PATTERNS:
        if re.match(pattern, name):
            return False

    if name in COUNTRIES:
        return False

    if name in INVALID_NAMES:
        return False

    if name.startswith("ISBN") or name.startswith("ISBN-"):
        return False

    if name.endswith("经") or name.endswith("论") or name.endswith("说") or name.endswith("记"):
        if name not in SINGLE_PAGE_YEARS:
            return False

    if name in ["中国战争列表", "战争", "王恭厂大爆炸"]:
        return False

    for kw in NAME_KEYWORDS_SKIP:
        if kw in name:
            return False

    return True


def to_pinyin_id(name: str, used_ids: set = None) -> str:
    """中文名称转拼音 ID"""
    py = pinyin(name, style=Style.NORMAL)
    flat = "".join([p[0] for p in py])
    flat = re.sub(r'[^a-zA-Z]', '', flat).lower()
    if not flat:
        flat = "unknown"
    if used_ids is not None and flat in used_ids:
        for i in range(1, 100):
            candidate = f"{flat}{i}"
            if candidate not in used_ids:
                flat = candidate
                break
    return flat


def parse_era_and_year(text: str) -> tuple:
    """从文本中提取朝代和年份"""
    era_match = ERA_PATTERN.search(text)
    era = era_match.group(1) if era_match else None

    year = None
    year_match = YEAR_PATTERN.search(text)
    if year_match:
        groups = year_match.groups()
        if groups[0]:
            year = -int(groups[0])
        elif groups[1]:
            year = -int(groups[1])
        elif groups[2]:
            year = int(groups[2])
        elif groups[3]:
            year = int(groups[3])
        elif groups[4]:
            year = int(groups[4])

    return era, year


def parse_inv(text: str) -> str:
    """从文本中提取发明者"""
    inv_match = INV_PATTERN.search(text)
    if inv_match:
        inv = inv_match.group(1) or inv_match.group(2)
        if inv and 2 <= len(inv) <= 4:
            if re.match(r'^[\u4e00-\u9fa5]+$', inv):
                return inv.strip()
    return None


def map_category(wiki_cat: str) -> str:
    """维基百科分类映射到项目分类"""
    for key, val in WIKI_TO_PROJECT_CAT.items():
        if key in wiki_cat:
            return val
    return "craft"


ERA_FROM_H2 = {
    "四大发明": "四大发明",
    "史前": "史前",
    "先秦": "先秦",
    "秦汉": "秦汉",
    "秦": "秦汉",
    "三国": "三国",
    "晉南北朝": "晋南北朝",
    "晋": "晋南北朝",
    "南北朝": "晋南北朝",
    "隋唐": "隋唐",
    "隋": "隋唐",
    "唐": "隋唐",
    "宋元": "宋元",
    "宋": "宋元",
    "元": "宋元",
    "明清至近代": "明清",
    "明清": "明清",
    "近代": "近代",
    "当代": "当代",
}


YEAR_CUTOFF = 2000

SINGLE_PAGE_YEARS = {
    # 原有核心条目
    "曲辕犁": 879,
    "直辕犁": -100,
    "筒车": 605,
    "都江堰": -256,
    "坎儿井": -100,
    "地动仪": 132,
    "浑天仪": -52,
    "水运仪象台": 1092,
    "指南车": 235,
    "弩机": -300,
    "木牛流马": 228,
    "滑轮": -100,
    "链条传动": 1088,
    "齿轮传动": -100,
    "水力磨坊": 31,
    "风力磨坊": 1200,
    # 扩展条目 - 农业与水利
    "轮作": -500,
    "龙骨水车": 150,
    "风车": 1200,
    "梯田": -500,
    "水排": 31,
    # 扩展条目 - 机械工程
    "水磨": 31,
    "木结构": -2000,
    # 扩展条目 - 建筑
    "城墙": -2000,
    "苏州园林": 1500,
    "风水": -500,
    # 扩展条目 - 冶金化学
    "火药": 850,
    "硫磺": 850,
    "天然气": -200,
    "青铜器": -2000,
    "铁器": -500,
    "生铁": -300,
    "炒钢": -100,
    "瓷器": 600,
    "釉料": 500,
    "漆器": -3000,
    "墨": -300,
    # 扩展条目 - 纺织
    "丝绸": -3000,
    "缫丝机": -2700,
    "提花机": 1200,
    "印染": -200,
    "扎染": -200,
    # 扩展条目 - 航海交通
    "指南针": 200,
    "罗盘": 200,
    "舵": -100,
    "水密隔舱": 800,
    "楼船": -200,
    "驿站": -100,
    # 扩展条目 - 军事
    "火箭": 1000,
    "火铳": 1250,
    "投石机": -400,
    # 扩展条目 - 信息传播
    "造纸术": 105,
    "雕版印刷": 600,
    "活字印刷": 1040,
    "纸币": 1024,
    "科举": 600,
    # 扩展条目 - 数学
    "算筹": -3000,
    "算盘": 1500,
    "九章算术": -100,
    "负数": -100,
    "开方算法": -100,
    # 扩展条目 - 天文
    "干支": -3000,
    "二十四节气": -500,
    "太初历": -104,
    "授时历": 1280,
    "日晷": -2000,
    "漏刻": -100,
    "星图": -200,
    # 扩展条目 - 医学
    "针灸": -2000,
    "经络": -2000,
    "麻沸散": 200,
    "伤寒杂病论": 200,
    "本草纲目": 1578,
    "切脉": -500,
    # 扩展条目 - 日常生活
    "酿酒": -6000,
    "豆腐": -1500,
    "酱油": 500,
    "火锅": 1000,
    "石磨": -500,
    # 扩展条目 - 文化娱乐
    "园林": 1500,
    "象棋": -200,
    "围棋": -2500,
    "皮影": 1000,
    "风筝": -1000,
    "爆竹": 1000,
    "灯笼": -500,
    # ===== 补充未收录条目 =====
    # 农业与水利
    "耧车": -100,
    "秧马": -200,
    "深耕": -500,
    "绿肥": -500,
    "精耕细作": -200,
    "翻车": 150,
    "脚踏水车": -100,
    "牛转翻车": -100,
    # 机械
    "独轮车": -100,
    # 建筑
    "赵州桥": 605,
    "拱桥": -500,
    "榫卯": -3000,
    "斗拱": -500,
    "宫殿": -2000,
    "四合院": -500,
    "万里长城": -215,
    "京杭大运河": 605,
    "栈道": -500,
    "石板路": -500,
    # 冶金
    "青铜": -2000,
    "天然气": -200,
    "生铁": -300,
    # 纺织
    "织机": -500,
    "棉纺": 1300,
    # 航海
    "福船": -200,
    "沙船": -200,
    "车船": 1100,
    # 军事
    "火炮": 1250,
    "虎蹲炮": 1500,
    "战车": -400,
    # 信息
    "书法": -1500,
    "篆刻": -2000,
    "纸币": 1024,
    # 数学
    "十进位制": -3000,
    "割圆术": 263,
    # 天文
    "太初历": -104,
    "授时历": 1280,
    # 医学
    "经络": -2000,
    "麻沸散": 200,
    "伤寒杂病论": 200,
    "切脉": -500,
    # 日常生活
    "油灯": -500,
    "火折子": 400,
    "酿酒": -6000,
    # 文化
    "铜镜": -3000,
    "玉器": -4000,
}


def parse_zh_wiki(html: str) -> list:
    """解析中文维基百科页面"""
    soup = BeautifulSoup(html, "lxml")
    content = soup.find("div", {"class": "mw-parser-output"})
    if not content:
        print("  警告: 未找到 mw-parser-output 区域")
        return []

    entries = []

    # 首先尝试解析 dl 元素
    for element in content.find_all("dl"):
        dt = element.find("dt")
        dd = element.find("dd")
        if not dt:
            continue

        a_tag = dt.find("a")
        name = a_tag.get_text().strip() if a_tag else dt.get_text().strip()
        if not name or not is_valid_name(name):
            continue

        raw_desc = dd.get_text().strip() if dd else ""
        wiki_link = a_tag["href"] if a_tag and a_tag.get("href") else ""

        _, year = parse_era_and_year(raw_desc)

        # 允许年份为空，后续可人工补充

        # 只过滤年份超过 2000 的条目
        if year is not None and year > YEAR_CUTOFF:
            continue

        entries.append({
            "name": name,
            "year": year,
            "desc": raw_desc,
            "wiki_url": f"https://zh.wikipedia.org{wiki_link}" if wiki_link.startswith("/") else "",
        })

    # 始终同时解析 li 元素（增加覆盖率，不要依赖 dl 数量）
    for element in content.find_all("li"):
            a_tag = element.find("a")
            if not a_tag:
                continue
            
            name = a_tag.get_text().strip()
            if not name or not is_valid_name(name):
                continue
            
            raw_desc = element.get_text().strip()
            if raw_desc.startswith(name):
                raw_desc = raw_desc[len(name):].strip()
            
            wiki_link = a_tag.get("href", "")
            
            _, year = parse_era_and_year(raw_desc)

            # 允许年份为空，后续可人工补充

            # 只过滤年份超过 2000 的条目
            if year is not None and year > YEAR_CUTOFF:
                continue

            entries.append({
                "name": name,
                "year": year,
                "desc": raw_desc,
                "wiki_url": f"https://zh.wikipedia.org{wiki_link}" if wiki_link.startswith("/") else "",
            })

    return entries


def parse_en_wiki(html: str) -> dict:
    """解析英文维基百科页面，提取英文名称映射"""
    soup = BeautifulSoup(html, "lxml")
    content = soup.find("div", {"class": "mw-parser-output"})
    if not content:
        return {}

    en_map = {}
    current_category = "通用"

    for element in content.find_all(["h2", "h3", "h4", "li"]):
        if element.name in ("h2", "h3", "h4"):
            cat_text = element.get_text().strip()
            cat_text = re.sub(r'\[edit\]|\[编辑\]', '', cat_text).strip()
            if cat_text not in SKIP_CATEGORIES and cat_text:
                current_category = cat_text
            continue

        if element.name == "li":
            b_tag = element.find("b")
            name_tag = element.find("a")

            if b_tag:
                en_name = b_tag.get_text().strip()
            elif name_tag and name_tag.get_text().strip():
                en_name = name_tag.get_text().strip()
            else:
                continue

            if en_name and len(en_name) >= 2:
                en_map[en_name.lower()] = en_name

    return en_map


def merge_en_names(zh_entries: list, en_map: dict) -> list:
    """尝试将英文名称匹配到中文条目"""
    for entry in zh_entries:
        name_lower = entry["name"].lower()
        if name_lower in en_map:
            entry["en"] = en_map[name_lower]
            continue

        for en_key, en_val in en_map.items():
            if en_key.startswith(name_lower[:3]) or name_lower.startswith(en_key[:3]):
                entry["en"] = en_val
                break

    return zh_entries


def deduplicate_entries(entries: list) -> list:
    """去除重复条目（按名称）"""
    seen = set()
    unique = []
    for entry in entries:
        key = entry["name"].strip().lower()
        if key not in seen:
            seen.add(key)
            unique.append(entry)
    return unique


def parse_zh_wiki_from_file(file_path: Path) -> list:
    """从文件解析中文维基百科页面"""
    if not file_path.exists():
        return []
    html = file_path.read_text(encoding="utf-8")
    return parse_zh_wiki(html)


def parse_single_article(html: str, wiki_url: str = "") -> list:
    """解析单一条目页面（如都江堰、曲辕犁等）"""
    soup = BeautifulSoup(html, "lxml")
    
    h1 = soup.find("h1", {"class": "firstHeading"})
    if not h1:
        return []
    
    name = h1.get_text().strip()
    if not is_valid_name(name):
        return []
    
    content = soup.find("div", {"class": "mw-parser-output"})
    if not content:
        return []
    
    raw_desc = ""
    paragraphs = content.find_all("p")
    for p in paragraphs:
        text = p.get_text().strip()
        if text and len(text) > 20:
            raw_desc = text
            break
    
    if not raw_desc:
        all_ps = content.find_all(['p', 'div', 'section'])
        for el in all_ps:
            text = el.get_text().strip()
            if text and len(text) > 20 and not text.startswith('坐标'):
                raw_desc = text
                break
    
    if not raw_desc:
        raw_desc = f"{name}，中国古代水利工程。" if name == "都江堰" else f"{name}，中国古代发明。"
    
    era, year = parse_era_and_year(raw_desc)
    
    if year is None:
        year = SINGLE_PAGE_YEARS.get(name)
    
    # 允许年份为空，后续可人工补充
    # 只有超过 YEAR_CUTOFF 的年份才过滤掉
    if year is not None and year > YEAR_CUTOFF:
        return []
    
    return [{
        "name": name,
        "year": year,
        "desc": raw_desc[:500] if len(raw_desc) > 500 else raw_desc,
        "wiki_url": wiki_url,
    }]


def parse_zh_single_from_file(file_path: Path, base_url: str) -> list:
    """从文件解析单一条目页面"""
    if not file_path.exists():
        return []
    html = file_path.read_text(encoding="utf-8")
    return parse_single_article(html, base_url)


def main():
    print("=== 步骤 2/4: 解析维基百科 HTML ===")

    files_to_parse = [
        ("主页面", OUTPUT_DIR / "wiki_zh_raw.html"),
        ("史前发明", OUTPUT_DIR / "wiki_zh_preshi_raw.html"),
        ("先秦发明", OUTPUT_DIR / "wiki_zh_xianqin_raw.html"),
        ("科学史", OUTPUT_DIR / "wiki_zh_kexueshi_raw.html"),
        ("农业史", OUTPUT_DIR / "wiki_zh_nongye_raw.html"),
        ("医学史", OUTPUT_DIR / "wiki_zh_yixue_raw.html"),
        ("数学史", OUTPUT_DIR / "wiki_zh_math_raw.html"),
        ("天文学史", OUTPUT_DIR / "wiki_zh_tianwen_raw.html"),
        ("中国农业史", OUTPUT_DIR / "wiki_zh_nongyeshi_raw.html"),
        ("建筑史", OUTPUT_DIR / "wiki_zh_jianzhushi_raw.html"),
        ("军事史", OUTPUT_DIR / "wiki_zh_junshishi_raw.html"),
        ("化学史", OUTPUT_DIR / "wiki_zh_huaxueshi_raw.html"),
        ("火药", OUTPUT_DIR / "wiki_zh_huoyao_raw.html"),
        ("农具", OUTPUT_DIR / "wiki_zh_nongju_raw.html"),
        ("梯田", OUTPUT_DIR / "wiki_zh_tiantian_raw.html"),
        ("水磨", OUTPUT_DIR / "wiki_zh_shuimo_raw.html"),
    ]
    
    single_pages = [
        # 原有核心条目
        ("曲辕犁", OUTPUT_DIR / "wiki_zh_quyuanli_raw.html", "https://zh.wikipedia.org/wiki/%E6%9B%B2%E8%BE%95%E7%8A%81"),
        ("直辕犁", OUTPUT_DIR / "wiki_zh_zhiyuanli_raw.html", "https://zh.wikipedia.org/wiki/%E7%9B%B4%E8%BE%95%E7%8A%81"),
        ("坎儿井", OUTPUT_DIR / "wiki_zh_kanerjing_raw.html", "https://zh.wikipedia.org/wiki/%E5%9D%8E%E5%85%92%E4%BA%95"),
        ("筒车", OUTPUT_DIR / "wiki_zh_tongche_raw.html", "https://zh.wikipedia.org/wiki/%E7%AD%92%E8%BD%A6"),
        ("都江堰", OUTPUT_DIR / "wiki_zh_dujiangyan_raw.html", "https://zh.wikipedia.org/wiki/%E9%83%BD%E6%B1%9F%E5%A0%B0"),
        ("地动仪", OUTPUT_DIR / "wiki_zh_dongjit_raw.html", "https://zh.wikipedia.org/wiki/%E5%80%99%E9%A2%A8%E5%9C%B0%E5%8B%95%E5%84%80"),
        ("浑天仪", OUTPUT_DIR / "wiki_zh_huntianyi_raw.html", "https://zh.wikipedia.org/wiki/%E6%B5%91%E8%B1%A1"),
        ("水运仪象台", OUTPUT_DIR / "wiki_zh_shuimoyixiangtai_raw.html", "https://zh.wikipedia.org/wiki/%E6%B0%B4%E9%81%8B%E5%84%80%E8%B1%A1%E5%8F%B0"),
        ("指南车", OUTPUT_DIR / "wiki_zh_zhinanche_raw.html", "https://zh.wikipedia.org/wiki/%E6%8C%87%E5%8D%97%E8%BD%A6"),
        ("木牛流马", OUTPUT_DIR / "wiki_zh_muniuliuma_raw.html", "https://zh.wikipedia.org/wiki/%E6%9C%A8%E7%89%9B%E6%B5%81%E9%A9%AC"),
        # 新增单条目
        ("轮作", OUTPUT_DIR / "wiki_lun_zuo_raw.html", "https://zh.wikipedia.org/wiki/%E8%BD%AE%E4%BD%9C"),
        ("龙骨水车", OUTPUT_DIR / "wiki_longu_shui_raw.html", "https://zh.wikipedia.org/wiki/%E9%BE%99%E9%AA%A8%E6%B0%B4%E8%BD%A6"),
        ("风车", OUTPUT_DIR / "wiki_feng_che_raw.html", "https://zh.wikipedia.org/wiki/%E9%A3%8E%E8%BD%A6"),
        ("梯田", OUTPUT_DIR / "wiki_tiantian_raw.html", "https://zh.wikipedia.org/wiki/%E6%A2%AF%E7%94%B0"),
        ("水排", OUTPUT_DIR / "wiki_shui_pai_raw.html", "https://zh.wikipedia.org/wiki/%E6%B0%B4%E6%8E%92"),
        ("水磨", OUTPUT_DIR / "wiki_shuili_mo_raw.html", "https://zh.wikipedia.org/wiki/%E6%B0%B4%E7%A3%A8"),
        ("木结构", OUTPUT_DIR / "wiki_mu_jiegou_raw.html", "https://zh.wikipedia.org/wiki/%E6%9C%A8%E7%BB%93%E6%9E%84"),
        ("城墙", OUTPUT_DIR / "wiki_cheng_qiang_raw.html", "https://zh.wikipedia.org/wiki/%E5%9F%8E%E5%9F%8E"),
        ("苏州园林", OUTPUT_DIR / "wiki_sihuayuan_raw.html", "https://zh.wikipedia.org/wiki/%E8%8B%8F%E5%B7%9E%E5%9B%AD%E5%9B%AD"),
        ("风水", OUTPUT_DIR / "wiki_fengshui_raw.html", "https://zh.wikipedia.org/wiki/%E9%A3%8E%E6%B0%B4"),
        ("火药", OUTPUT_DIR / "wiki_huo_yao_raw.html", "https://zh.wikipedia.org/wiki/%E7%81%AB%E8%8D%AF"),
    ]

    manual_entries = [
        {"name": "滑轮", "year": -100, "desc": "滑轮是中国古代重要的机械传动部件，用于改变力的方向或省力。滑轮装置的绘制最早出现于汉代的画像砖、陶井模，在《墨经》里也有记载关于滑轮的论述。", "wiki_url": "https://zh.wikipedia.org/wiki/%E6%BB%91%E8%BD%AE"},
        {"name": "链条传动", "year": 31, "desc": "传动链条在中国早在公元二世纪就已出现。东汉毕岚创造的翻车运用了链轮传动原理，这种方形板叶链式水车可算是原始的链式传动装置。北宋张思训将齿轮链原理用于天文钟。", "wiki_url": "https://baike.baidu.com/item/%E5%82%B3%E5%8B%95%E9%8F%88%E6%A2%9D/8364708"},
        {"name": "齿轮传动", "year": -300, "desc": "齿轮传动是中国古代机械核心技术。山西侯马东周晋国铸铜遗址出土了迄今所知最早的青铜齿轮，用于辘轳等机械的止动功能。汉代齿轮技术进一步发展，被用于传动机械。", "wiki_url": "https://baike.baidu.com/item/%E4%B8%AD%E5%9B%BD%E9%9D%92%E9%93%9C%E9%BD%BF%E8%BD%AE/10232139"},
        {"name": "水力磨坊", "year": 31, "desc": "水磨是水力驱动的磨，利用水车驱动研磨谷物。中国早在汉朝时期就开始利用水力磨坊生产谷物。东汉官员杜诗于公元31年发明了水排，利用水力传动机械。祖冲之曾设计制造过利用水力舂米、磨面的水碓磨。", "wiki_url": "https://zh.wikipedia.org/wiki/%E6%B0%B4%E7%A3%A8"},
        {"name": "风力磨坊", "year": 1200, "desc": "风力磨坊利用风车驱动磨盘，是利用风能的机械装置。元朝时期风力已应用于农业生产，并出现了风车和风磨。", "wiki_url": "https://zh.wikipedia.org/wiki/%E9%A3%8E%E8%BD%A6"},
        {"name": "弩机", "year": -300, "desc": "弩机是中国古代弓弩的核心部件，用于发射箭矢的机械装置。战国时期已使用青铜弩机，汉代进一步改进完善。", "wiki_url": "https://zh.wikipedia.org/wiki/%E5%BC%93%E7%A0%94"},
        # ===== 补充未收录条目（备用）====
        {"name": "耧车", "year": -100, "desc": "耧车是中国古代播种工具，由耧斗、耧腿和耧铧组成，可同时完成开沟和播种。", "wiki_url": "https://zh.wikipedia.org/wiki/%E8%80%8F%E8%BD%A6"},
        {"name": "秧马", "year": -200, "desc": "秧马是中国古代拔秧坐骑，用于水田作业，可减轻劳动强度。", "wiki_url": "https://zh.wikipedia.org/wiki/%E7%A7%8A%E9%A9%AC"},
        {"name": "翻车", "year": 150, "desc": "翻车是中国古代灌溉工具，用于汲水，能连续提取水源。", "wiki_url": "https://zh.wikipedia.org/wiki/%E7%BF%BB%E8%BD%A6"},
        {"name": "脚踏水车", "year": -100, "desc": "脚踏水车需人力踩踏驱动，用于灌溉。", "wiki_url": ""},
        {"name": "独轮车", "year": -100, "desc": "独轮车是中国古代运输工具，只需一人即可推动。", "wiki_url": ""},
        {"name": "赵州桥", "year": 605, "desc": "赵州桥位于河北赵县，建于隋朝，是世界上现存最早、保存最好的敞肩式拱桥。", "wiki_url": "https://zh.wikipedia.org/wiki/%E8%B5%B0%E5%B7%9E%E6%A1%A5"},
        {"name": "榫卯", "year": -3000, "desc": "榫卯是中国古代木构建筑的核心连接技术，不用钉子即可牢固结合。", "wiki_url": "https://zh.wikipedia.org/wiki/%E6%A6%94%E5%8C%8D"},
        {"name": "斗拱", "year": -500, "desc": "斗拱是中国古代建筑特有的结构构件，既承重又美观。", "wiki_url": "https://zh.wikipedia.org/wiki/%E6%96%97%E5%8A%A8"},
        {"name": "万里长城", "year": -215, "desc": "万里长城是中国古代伟大的防御工程，跨越多个朝代修建。", "wiki_url": "https://zh.wikipedia.org/wiki/%E4%B8%87%E9%95%BF%E5%A4%A7%E5%90%88%E5%9F%8E"},
        {"name": "京杭大运河", "year": 605, "desc": "京杭大运河是中国古代南北交通大动脉，连接北京和杭州。", "wiki_url": "https://zh.wikipedia.org/wiki/%E4%BA%AC%E6%96%B0%E5%A4%A7%E8%BF%90%E6%B2%B3"},
        {"name": "天然气", "year": -200, "desc": "中国早在汉代就发现和利用天然气，用于照明和煮盐。", "wiki_url": ""},
        {"name": "生铁", "year": -300, "desc": "生铁是中国古代冶金的产物，用于铸造各种铁器。", "wiki_url": ""},
        {"name": "织机", "year": -500, "desc": "织机是中国古代纺织工具，用于织造布匹。", "wiki_url": ""},
        {"name": "棉纺", "year": 1300, "desc": "棉纺技术在中国宋元时期发展，用于纺制棉布。", "wiki_url": ""},
        {"name": "福船", "year": -200, "desc": "福船是中国古代海船类型，航行于东南沿海。", "wiki_url": ""},
        {"name": "沙船", "year": -200, "desc": "沙船是中国古代平底浅船，适合浅水航行。", "wiki_url": ""},
        {"name": "车船", "year": 1100, "desc": "车船是古代明轮船，以人力踏桨轮驱动。", "wiki_url": ""},
        {"name": "火炮", "year": 1250, "desc": "火炮是中国古代火器，利用火药发射弹丸。", "wiki_url": ""},
        {"name": "虎蹲炮", "year": 1500, "desc": "虎蹲炮是明代火器，形状如虎蹲踞。", "wiki_url": ""},
        {"name": "战车", "year": -400, "desc": "战车是中国古代军事交通工具，用于作战运输。", "wiki_url": ""},
        {"name": "书法", "year": -1500, "desc": "书法是中国传统文化艺术，汉字书写法则。", "wiki_url": ""},
        {"name": "篆刻", "year": -2000, "desc": "篆刻是中国传统艺术，在印章上雕刻文字。", "wiki_url": ""},
        {"name": "纸币", "year": 1024, "desc": "纸币最早出现于中国宋代，用于商业交易。", "wiki_url": ""},
        {"name": "十进位制", "year": -3000, "desc": "十进位制是中国古代数学计数方法。", "wiki_url": ""},
        {"name": "割圆术", "year": 263, "desc": "割圆术是刘徽创建的求圆周率方法。", "wiki_url": ""},
        {"name": "太初历", "year": -104, "desc": "太初历是中国西汉时期的历法。", "wiki_url": ""},
        {"name": "授时历", "year": 1280, "desc": "授时历是元代的先进历法。", "wiki_url": ""},
        {"name": "油灯", "year": -500, "desc": "油灯是中国古代照明工具，以油为燃料。", "wiki_url": ""},
        {"name": "火折子", "year": 400, "desc": "火折子是中国古代引火工具，便携易用。", "wiki_url": ""},
        {"name": "酿酒", "year": -6000, "desc": "酿酒是中国古代发明，利用谷物发酵酿造。", "wiki_url": ""},
        {"name": "火锅", "year": 1000, "desc": "火锅是中国传统烹饪方式，边煮边吃。", "wiki_url": ""},
        {"name": "铜镜", "year": -3000, "desc": "铜镜是中国古代照面工具，古代青铜器重要种类。", "wiki_url": ""},
        {"name": "玉器", "year": -4000, "desc": "玉器是中国古代重要工艺品，用玉石雕刻而成。", "wiki_url": ""},
    ]

    all_entries = []

    for name, file_path in files_to_parse:
        entries = parse_zh_wiki_from_file(file_path)
        if entries:
            print(f"  [{name}] 提取到 {len(entries)} 个条目")
            all_entries.extend(entries)
    
    for name, file_path, wiki_url in single_pages:
        entries = parse_zh_single_from_file(file_path, wiki_url)
        if entries:
            print(f"  [{name}] 提取到 {len(entries)} 个条目")
            all_entries.extend(entries)
    
    for entry in manual_entries:
        all_entries.append(entry)
        print(f"  [{entry['name']}] 手动添加")

    if all_entries:
        all_entries = deduplicate_entries(all_entries)

        output_file = OUTPUT_DIR / "wiki_parsed.json"
        output_file.write_text(
            json.dumps(all_entries, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        print(f"\n  总计: {len(all_entries)} 个条目")
        
        with_missing = [e for e in all_entries if e.get("year") is None]
        print(f"  缺少年份: {len(with_missing)} 条")
        return True

    print("  错误: 未解析到任何条目")
    return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
