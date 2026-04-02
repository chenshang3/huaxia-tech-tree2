const API_BASE = 'http://localhost:5001/api';

export async function fetchNodes() {
  const res = await fetch(`${API_BASE}/nodes`);
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  return res.json();
}

export async function fetchPositions() {
  const res = await fetch(`${API_BASE}/positions`);
  return res.json();
}

export async function fetchAdjacency() {
  const res = await fetch(`${API_BASE}/adjacency`);
  return res.json();
}

export async function runBFS(start) {
  const res = await fetch(`${API_BASE}/algorithms/bfs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start }),
  });
  const data = await res.json();
  return data.steps;
}

export async function runDFS(start) {
  const res = await fetch(`${API_BASE}/algorithms/dfs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start }),
  });
  const data = await res.json();
  return data.steps;
}

export async function fetchAllData() {
  const [nodes, categories, positions, adjacency] = await Promise.all([
    fetchNodes(),
    fetchCategories(),
    fetchPositions(),
    fetchAdjacency(),
  ]);
  return {
    nodes,
    categories,
    positions: positions.positions,
    timelineConfig: positions.eraRanges,
    ...adjacency,
  };
}
