// ============================================================
// useTraversal.js
// 节点选择与遍历算法执行
// ============================================================
// 职责:
// 1. 管理当前选中的节点
// 2. 管理遍历模式(explore/bfs/dfs)
// 3. 执行遍历算法并获取步骤序列
// 4. 控制播放进度
//
// 模式说明:
//   - "explore": 探索模式,点击节点选中查看详情
//   - "bfs": 广度优先遍历Breadth-First Search
//   - "dfs": 深度优先遍历Depth-First Search
//
// 遍历结果:
//
//   steps: 步骤数组
//     [
//       {
//         cur: "当前节点ID",
//         visited: ["已访问节点ID", ...],
//         queue/stack: ["待访问节点ID", ...],  // BFS用queue, DFS用stack
//         discovered: ["已发现节点ID", ...],
//         fresh: ["新发现节点ID", ...]
//       },
//       ...
//     ]
// ============================================================

import { useState, useCallback } from "react";
import { runBFS, runDFS } from "../services/api";

/**
 * 遍历控制Hook
 * 管理节点选择和遍历算法执行
 *
 * @returns {Object}
 *   {
 *     sel: string|null,     // 当前选中节点ID
 *     mode: string,       // 当前模式("explore"|"bfs"|"dfs")
 *     setMode: Function,  // 设置模式
 *     steps: Array,    // 遍历步骤数组
 *     setSteps: Function, // 设置步骤
 *     si: number,     // 当前步骤索引
 *     setSi: Function, // 设置步骤索引
 *     playing: boolean, // 播放中标志
 *     setPlaying: Function, // 设置播放
 *     onNode: Function // 节点点击回调
 *   }
 */
export function useTraversal() {
  // ===================== 状态定义 =====================
  // 当前选中的节点ID
  const [sel, setSel] = useState(null);
  // 当前模式: explore(探索)/bfs/dfs
  const [mode, setMode] = useState("explore");
  // 遍历步骤数组
  const [steps, setSteps] = useState([]);
  // 当前步骤索引
  const [si, setSi] = useState(0);
  // 播放中标志
  const [playing, setPlaying] = useState(false);

  // ===================== 节点点击 =====================
  /**
   * 节点点击回调
   * 在explore模式下直接选中
   * 在bfs/dfs模式下运行算法
   *
   * @param {string} id - 点击的节点ID
   */
  const onNode = useCallback((id) => {
    // 选中节点
    setSel(id);

    // 只有在遍历模式下才运行算法
    if (mode !== "explore") {
      // 选择算法
      const algo = mode === "bfs" ? runBFS : runDFS;
      // 执行算法获取步骤序列
      algo(id).then(s => {
        // 设置步骤,重置索引
        setSteps(s);
        setSi(0);
        // 停止播放
        setPlaying(false);
      });
    }
  }, [mode]);

  // ===================== 返回 =====================
  return {
    sel,
    mode,
    setMode,
    steps,
    setSteps,
    si,
    setSi,
    playing,
    setPlaying,
    onNode,
  };
}
