const express = require('express');
const cors = require('cors');
const path = require('path');

const nodesData = require('./data/nodes.json');
const edgesData = require('./data/edges.json');
const categoriesData = require('./data/categories.json');
const positionsData = require('./data/positions.json');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// 构建邻接表
const ADJ = Object.fromEntries(nodesData.map(n => [n.id, []]));
const RADJ_temp = Object.fromEntries(nodesData.map(n => [n.id, []]));

edgesData.forEach(e => {
  if (ADJ[e.from]) {
    ADJ[e.from].push(e.to);
  }
  if (RADJ_temp[e.to]) {
    RADJ_temp[e.to].push(e.from);
  }
});

const RADJ = RADJ_temp;

// 构建节点映射
const NMAP = Object.fromEntries(nodesData.map(n => [n.id, n]));

// API Routes
app.get('/api/nodes', (req, res) => {
  res.json(nodesData);
});

app.get('/api/edges', (req, res) => {
  res.json(edgesData);
});

app.get('/api/categories', (req, res) => {
  res.json(categoriesData);
});

app.get('/api/positions', (req, res) => {
  res.json(positionsData);
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
