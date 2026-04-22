// ============================================================
// Header.jsx
// 顶部导航栏组件
// ============================================================
// 职责:
// 1. 显示品牌logo
// 2. 模式切换(explore/bfs/dfs)
// 3. 视图切换(graph/adjlist)
// 4. 搜索和引导按钮
// ============================================================

import React from "react";
import { Btn } from "./ui/Btn";

/**
 * 滑块度量Hook
 * 用于计算活动选项的位置和宽度
 * 用于实现滑动高亮效果
 */
function useSliderMetrics(activeKey, optionKeys) {
  const containerRef = React.useRef(null);
  const optionRefs = React.useRef({});
  const [metrics, setMetrics] = React.useState({ left: 0, width: 0 });

  React.useLayoutEffect(() => {
    const updateMetrics = () => {
      const container = containerRef.current;
      const activeOption = optionRefs.current[activeKey];
      if (!container || !activeOption) return;

      const containerRect = container.getBoundingClientRect();
      const optionRect = activeOption.getBoundingClientRect();

      setMetrics({
        left: optionRect.left - containerRect.left,
        width: optionRect.width,
      });
    };

    updateMetrics();
    window.addEventListener("resize", updateMetrics);
    return () => window.removeEventListener("resize", updateMetrics);
  }, [activeKey, optionKeys]);

  return { containerRef, optionRefs, metrics };
}

/**
 * 顶部导航栏
 * @param {string} props.mode - 当前模式
 * @param {Function} props.setMode - 设置模式
 * @param {string} props.tab - 当前视图
 * @param {Function} props.setTab - 设置视图
 * @param {Function} props.setSteps - 设置步骤
 * @param {Function} props.setSi - 设置步骤索引
 * @param {Function} props.setPlaying - 设置播放状态
 * @param {Function} props.onSearchClick - 搜索点击
 * @param {Function} props.onGuideClick - 引导点击
 */
export const Header = React.memo(function Header({ mode, setMode, tab, setTab, setSteps, setSi, setPlaying, onSearchClick, onGuideClick }) {
  const modeKeys = React.useMemo(() => ["explore", "bfs", "dfs"], []);
  const tabKeys = React.useMemo(() => ["graph", "adjlist"], []);
  const modeSlider = useSliderMetrics(mode, modeKeys);
  const tabSlider = useSliderMetrics(tab, tabKeys);

  // 切换模式时重置遍历状态
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setSteps([]);
    setSi(0);
    setPlaying(false);
  };

  return (
    <header className="app-header">
      {/* 品牌 */}
      <div className="app-header__brand">
        <h1 className="app-header__title">华夏科技树</h1>
        <span className="app-header__subtitle">CHINA TECHNOLOGY DAG</span>
      </div>

      {/* 模式切换 */}
      <div className="app-header__group">
        <div
          ref={modeSlider.containerRef}
          className={`mode-slider mode-slider--${mode}`}
          role="tablist"
          aria-label="模式切换"
          style={{
            "--slider-thumb-left": `${modeSlider.metrics.left}px`,
            "--slider-thumb-width": `${modeSlider.metrics.width}px`,
          }}
        >
          <div className="mode-slider__thumb" aria-hidden="true" />
          <button
            ref={(node) => {
              modeSlider.optionRefs.current.explore = node;
            }}
            type="button"
            role="tab"
            aria-selected={mode === "explore"}
            className={`mode-slider__option ${mode === "explore" ? "is-active" : ""}`}
            onClick={() => handleModeChange("explore")}
          >
            探索
          </button>
          <button
            ref={(node) => {
              modeSlider.optionRefs.current.bfs = node;
            }}
            type="button"
            role="tab"
            aria-selected={mode === "bfs"}
            className={`mode-slider__option ${mode === "bfs" ? "is-active" : ""}`}
            onClick={() => handleModeChange("bfs")}
          >
            BFS 广度优先
          </button>
          <button
            ref={(node) => {
              modeSlider.optionRefs.current.dfs = node;
            }}
            type="button"
            role="tab"
            aria-selected={mode === "dfs"}
            className={`mode-slider__option ${mode === "dfs" ? "is-active" : ""}`}
            onClick={() => handleModeChange("dfs")}
          >
            DFS 深度优先
          </button>
        </div>
      </div>

      {/* 视图切换和按钮 */}
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
          ref={tabSlider.containerRef}
          className={`tab-slider ${tab === "adjlist" ? "tab-slider--adjlist" : ""}`}
          role="tablist"
          aria-label="视图切换"
          style={{
            "--slider-thumb-left": `${tabSlider.metrics.left}px`,
            "--slider-thumb-width": `${tabSlider.metrics.width}px`,
          }}
        >
          <div className="tab-slider__thumb" aria-hidden="true" />
          <button
            ref={(node) => {
              tabSlider.optionRefs.current.graph = node;
            }}
            type="button"
            role="tab"
            aria-selected={tab === "graph"}
            className={`tab-slider__option ${tab === "graph" ? "is-active" : ""}`}
            onClick={() => setTab("graph")}
          >
            知识图谱
          </button>
          <button
            ref={(node) => {
              tabSlider.optionRefs.current.adjlist = node;
            }}
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
