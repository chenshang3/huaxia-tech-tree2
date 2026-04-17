// ============================================================
// Header.jsx
// 顶部导航栏组件
// ============================================================

import React from "react";
import { Btn } from "./ui/Btn";

export const Header = React.memo(function Header({ mode, setMode, tab, setTab, setSteps, setSi, setPlaying, onSearchClick, onGuideClick }) {
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setSteps([]);
    setSi(0);
    setPlaying(false);
  };

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <h1 className="app-header__title">华夏科技树</h1>
        <span className="app-header__subtitle">CHINA TECHNOLOGY DAG</span>
      </div>

      <div className="app-header__group">
        <Btn
          active={mode === "explore"}
          col="200,160,69"
          onClick={() => handleModeChange("explore")}
        >
          探索
        </Btn>
        <Btn
          active={mode === "bfs"}
          col="74,144,217"
          onClick={() => handleModeChange("bfs")}
        >
          BFS 广度优先
        </Btn>
        <Btn
          active={mode === "dfs"}
          col="46,204,113"
          onClick={() => handleModeChange("dfs")}
        >
          DFS 深度优先
        </Btn>
      </div>

      <div className="app-header__group">
        <Btn
          active={false}
          col="200,160,69"
          onClick={onSearchClick}
          title="按 Cmd+K 或 Ctrl+K 快速搜索"
        >
          🔍 搜索
        </Btn>
        <div
          className={`tab-slider ${tab === "adjlist" ? "tab-slider--adjlist" : ""}`}
          role="tablist"
          aria-label="视图切换"
        >
          <div className="tab-slider__thumb" aria-hidden="true" />
          <button
            type="button"
            role="tab"
            aria-selected={tab === "graph"}
            className={`tab-slider__option ${tab === "graph" ? "is-active" : ""}`}
            onClick={() => setTab("graph")}
          >
            知识图谱
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "adjlist"}
            className={`tab-slider__option ${tab === "adjlist" ? "is-active" : ""}`}
            onClick={() => setTab("adjlist")}
          >
            邻接表
          </button>
        </div>
        <Btn
          active={false}
          col="139,105,20"
          onClick={onGuideClick}
        >
          📖 新手引导
        </Btn>
      </div>
    </header>
  );
});
