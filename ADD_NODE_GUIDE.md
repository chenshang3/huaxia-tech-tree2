# 添加节点指南

本指南帮助你在不修改代码的情况下，向华夏科技树添加新的发明/技术节点。

---

## 快速开始

### 1. 添加节点

打开 `server/data/nodes.json`，在数组中添加新节点：

```json
{
  "id": "your_node_id",
  "name": "节点名称",
  "en": "English Name",
  "era": "所属朝代",
  "year": -2000,
  "cat": "分类key",
  "inv": "发明者",
  "desc": "简介内容...",
  "sig": "历史意义...",
  "outEdges": ["依赖节点id1", "依赖节点id2"]
}
```

### 2. 验证

运行以下命令查看效果：

```bash
npm run dev
```

---

## 字段说明

| 字段 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `id` | 是 | 唯一标识符，英文小写+下划线 | `papermaking` |
| `name` | 是 | 中文名称 | `造纸术` |
| `en` | 是 | 英文名称 | `Papermaking` |
| `era` | 是 | 所属朝代 | `东汉` |
| `year` | 是 | 发明年份（负数=公元前） | `-105` 或 `105` |
| `cat` | 是 | 分类，对应 `server/data/categories.json` 中的 `code` | `culture` |
| `inv` | 是 | 发明/改进者 | `蔡伦` |
| `desc` | 是 | 简介，50-200字 | `蔡伦改进造纸术...` |
| `sig` | 是 | 历史意义，20-50字 | `四大发明之一...` |
| `outEdges` | 否 | 前置技术节点 ID 列表（依赖关系） | `["bronze", "casting"]` |

---

## 分类列表

在 `server/data/categories.json` 中定义：

| key | 标签 |
|-----|------|
| `craft` | 工艺 |
| `metallurgy` | 冶金 |
| `culture` | 文化 |
| `science` | 科学 |
| `medicine` | 医学 |
| `engineering` | 工程 |
| `military` | 军事 |
| `navigation` | 导航 |
| `textile` | 纺织 |
| `trade` | 贸易 |
| `agriculture` | 农业 |
| `math` | 数学 |

---

## 示例：添加"丝绸"

在 `server/data/nodes.json` 中添加：

```json
{
  "id": "silk",
  "name": "蚕丝",
  "en": "Silk",
  "era": "黄帝时期",
  "year": -2700,
  "cat": "textile",
  "inv": "嫘祖",
  "desc": "中国丝绸历史悠久...",
  "sig": "丝绸之路的核心商品...",
  "outEdges": ["silkroad", "porcelain", "embroidery"]
}
```

添加完成后，重启后端服务即可看到效果。坐标和边关系会自动计算，无需手动设置。

---

## 常见问题

**Q: 添加节点后图上不显示？**
A: 检查 JSON 语法是否正确，重启后端服务（`npm run dev`）

**Q: 节点点击无反应？**
A: 检查 id 是否唯一，是否有语法错误

**Q: 如何删除节点？**
A: 从 `server/data/nodes.json` 中删除该节点，同时检查其他节点的 `outEdges` 是否引用了被删除的 id，如有则一并移除

**Q: 如何修改现有节点？**
A: 直接编辑 `server/data/nodes.json`，保存后重启后端服务即可

**Q: 节点坐标怎么设置？**
A: 坐标由后端根据年份自动计算，无需手动设置。年份越早越靠左，越晚越靠右