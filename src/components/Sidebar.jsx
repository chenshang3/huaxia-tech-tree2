// ============================================================
// Sidebar.jsx
// 左侧边栏组件
// ============================================================
// 职责:
// 1. 显示节点类别图例
// 2. 显示遍历模式图例
// 3. 显示图结构统计
// 4. 显示算法复杂度
// 5. 提供步骤控制(播放/暂停/步进)
//
// 面板内容:
//
//   - 节点类别 (Category legend)
//   - 遍历图例 (Traversal legend)
//   - 图结构统计 (V, E, 类型, 存储)
//   - 算法复杂度 (O(V+E))
//   - 步骤控制 (仅bfs/dfs模式)
// ============================================================

import React from "react";
import { Sec } from "./ui/Sec";
import { Mono } from "./ui/Mono";

/**
 * 左侧边栏
 * @param {Object} props
 * @param {Object} props.CAT - 类别映射
 * @param {Array} props.NODES - 节点数组
 * @param {Array} props.EDGES - 边数组
 * @param {string} props.mode - 当前模式
 * @param {Array} props.steps - 遍历步骤
 * @param {number} props.si - 当前步骤索引
 * @param {boolean} props.playing - 播放中
 * @param {Function} props.setSi - 设置步骤索引
 * @param {Function} props.setPlaying - 设置播放状态
 * @param {Function} props.setSteps - 设置步骤
 * @param {boolean} props.isOpen - 展开状态
 * @param {Function} props.setIsOpen - 设置展开状态
 */
export const Sidebar = React.memo(function Sidebar({
  CAT,
  NODES,
  EDGES,
  mode,
  steps,
  si,
  playing,
  setSi,
  setPlaying,
  setSteps,
  isOpen,
  setIsOpen,
}) {
  const panelClassName = `side-panel sidebar${isOpen ? "" : " side-panel--collapsed"}`;

  return (
    <>
      {/* 折叠按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(p => !p)}
        className="side-panel-toggle side-panel-toggle--left"
        aria-label={isOpen ? "收起左侧边栏" : "展开左侧边栏"}
        aria-expanded={isOpen}
        style={{
          "--toggle-offset": isOpen ? "170px" : "0px",
          "--toggle-bg": isOpen ? "rgba(200,160,69,.15)" : "rgba(200,160,69,.3)",
        }}
      />
      <aside className={panelClassName} style={{ "--panel-width": "172px" }}>
        <div className="side-panel__content">
      {/* 节点类别 */}
      <Sec title="节点类别">
        {Object.entries(CAT).map(([k, { color, label }]) => (
          <div key={k} className="sidebar__legend-row">
            <div className="sidebar__legend-dot" style={{ "--dot-color": color }} />
            <span className="sidebar__legend-text">{label}</span>
          </div>
        ))}
      </Sec>

      {/* 遍历图例 */}
      <Sec title="遍历图例">
        {[
          ["#e74c3c", "当前节点"],
          ["#c8a045", "已访问"],
          ["#4a90d9", "队列 BFS"],
          ["#2ecc71", "栈 DFS"],
        ].map(([c, l]) => (
          <div key={l} className="sidebar__legend-row">
            <div className="sidebar__legend-dot" style={{ "--dot-color": c }} />
            <span className="sidebar__legend-text">{l}</span>
          </div>
        ))}
      </Sec>

      {/* 图结构统计 */}
      <Sec title="图结构统计">
        <Mono color="#6b5d4d">
          |V| = {NODES.length} 节点{"\n"}
          |E| = {EDGES.length} 有向边{"\n"}
          类型: DAG{"\n"}
          存储: 邻接表
        </Mono>
      </Sec>

      {/* 算法复杂度 */}
      <Sec title="复杂度">
        <Mono color="#7a8a60">
          BFS/DFS: O(V+E){"\n"}
          邻接表: O(V+E)
        </Mono>
      </Sec>

      {/* 步骤控制 (仅在遍历模式下显示) */}
      {mode !== "explore" && (
        <Sec title="步骤控制">
          {steps.length === 0 ? (
            <div className="sidebar__control-empty">
              点击节点
              <br />
              开始{mode === "bfs" ? "广度" : "深度"}优先遍历
            </div>
          ) : (
            <>
              {/* 播放控制按钮 */}
              <div className="sidebar__control-row">
                {[
                  ["◀", () => setSi(Math.max(0, si - 1))],
                  [playing ? "⏸" : "▶", () => setPlaying(p => !p)],
                  ["▶", () => setSi(Math.min(steps.length - 1, si + 1))],
                ].map(([icon, fn], i) => (
                  <button
                    key={i}
                    onClick={fn}
                    className="sidebar__control-button"
                  >
                    {icon}
                  </button>
                ))}
              </div>
              {/* 步骤指示 */}
              <div className="sidebar__control-step">
                步骤 {si + 1} / {steps.length}
              </div>
              {/* 重置按钮 */}
              <button
                onClick={() => {
                  setSteps([]);
                  setSi(0);
                  setPlaying(false);
                }}
                className="sidebar__reset"
              >
                重置
              </button>
            </>
          )}
        </Sec>
      )}
        </div>
      </aside>
    </>
  );
});
