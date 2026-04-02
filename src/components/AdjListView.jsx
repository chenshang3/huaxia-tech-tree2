import React from "react";

// ============================================================
// AdjListView.jsx
// 邻接表代码风格视图
// ============================================================

export const AdjListView = React.memo(function AdjListView({ NODES, ADJ, CAT, step, onNode }) {
  return (
    <div
      style={{
        padding: "20px 24px",
        overflow: "auto",
        height: "100%",
        fontFamily: '"JetBrains Mono",monospace',
        background: "#faf8f5",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: "#5a4a38",
          letterSpacing: 2,
          marginBottom: 14,
          borderBottom: "1px solid rgba(139,105,20,.12)",
          paddingBottom: 10,
        }}
      >
        邻接表 · HashMap&lt;String, List&lt;String&gt;&gt; — 空间复杂度 O(V+E)
      </div>

      {NODES.map(node => {
        const nbrs = ADJ[node.id];
        const isCur = step?.cur === node.id;
        const isVis = step?.visited?.has(node.id);

        return (
          <div
            key={node.id}
            onClick={() => onNode(node.id)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              padding: "6px 10px",
              marginBottom: 3,
              borderRadius: 5,
              cursor: "pointer",
              background: isCur
                ? "rgba(231,76,60,.08)"
                : isVis
                ? "rgba(200,160,69,.06)"
                : "transparent",
              borderLeft: `2.5px solid ${
                isCur ? "#e74c3c" : isVis ? "rgba(139,105,20,.45)" : "transparent"
              }`,
              transition: "all .3s",
            }}
          >
            <span style={{ color: CAT[node.cat]?.color, minWidth: 110, fontSize: 11 }}>
              {node.id}
            </span>
            <span style={{ color: "rgba(139,105,20,.3)" }}>→</span>
            <span style={{ fontSize: 11 }}>
              <span style={{ color: "rgba(139,105,20,.25)" }}>[</span>
              {nbrs.length === 0 ? (
                <span style={{ color: "rgba(139,105,20,.2)" }}> ∅ </span>
              ) : (
                nbrs.map((n, i) => (
                  <span key={n}>
                    <span
                      style={{
                        color: step?.fresh?.includes(n)
                          ? "#e74c3c"
                          : step?.visited?.has(n)
                          ? "#c8a045"
                          : "#4a90d9",
                      }}
                    >
                      {n}
                    </span>
                    {i < nbrs.length - 1 && (
                      <span style={{ color: "rgba(139,105,20,.25)" }}>, </span>
                    )}
                  </span>
                ))
              )}
              <span style={{ color: "rgba(139,105,20,.25)" }}> ]</span>
            </span>
            <span
              style={{
                marginLeft: "auto",
                color: "rgba(90,74,56,.5)",
                fontSize: 10,
              }}
            >
              {node.name}
            </span>
          </div>
        );
      })}
    </div>
  );
});
