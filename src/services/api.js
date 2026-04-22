// ============================================================
// api.js
// 后端API调用封装
// ============================================================
// 职责:
// 1. 封装所有对后端的HTTP请求
// 2. 统一处理请求/响应
// 3. 并行获取多个数据源
//
// API端点说明:
//
//   GET /api/nodes              -> 获取所有节点
//   GET /api/categories         -> 获取所有类别
//   GET /api/positions        -> 获取节点位置和时代范围
//   GET /api/adjacency       -> 获取邻接表
//   GET /api/ui-config      -> 获取UI配置
//   POST /api/algorithms/bfs -> 执行BFS遍历
//   POST /api/algorithms/dfs -> 执行DFS遍历
//   GET /api/node-picture/:id -> 获取节点图片
//
// ============================================================

import { DEFAULT_UI_CONFIG, normalizeUiConfig } from "../config/uiConfig";

// API基础URL
const API_BASE = 'http://localhost:5001/api';

/**
 * 获取节点图片URL
 *
 * @param {string} nodeId - 节点ID
 * @returns {string} 图片完整URL
 */
export function getNodePictureUrl(nodeId) {
  return `${API_BASE}/node-picture/${encodeURIComponent(nodeId)}`;
}

/**
 * 获取所有节点
 *
 * @returns {Promise<Array>} 节点数组
 *   [
 *     {
 *       id, name, year, era, cat, outEdges,
 *       desc, sig, inv, en
 *     },
 *     ...
 *   ]
 */
export async function fetchNodes() {
  const res = await fetch(`${API_BASE}/nodes`);
  return res.json();
}

/**
 * 获取所有类别
 *
 * @returns {Promise<Array>} 类别数组
 *   [{ code, name, color }, ...]
 */
export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  return res.json();
}

/**
 * 获取节点位置
 * 同时返回时代范围信息
 *
 * @returns {Promise<Object>}
 *   {
 *     positions: { nodeId: { x, y } },
 *     eraRanges: [{ name, start, end, scale }]
 *   }
 */
export async function fetchPositions() {
  const res = await fetch(`${API_BASE}/positions`);
  return res.json();
}

/**
 * 获取邻接表
 * 包括ADJ、RADJ、NMAP
 *
 * @returns {Promise<Object>}
 *   {
 *     adj: { nodeId: [targetId] },
 *     radj: { nodeId: [sourceId] },
 *     nmap: { nodeId: nodeObject }
 *   }
 */
export async function fetchAdjacency() {
  const res = await fetch(`${API_BASE}/adjacency`);
  return res.json();
}

/**
 * 获取UI配置
 * 失败时返回默认配置
 *
 * @returns {Promise<Object>} UI配置对象
 */
export async function fetchUiConfig() {
  const res = await fetch(`${API_BASE}/ui-config`);
  // 如果请求失败,返回默认配置
  if (!res.ok) return DEFAULT_UI_CONFIG;
  // 规范化配置
  return normalizeUiConfig(await res.json());
}

// ===================== 遍历算法 =====================

/**
 * 执行BFS(广度优先遍历)
 *
 * @param {string} start - 起始节点ID
 * @returns {Promise<Array>} 步骤数组
 *   [
 *     {
 *       cur: "当前节点ID",
 *       visited: ["节点ID", ...],
 *       queue: ["节点ID", ...],
 *       discovered: ["节点ID", ...],
 *       fresh: ["新访问节点ID", ...]
 *     },
 *     ...
 *   ]
 */
export async function runBFS(start) {
  const res = await fetch(`${API_BASE}/algorithms/bfs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start }),
  });
  const data = await res.json();
  return data.steps;
}

/**
 * 执行DFS(深度优先遍历)
 *
 * @param {string} start - 起始节点ID
 * @returns {Promise<Array>} 步骤数组
 */
export async function runDFS(start) {
  const res = await fetch(`${API_BASE}/algorithms/dfs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start }),
  });
  const data = await res.json();
  return data.steps;
}

// ===================== 批量获取 =====================

/**
 * 获取所有数据(并行)
 * 一次性获取所有需要的数据,提高性能
 *
 * @returns {Promise<Object>}
 *   {
 *     nodes, categories,
 *     positions: { nodeId: { x, y } },
 *     timelineConfig: [{ name, start, end, scale }],
 *     adj, radj, nmap,
 *     uiConfig
 *   }
 */
export async function fetchAllData() {
  // 并行请求所有数据源
  const [nodes, categories, positions, adjacency, uiConfig] = await Promise.all([
    fetchNodes(),
    fetchCategories(),
    fetchPositions(),
    fetchAdjacency(),
    // 失败时使用默认配置
    fetchUiConfig().catch(() => DEFAULT_UI_CONFIG),
  ]);

  // 整理返回数据
  return {
    // 节点数组
    nodes,
    // 类别数组
    categories,
    // 位置映射(从positions.positions提取)
    positions: positions.positions,
    // 时代配置(从positions.eraRanges提取)
    timelineConfig: positions.eraRanges,
    // UI配置
    uiConfig: normalizeUiConfig(uiConfig),
    // 邻接表(展开放入)
    ...adjacency,
  };
}
