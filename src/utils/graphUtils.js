// ============================================================
// graphUtils.js
// 图相关工具函数
// ============================================================
// 职责:
// 1. 判断节点遍历状态(explore/bfs/dfs模式)
// 2. 判断边遍历状态
// 3. 生成贝塞尔曲线路径
// 4. 从邻接表推导边列表
//
// 数据结构:
//
//   步骤快照 (step):
//     {
//       cur: "当前节点ID",
//       visited: ["已访问节点ID", ...],
//       queue: ["待访问节点ID", ...],    // BFS
//       stack: ["待访问节点ID", ...],    // DFS
//       discovered: ["已发现节点ID", ...],
//       fresh: ["新发现节点ID", ...],
//       leafPath: ["路径节点ID", ...]  // DFS叶子路径
//     }
//
//   节点状态:
//     - current: 当前访问的节点
//     - visited: 已完成访问
//     - queued: 在BFS队列中
//     - stacked: 在DFS栈中
//     - idle: 已发现但未访问(可达)
//     - faded: 未发现(不可达)
//
//   边状态:
//     - active: 当前正在遍历的边
//     - path: 叶子节点的父子边
//     - done: 已完成遍历
//     - idle: 在发现集中
//     - faded: 未发现
// ============================================================

import { NODE_RADIUS } from './constants';

/**
 * 判断节点遍历状态
 * 根据当前步骤快照,确定节点在遍历中的状态
 *
 * @param {string} id - 节点ID
 * @param {Object|null} step - 当前步骤快照(null表示未开始)
 * @param {string} mode - 遍历模式 "explore" | "bfs" | "dfs"
 * @returns {string} 状态字符串
 *
 * 状态优先级:
 *   1. current -> 2. visited -> 3. queued/stacked -> 4. idle -> 5. faded
 */
export function nState(id, step, mode) {
  // 未开始遍历,所有节点都是idle
  if (!step) return "idle";
  // 当前正在访问的节点
  if (step.cur === id) return "current";
  // 已完成访问
  if (step.visited.includes(id)) return "visited";
  // BFS队列中的节点
  if (mode === "bfs" && step.queue?.includes(id)) return "queued";
  // DFS栈中的节点
  if (mode === "dfs" && step.stack?.includes(id)) return "stacked";
  // 已在discovered中(可达但未访问)
  if (step.discovered?.includes(id)) return "idle";
  // 不在discovered中(不可达)
  return "faded";
}

/**
 * 判断边遍历状态
 * 根据当前步骤快照,确定边在遍历中的状态
 *
 * @param {string} f - 起始节点ID (from)
 * @param {string} t - 目标节点ID (to)
 * @param {Object|null} step - 当前步骤快照
 * @param {string} mode - 遍历模式
 * @returns {string} 状态字符串
 *
 * 边状态说明:
 *   - active: 从cur出发,正在遍历到fresh节点
 *   - path: 叶子节点的父子边(DFS特有,高亮显示)
 *   - done: 两端都在visited中(已完成)
 *   - idle: 两端都在discovered中(待遍历)
 *   - faded: 不在discovered中(不可达)
 */
export function eState(f, t, step, mode) {
  // 未开始
  if (!step) return "idle";

  // 检查是否是叶子节点的父子边(只高亮这条边)
  if (step.leafPath && step.leafPath.length >= 2) {
    const parentIdx = step.leafPath.length - 2;
    const parent = step.leafPath[parentIdx];
    const leaf = step.leafPath[parentIdx + 1];
    if (f === parent && t === leaf) return "path";
  }

  // 从cur出发,正在遍历到fresh中的节点
  if (step.cur === f && step.fresh?.includes(t)) return "active";

  // 已遍历边: 两端都在visited中
  if (step.visited.includes(f) && step.visited.includes(t)) return "done";

  // idle边: 两端都在discovered中但还不是done
  if (step.discovered?.includes(f) && step.discovered?.includes(t)) return "idle";

  // faded: 其他(不在discovered中)
  return "faded";
}

/**
 * 生成贝塞尔曲线路径
 * 用于SVG中绘制边的曲线
 * 使用二次贝塞尔曲线: 一个控制点
 *
 * @param {string} f - 起始节点ID
 * @param {string} t - 目标节点ID
 * @param {Object} POS - 位置映射 { nodeId: { x, y } }
 * @param {number} R - 节点半径(默认NODE_RADIUS)
 * @returns {string} SVG路径字符串
 *
 * 路径格式:
 *   M startX startY C ctrlX1 ctrlY1, ctrlX2 ctrlY2, endX endY
 *
 * 曲线特点:
 *   - 从起始节点边缘出发
 *   - 控制点在x方向的中点
 *   - 在目标节点边缘结束
 *   - 形成平滑的S形曲线
 */
export function edgePath(f, t, POS, R = NODE_RADIUS) {
  const a = POS[f], b = POS[t];
  if (!a || !b) return "";
  // 控制点在x方向中点
  const midX = (a.x + b.x) / 2;
  // 起点在起始节点右侧(+R+1偏移)
  // 终点在目标节点左侧(-R-1偏移)
  // 使用C(贝塞尔曲线)连接
  return `M ${a.x + R + 1} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x - R - 1} ${b.y}`;
}

/**
 * 从邻接表推导所有边
 * 将图结构转换为边数组
 *
 * @param {Array} NODES - 节点数组
 * @param {Object} ADJ - 邻接表 { nodeId: [targetId, ...] }
 * @returns {Array} 边数组 [ { from, to }, ... ]
 *
 * 示例:
 *   NODES = [{ id: "A" }, { id: "B" }, { id: "C" }]
 *   ADJ = { "A": ["B"], "B": ["C"] }
 *   返回: [ { from: "A", to: "B" }, { from: "B", to: "C" } ]
 */
export function deriveEdges(NODES, ADJ) {
  return NODES.flatMap(n => (ADJ[n.id] || []).map(to => ({ from: n.id, to })));
}
