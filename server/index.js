const express = require('express');
const cors = require('cors');
const path = require('path');

const nodesData = require('./data/nodes.json');
const categoriesData = require('./data/categories.json');
const timelineConfig = require('./data/timelineConfig.json');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// 构建邻接表（从节点的 outEdges 字段）
const ADJ = Object.fromEntries(nodesData.map(n => [n.id, n.outEdges || []]));
const RADJ_temp = Object.fromEntries(nodesData.map(n => [n.id, []]));

// 构建逆向邻接表
nodesData.forEach(n => {
  (n.outEdges || []).forEach(target => {
    if (RADJ_temp[target] !== undefined) {
      RADJ_temp[target].push(n.id);
    }
  });
});

const RADJ = RADJ_temp;

// 构建节点映射
const NMAP = Object.fromEntries(nodesData.map(n => [n.id, n]));

// 计算年份对应的加权位置
function yearToWeightedYear(year, config) {
  let cumulativeYears = 0;
  for (const { start, end, scale } of config) {
    if (year >= start && year < end) {
      return cumulativeYears + (year - start) * scale;
    }
    cumulativeYears += (end - start) * scale;
  }
  return cumulativeYears;
}

// 位置计算函数
function computePositions(nodes) {
  // 固定画布
  const svgWidth = 1200;
  const baseX = 60;
  const maxX = svgWidth - 60;
  const TIMELINE_SCALE = 10; // 时间轴延长倍数（与前端一致）
  const NODE_RADIUS = 28; // 与前端 constants.js 保持一致
  const NODE_DIAMETER = NODE_RADIUS * 2;
  const TEXT_CHAR_WIDTH = 9;
  const LABEL_HORIZONTAL_PADDING = 18;
  const MIN_NODE_GAP = 12;

  // ========== 分类高度区间映射 ==========
  // 限制每个分类的 lane 范围，实现分类分区布局
  const CATEGORY_LANES = {
    agriculture: { minLane: 2, maxLane: 4 },    // 农业 - 最上部
    craft:       { minLane: 2, maxLane: 4 },    // 工艺 - 上部
    textile:     { minLane: 3, maxLane: 5 },    // 纺织 - 上部
    metallurgy:  { minLane: 3, maxLane: 5 },    // 冶金 - 上部
    
    culture:     { minLane: 4, maxLane: 6 },    // 文化 - 中部
    science:     { minLane: 4, maxLane: 6 },    // 科学 - 中部
    math:        { minLane: 5, maxLane: 7 },    // 数学 - 中部
    
    medicine:    { minLane: 5, maxLane: 7 },    // 医学 - 中下部
    navigation:  { minLane: 6, maxLane: 8 },    // 航海 - 中下部
    trade:       { minLane: 6, maxLane: 8 },    // 贸易 - 中下部
    
    engineering: { minLane: 7, maxLane: 9 },    // 工程 - 下部
    military:    { minLane: 7, maxLane: 9 },    // 军事 - 下部
  };

  // 计算总加权跨度
  let totalWeightedYears = 0;
  timelineConfig.forEach(({ start, end, scale }) => {
    totalWeightedYears += (end - start) * scale;
  });

  // 计算时间轴总宽度
  const timelineWidth = (maxX - baseX) * TIMELINE_SCALE;

  // 扩展 lanes（超过 5 行时自动增加）
  const laneHeight = 100;
  const startY = 90;
  const JITTER_AMPLITUDE = 20;
  const getLaneY = (lane, jitter = 0) => startY + lane * laneHeight + jitter;
  const initialLanes = 8;  // 增加初始 lanes 数量以支持分类分区
  // 空 lane 用 -Infinity 标记，表示该行尚未被任何节点占用。
  let laneLastX = new Array(initialLanes).fill(-Infinity);

  // 服务端无法直接测量 SVG 文本宽度，这里用名称长度估算节点的横向包围盒。
  const getNodeBoxWidth = (node) => {
    const name = node.name || '';
    const firstLineLength = Math.min(name.length, 4);
    const secondLineLength = Math.max(0, name.length - 4);
    const textWidth = Math.max(firstLineLength, secondLineLength) * TEXT_CHAR_WIDTH + LABEL_HORIZONTAL_PADDING;
    return Math.max(NODE_DIAMETER, textWidth);
  };

  const getRequiredLaneGap = (node) => getNodeBoxWidth(node) + MIN_NODE_GAP;

  const ensureLanes = (lanes) => {
    while (laneLastX.length < lanes) {
      laneLastX.push(-Infinity);
    }
  };

  const canPlaceInLane = (lane, x, minGap) => {
    ensureLanes(lane + 1);
    if (!Number.isFinite(laneLastX[lane])) {
      return true;
    }
    return x - laneLastX[lane] >= minGap;
  };

  // 先在分类优先区间内搜索，再按距离中心最近的顺序向上下两侧扩展。
  const buildLaneCandidates = (catConfig) => {
    const lanes = [];
    const seen = new Set();
    const center = (catConfig.minLane + catConfig.maxLane) / 2;
    const orderedBaseLanes = [];

    for (let distance = 0; distance <= catConfig.maxLane - catConfig.minLane; distance++) {
      const lower = Math.floor(center - distance);
      const upper = Math.ceil(center + distance);
      if (lower >= catConfig.minLane && lower <= catConfig.maxLane) {
        orderedBaseLanes.push(lower);
      }
      if (upper >= catConfig.minLane && upper <= catConfig.maxLane && upper !== lower) {
        orderedBaseLanes.push(upper);
      }
    }

    orderedBaseLanes.forEach((lane) => {
      if (!seen.has(lane)) {
        seen.add(lane);
        lanes.push(lane);
      }
    });

    let offset = 1;
    while (lanes.length < laneLastX.length + 2) {
      const lower = catConfig.minLane - offset;
      const upper = catConfig.maxLane + offset;

      if (lower >= 0 && !seen.has(lower)) {
        seen.add(lower);
        lanes.push(lower);
      }
      if (!seen.has(upper)) {
        seen.add(upper);
        lanes.push(upper);
      }

      if (lower < 0 && upper >= laneLastX.length + 1) {
        break;
      }
      offset += 1;
    }

    return lanes;
  };

  // 生成稳定哈希，让抖动对同一节点始终保持一致，避免每次刷新布局漂移。
  const hashString = (value) => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };

  // 抖动只用于打散完全水平对齐，不改变 lane 作为主布局单位的事实。
  const getDeterministicJitter = (node) => {
    const stableKey = `${node.id || ''}|${node.name || ''}|${node.year || 0}`;
    const normalized = hashString(stableKey) / 0xffffffff;
    return Math.round((normalized * 2 - 1) * JITTER_AMPLITUDE);
  };

  // 按年份排序节点
  const sortedNodes = [...nodes].sort((a, b) => a.year - b.year);

  // 计算每个节点的位置
  const positions = {};

  sortedNodes.forEach(n => {
    // X 坐标基于加权年份（与前端时间轴计算方式一致）
    const weightedYear = yearToWeightedYear(n.year, timelineConfig);
    const x = Math.round(baseX + (weightedYear / totalWeightedYears) * timelineWidth);
    const minGap = getRequiredLaneGap(n);

    // ========== 改进的 lane 分配逻辑 ==========
    // 1. 获取该分类的优先 lane 范围
    const catConfig = CATEGORY_LANES[n.cat] || { minLane: 0, maxLane: laneLastX.length - 1 };
    const laneCandidates = buildLaneCandidates(catConfig);
    let assignedLane = null;

    // 2. 先在分类区间内，再向两侧做就近扩展
    for (const lane of laneCandidates) {
      if (canPlaceInLane(lane, x, minGap)) {
        assignedLane = lane;
        break;
      }
    }

    // 3. 如果所有候选 lane 都不满足条件，则创建一个紧邻分类区块的新 lane
    if (assignedLane === null) {
      assignedLane = Math.max(laneLastX.length, catConfig.maxLane + 1);
      ensureLanes(assignedLane + 1);
    }

    const y = getLaneY(assignedLane, getDeterministicJitter(n));
    laneLastX[assignedLane] = x;

    positions[n.id] = { x, y, lane: assignedLane };
  });

  return { positions, eraRanges: timelineConfig };
}

// API Routes
app.get('/api/nodes', (req, res) => {
  res.json(nodesData);
});

app.get('/api/categories', (req, res) => {
  res.json(categoriesData);
});

app.get('/api/positions', (req, res) => {
  const result = computePositions(nodesData);
  res.json(result);
});

app.get('/api/timeline-config', (req, res) => {
  res.json(timelineConfig);
});

app.get('/api/adjacency', (req, res) => {
  res.json({ adj: ADJ, radj: RADJ, nmap: NMAP });
});

// 路径重建辅助函数
function reconstructPath(node, parent) {
  const path = [];
  let current = node;
  while (current !== null && current !== undefined) {
    path.unshift(current);
    current = parent[current];
  }
  return path;
}

// BFS 算法
app.post('/api/algorithms/bfs', (req, res) => {
  const { start } = req.body;
  if (!start || !ADJ[start]) {
    return res.status(400).json({ error: 'Invalid start node' });
  }

  // 第一步：预先计算整个可达子树
  const discovered = new Set([start]);
  const discoverQueue = [start];
  while (discoverQueue.length) {
    const cur = discoverQueue.shift();
    (ADJ[cur] || []).forEach(n => {
      if (!discovered.has(n)) {
        discovered.add(n);
        discoverQueue.push(n);
      }
    });
  }

  // 第二步：正式遍历动画
  const steps = [];
  const visited = [];  // 仅包含已出队的节点
  const queue = [start];
  const parent = { [start]: null };

  while (queue.length) {
    const cur = queue.shift();
    visited.push(cur);

    const fresh = (ADJ[cur] || []).filter(n => !visited.includes(n) && !queue.includes(n));
    const isLeaf = fresh.length === 0;
    const leafPath = isLeaf ? reconstructPath(cur, parent) : null;

    fresh.forEach(n => {
      parent[n] = cur;
      queue.push(n);
    });

    steps.push({
      cur,
      queue: [...queue],
      visited: [...visited],
      discovered: [...discovered],
      fresh,
      ds: 'queue',
      isLeaf,
      leafPath
    });
  }
  res.json({ steps });
});

// DFS 算法
app.post('/api/algorithms/dfs', (req, res) => {
  const { start } = req.body;
  if (!start || !ADJ[start]) {
    return res.status(400).json({ error: 'Invalid start node' });
  }

  // 第一步：预先计算整个可达子树（用 DFS 遍历）
  const discovered = new Set();
  const discoverStack = [start];
  while (discoverStack.length) {
    const cur = discoverStack.pop();
    if (discovered.has(cur)) continue;
    discovered.add(cur);
    [...(ADJ[cur] || [])].reverse().forEach(n => {
      if (!discovered.has(n)) {
        discoverStack.push(n);
      }
    });
  }

  // 第二步：正式遍历动画
  const steps = [];
  const visited = [];  // 仅包含已弹出的节点
  const stack = [start];
  const parent = { [start]: null };

  while (stack.length) {
    const cur = stack.pop();
    if (visited.includes(cur)) continue;
    visited.push(cur);

    const fresh = [...(ADJ[cur] || [])].reverse().filter(n => !visited.includes(n) && !stack.includes(n));
    const isLeaf = fresh.length === 0;
    const leafPath = isLeaf ? reconstructPath(cur, parent) : null;

    fresh.forEach(n => {
      parent[n] = cur;
      stack.push(n);
    });

    steps.push({
      cur,
      stack: [...stack],
      visited: [...visited],
      discovered: [...discovered],
      fresh,
      ds: 'stack',
      isLeaf,
      leafPath
    });
  }
  res.json({ steps });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
