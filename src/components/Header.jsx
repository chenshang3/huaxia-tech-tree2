// ============================================================
// Header.jsx
// 顶部导航栏组件
// ============================================================

import { Btn } from "./ui/Btn";

export function Header({ mode, setMode, tab, setTab, setSteps, setSi, setPlaying, autoCollapse, setAutoCollapse, idleTimeout, setIdleTimeout }) {
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setSteps([]);
    setSi(0);
    setPlaying(false);
  };

  const timeoutOptions = [
    [0, "关闭"],
    [10000, "10秒"],
    [15000, "15秒"],
    [30000, "30秒"],
    [60000, "60秒"],
  ];

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px",
        background: "rgba(255,252,245,.98)",
        borderBottom: "2px solid rgba(200,160,69,.25)",
        flexShrink: 0,
        gap: 10,
        boxShadow: "0 2px 12px rgba(139,105,20,.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <h1
          style={{
            fontFamily: '"ZCOOL XiaoWei",serif',
            fontSize: 26,
            letterSpacing: 5,
            background: "linear-gradient(135deg,#8b6914,#c8a045,#b8860b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          华夏科技树
        </h1>
        <span style={{ fontSize: 10, color: "#8b7355", letterSpacing: 3 }}>
          CHINA TECHNOLOGY DAG
        </span>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <Btn
          active={mode === "explore"}
          col="200,160,69"
          onClick={() => handleModeChange("explore")}
        >
          🗺 探索
        </Btn>
        <Btn
          active={mode === "bfs"}
          col="74,144,217"
          onClick={() => handleModeChange("bfs")}
        >
          ⬛ BFS 广度优先
        </Btn>
        <Btn
          active={mode === "dfs"}
          col="46,204,113"
          onClick={() => handleModeChange("dfs")}
        >
          🔺 DFS 深度优先
        </Btn>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <Btn
          active={tab === "graph"}
          col="200,160,69"
          onClick={() => setTab("graph")}
        >
          知识图谱
        </Btn>
        <Btn
          active={tab === "adjlist"}
          col="74,144,217"
          onClick={() => setTab("adjlist")}
        >
          邻接表
        </Btn>
        <Btn
          active={autoCollapse}
          col="139,105,20"
          onClick={() => setAutoCollapse(p => !p)}
        >
          {autoCollapse ? "⏱ 自动收回中" : "⏱ 自动收回"}
        </Btn>
        {autoCollapse && (
          <select
            value={idleTimeout}
            onChange={(e) => setIdleTimeout(Number(e.target.value))}
            style={{
              padding: "4px 8px",
              fontSize: 11,
              background: "rgba(255,252,245,.95)",
              border: "1px solid rgba(200,160,69,.3)",
              borderRadius: 4,
              color: "#5a4a38",
              cursor: "pointer",
            }}
          >
            {timeoutOptions.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        )}
      </div>
    </header>
  );
}
