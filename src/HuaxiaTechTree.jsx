// ============================================================
// HuaxiaTechTree.jsx
// 华夏科技树 —— 中国古代科技发明的有向无环图（DAG）可视化组件
//
// 功能概述：
//   - 以节点图的方式展示中国古代科技发明之间的依赖/传承关系
//   - 支持 BFS（广度优先搜索）和 DFS（深度优先搜索）的步骤动画演示
//   - 支持图谱视图与邻接表视图切换
//   - 支持鼠标拖拽平移、滚轮缩放
//   - 点击节点可查看发明详情、前驱/后继关系
// ============================================================、

import { useState, useMemo, useEffect } from "react";

import { useGraphData } from "./hooks/useGraphData";
import { usePanZoom } from "./hooks/usePanZoom";
import { useTraversal } from "./hooks/useTraversal";
import { useAutoPlay } from "./hooks/useAutoPlay";

import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { GraphView } from "./components/GraphView";
import { AdjListView } from "./components/AdjListView";
import { DetailPanel } from "./components/DetailPanel";
import { BottomBar } from "./components/BottomBar";
import { SearchModal } from "./components/SearchModal";
import { WelcomeGuide } from "./components/WelcomeGuide";
import { LoadingScreen, ErrorScreen } from "./components/StateScreen";

import { modeColor } from "./utils/constants";
import { deriveEdges } from "./utils/graphUtils";

export default function HuaxiaTechTree() {
  const [tab, setTab] = useState("graph");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // 处理全局快捷键 Cmd+K / Ctrl+K 打开搜索
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { NODES, POS, CAT, ADJ, RADJ, NMAP, timelineConfig, loading, error } = useGraphData();

  const {
    pan,
    timelinePanX,
    scale,
    isDragging,
    viewportRef,
    setBounds,
    handlers,
    actions,
  } = usePanZoom();
  const { panToNode } = actions;

  const {
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
  } = useTraversal();

  useAutoPlay(playing, steps.length, setSi, setPlaying, steps, panToNode, POS, si);

  // sel 变化时自动平移到目标节点
  useEffect(() => {
    if (sel && POS[sel]) {
      panToNode(sel, POS);
    }
  }, [sel, POS, panToNode]);

  const EDGES = useMemo(() => deriveEdges(NODES, ADJ), [NODES, ADJ]);
  const step = steps[si] ?? null;
  const selD = sel ? NMAP[sel] : null;

  // 设置画布左右拖动范围限制
  useEffect(() => {
    if (NODES.length === 0 || Object.keys(POS).length === 0) return;

    // 等待 viewportRef.current 设置后再执行
    const timeoutId = setTimeout(() => {
      const viewportEl = viewportRef.current;
      if (!viewportEl) return;

      const rect = viewportEl.getBoundingClientRect();
      const viewportWidth = rect.width;

      // 计算节点的实际左右边界
      const xValues = Object.values(POS).map((p) => p.x);
      const minNodeX = Math.min(...xValues);
      const maxNodeX = Math.max(...xValues);

      // 传入节点坐标和视口宽度，由 usePanZoom 动态计算 bounds
      setBounds(minNodeX, maxNodeX, viewportWidth);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [NODES, POS, viewportRef, setBounds]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;

  return (
    <div className="app-shell">
      <Header
        mode={mode}
        setMode={setMode}
        tab={tab}
        setTab={setTab}
        setSteps={setSteps}
        setSi={setSi}
        setPlaying={setPlaying}
        onSearchClick={() => setSearchOpen(true)}
        onGuideClick={() => setShowGuide(true)}
      />

      <div className="app-main-layout">
        <Sidebar
          CAT={CAT}
          NODES={NODES}
          EDGES={EDGES}
          mode={mode}
          steps={steps}
          si={si}
          playing={playing}
          setSi={setSi}
          setPlaying={setPlaying}
          setSteps={setSteps}
          isOpen={leftOpen}
          setIsOpen={setLeftOpen}
        />

        <main className="app-main">
          {tab === "graph" ? (
            <GraphView
              NODES={NODES}
              POS={POS}
              CAT={CAT}
              ADJ={ADJ}
              EDGES={EDGES}
              pan={pan}
              scale={scale}
              timelinePanX={timelinePanX}
              sel={sel}
              step={step}
              mode={mode}
              onNode={onNode}
              handlers={handlers}
              actions={actions}
              viewportRef={viewportRef}
              isDragging={isDragging}
              timelineConfig={timelineConfig}
            />
          ) : (
            <AdjListView
              NODES={NODES}
              ADJ={ADJ}
              CAT={CAT}
              step={step}
              onNode={onNode}
            />
          )}

          {mode !== "explore" && steps.length === 0 && (
            <div
              className="traversal-hint"
              style={{ "--hint-color-rgb": modeColor(mode) }}
            >
              {mode === "bfs"
                ? "点击任意节点，开始广度优先搜索 BFS"
                : "点击任意节点，开始深度优先搜索 DFS"}
            </div>
          )}
        </main>

        <DetailPanel
          selD={selD}
          CAT={CAT}
          ADJ={ADJ}
          RADJ={RADJ}
          NMAP={NMAP}
          onNode={onNode}
          isOpen={rightOpen}
          setIsOpen={setRightOpen}
        />
      </div>

      <BottomBar step={step} mode={mode} NMAP={NMAP} />

      {/* 搜索模态框 */}
      <SearchModal
        NODES={NODES}
        CAT={CAT}
        onSelect={onNode}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* 新手引导 */}
      <WelcomeGuide
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />
    </div>
  );
}
