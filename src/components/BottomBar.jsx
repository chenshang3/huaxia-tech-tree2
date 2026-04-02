import React from "react";

// ============================================================
// BottomBar.jsx
// 底部 BFS/DFS 数据结构可视化栏
// ============================================================

export const BottomBar = React.memo(function BottomBar({ step, mode, NMAP }) {
  if (!step || mode === "explore") return null;

  const items = mode === "bfs" ? step.queue : [...(step.stack ?? [])].reverse();
  const col = mode === "bfs" ? "#4a90d9" : "#2ecc71";

  return (
    <div
      style={{
        background: "rgba(255,252,245,.98)",
        borderTop: "1px solid rgba(200,160,69,.2)",
        padding: "8px 20px",
        display: "flex",
        gap: 16,
        alignItems: "center",
        flexShrink: 0,
        minHeight: 66,
        boxShadow: "0 -2px 12px rgba(139,105,20,.06)",
      }}
    >
      <div style={{ fontSize: 10, color: "#5a4a38", letterSpacing: 2, minWidth: 68, flexShrink: 0 }}>
        {mode === "bfs" ? (
          <>
            <span style={{ color: "#4a90d9", fontSize: 11 }}>Queue</span>
            <br />
            <span style={{ fontSize: 9 }}>FIFO 队列</span>
          </>
        ) : (
          <>
            <span style={{ color: "#2ecc71", fontSize: 11 }}>Stack</span>
            <br />
            <span style={{ fontSize: 9 }}>LIFO 栈</span>
          </>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 5,
          flex: 1,
          overflow: "auto",
          alignItems: "center",
          paddingBottom: 2,
        }}
      >
        {!items || !items.length ? (
          <span
            style={{
              fontSize: 11,
              color: "rgba(139,105,20,.3)",
              fontFamily: '"JetBrains Mono"',
            }}
          >
            [ empty ]
          </span>
        ) : (
          items.map((id, i) => (
            <div
              key={`${id}-${i}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
                padding: "4px 9px",
                borderRadius: 4,
                flexShrink: 0,
                background: `${col}10`,
                border: `1px solid ${i === 0 ? col + "80" : col + "25"}`,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: col,
                  fontFamily: '"Noto Sans SC"',
                  letterSpacing: 1,
                }}
              >
                {NMAP[id]?.name}
              </span>
              {i === 0 && (
                <span style={{ fontSize: 8, color: `${col}70` }}>
                  {mode === "bfs" ? "front" : "top"}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 104, flexShrink: 0 }}>
        <div style={{ fontSize: 9, color: "#5a4a38", letterSpacing: 2, marginBottom: 2 }}>
          正在访问
        </div>
        <div
          style={{
            fontSize: 15,
            fontFamily: '"ZCOOL XiaoWei",serif',
            letterSpacing: 2,
            color: "#e74c3c",
          }}
        >
          {NMAP[step.cur]?.name}
        </div>
        <div
          style={{
            fontSize: 9,
            color: "rgba(231,76,60,.5)",
            fontFamily: '"JetBrains Mono"',
          }}
        >
          {NMAP[step.cur]?.era}
        </div>
      </div>

      <div
        style={{
          borderLeft: "1px solid rgba(200,160,69,.12)",
          paddingLeft: 14,
          flexShrink: 0,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontFamily: '"ZCOOL XiaoWei",serif',
            color: "#c8a045",
            lineHeight: 1,
          }}
        >
          {step.visited.size}
        </div>
        <div style={{ fontSize: 9, color: "#5a4a38", letterSpacing: 1 }}>已访问</div>
      </div>
    </div>
  );
});
