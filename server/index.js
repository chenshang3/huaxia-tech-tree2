const express = require('express');
const cors = require('cors');
const path = require('path');

const nodesData = require('./data/nodes.json');
const categoriesData = require('./data/categories.json');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Era 年代分界定义
const ERA_RANGES = [
  { name: '先秦', start: -7000, end: -500 },
  { name: '春秋', start: -500, end: -221 },
  { name: '战国', start: -221, end: -104 },
  { name: '秦汉', start: -104, end: 220 },
  { name: '隋唐', start: 220, end: 960 },
  { name: '宋', start: 960, end: 1232 },
];

// 位置计算函数
function computePositions(nodes) {
  const years = nodes.map(n => n.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  // 年份差（考虑 BC/AD 跨越 0 年）
  const yearRange = maxYear - minYear || 1;

  // 固定画布
  const svgWidth = 1200;
  const svgHeight = 640;
  const baseX = 60;
  const maxX = svgWidth - 60;

  // 扩展 lanes（超过 5 行时自动增加）
  const laneHeight = 80;
  const startY = 90;
  const getLaneY = (lane) => startY + lane * laneHeight;
  const initialLanes = 5;
  let laneLastX = new Array(initialLanes).fill(baseX);

  // 碰撞阈值（年份差距）
  const yearGapThreshold = 100;

  // 按年份排序节点
  const sortedNodes = [...nodes].sort((a, b) => a.year - b.year);

  // 计算每个节点的位置
  const positions = {};

  sortedNodes.forEach(n => {
    // X 坐标基于年份（时间从左到右），时间轴拉长 5 倍
    const xRatio = (n.year - minYear) / yearRange;
    const x = Math.round(baseX + xRatio * (maxX - baseX) * 5);

    // 确保 laneLastX 有足够长度
    const ensureLanes = (lanes) => {
      while (laneLastX.length < lanes) {
        laneLastX.push(baseX);
      }
    };

    // 分配 lane：找到第一个不碰撞的 lane
    let assignedLane = 0;
    const totalLanes = laneLastX.length;
    for (let lane = 0; lane < totalLanes; lane++) {
      if (x - laneLastX[lane] >= yearGapThreshold) {
        assignedLane = lane;
        break;
      }
      // 最后一个 lane 有碰撞？扩展新 lane
      if (lane === totalLanes - 1) {
        assignedLane = totalLanes;
        ensureLanes(assignedLane + 1);
      }
    }

    const y = getLaneY(assignedLane);
    laneLastX[assignedLane] = x;

    positions[n.id] = { x, y, lane: assignedLane };
  });

  return { positions, svgWidth, svgHeight, eraRanges: ERA_RANGES, minYear, maxYear };
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

app.get('/api/adjacency', (req, res) => {
  res.json({ adj: ADJ, radj: RADJ, nmap: NMAP });
});

// BFS 算法
app.post('/api/algorithms/bfs', (req, res) => {
  const { start } = req.body;
  if (!start || !ADJ[start]) {
    return res.status(400).json({ error: 'Invalid start node' });
  }

  const steps = [];
  const vis = new Set([start]);
  const q = [start];

  while (q.length) {
    const cur = q.shift();
    const fresh = (ADJ[cur] || []).filter(n => !vis.has(n));
    fresh.forEach(n => {
      vis.add(n);
      q.push(n);
    });
    steps.push({ cur, queue: [...q], visited: [...vis], fresh, ds: 'queue' });
  }
  res.json({ steps });
});

// DFS 算法
app.post('/api/algorithms/dfs', (req, res) => {
  const { start } = req.body;
  if (!start || !ADJ[start]) {
    return res.status(400).json({ error: 'Invalid start node' });
  }

  const steps = [];
  const vis = new Set();
  const stk = [start];

  while (stk.length) {
    const cur = stk.pop();
    if (vis.has(cur)) continue;
    vis.add(cur);
    const fresh = [...(ADJ[cur] || [])].reverse().filter(n => !vis.has(n));
    fresh.forEach(n => stk.push(n));
    steps.push({ cur, stack: [...stk], visited: [...vis], fresh, ds: 'stack' });
  }
  res.json({ steps });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
