// ============================================================
// Sidebar.jsx
// 左侧边栏组件
// ============================================================

import { Sec } from "./ui/Sec";
import { Mono } from "./ui/Mono";

export function Sidebar({
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
  return (
    <>
      <button
        onClick={() => setIsOpen(p => !p)}
        style={{
          position: "absolute",
          left: isOpen ? 170 : 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: 20,
          height: 40,
          background: isOpen ? "rgba(200,160,69,.15)" : "rgba(200,160,69,.3)",
          border: "1px solid rgba(200,160,69,.3)",
          borderRadius: isOpen ? "0 4px 4px 0" : "0 4px 4px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 10,
          transition: "left 0.25s ease, background 0.2s ease",
          padding: 0,
        }}
      >
        <span style={{ color: "#8b6914", fontSize: 10 }}>{isOpen ? "«" : "»"}</span>
      </button>
      <aside
        style={{
          width: isOpen ? 172 : 0,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "rgba(255,252,248,.95)",
          borderRight: "1px solid rgba(200,160,69,.15)",
          padding: isOpen ? "14px 12px" : "14px 0",
          gap: 9,
          overflow: "hidden",
          transition: "width 0.25s ease, padding 0.25s ease",
        }}
      >
      <Sec title="节点类别">
        {Object.entries(CAT).map(([k, { color, label }]) => (
          <div
            key={k}
            style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 4px ${color}50`,
              }}
            />
            <span style={{ fontSize: 11, color: "#5a4a38" }}>{label}</span>
          </div>
        ))}
      </Sec>

      <Sec title="遍历图例">
        {[
          ["#e74c3c", "当前节点"],
          ["#c8a045", "已访问"],
          ["#4a90d9", "队列 BFS"],
          ["#2ecc71", "栈 DFS"],
        ].map(([c, l]) => (
          <div
            key={l}
            style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: c,
                boxShadow: `0 0 3px ${c}40`,
              }}
            />
            <span style={{ fontSize: 10, color: "#5a4a38" }}>{l}</span>
          </div>
        ))}
      </Sec>

      <Sec title="图结构统计">
        <Mono color="#6b5d4d">
          |V| = {NODES.length} 节点{"\n"}
          |E| = {EDGES.length} 有向边{"\n"}
          类型: DAG{"\n"}
          存储: 邻接表
        </Mono>
      </Sec>

      <Sec title="复杂度">
        <Mono color="#7a8a60">
          BFS/DFS: O(V+E){"\n"}
          邻接表: O(V+E)
        </Mono>
      </Sec>

      {mode !== "explore" && (
        <Sec title="步骤控制">
          {steps.length === 0 ? (
            <div
              style={{
                fontSize: 10,
                color: "#8b7355",
                lineHeight: 1.8,
                fontStyle: "italic",
              }}
            >
              点击节点
              <br />
              开始{mode === "bfs" ? "广度" : "深度"}优先遍历
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                {[
                  ["◀", () => setSi(Math.max(0, si - 1))],
                  [playing ? "⏸" : "▶", () => setPlaying(p => !p)],
                  ["▶", () => setSi(Math.min(steps.length - 1, si + 1))],
                ].map(([icon, fn], i) => (
                  <button
                    key={i}
                    onClick={fn}
                    style={{
                      flex: 1,
                      padding: "5px 0",
                      fontSize: 12,
                      background: "rgba(200,160,69,.12)",
                      color: "#8b6914",
                      border: "1px solid rgba(200,160,69,.3)",
                      borderRadius: 4,
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#5a4a38",
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                步骤 {si + 1} / {steps.length}
              </div>
              <button
                onClick={() => {
                  setSteps([]);
                  setSi(0);
                  setPlaying(false);
                }}
                style={{
                  width: "100%",
                  padding: "4px",
                  fontSize: 10,
                  background: "transparent",
                  color: "#8b7355",
                  border: "1px solid rgba(200,160,69,.15)",
                  borderRadius: 4,
                }}
              >
                重置
              </button>
            </>
          )}
        </Sec>
      )}
    </aside>
    </>
  );
}
