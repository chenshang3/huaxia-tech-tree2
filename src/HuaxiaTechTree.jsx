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

  useAutoPlay(playing, steps.length, setSi, setPlaying, steps, actions.panToNode, POS, si);

  // sel 变化时自动平移到目标节点
  useEffect(() => {
    if (sel && POS[sel]) {
      actions.panToNode(sel, POS);
    }
  }, [sel, POS, actions.panToNode]);

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
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#f5f0e8",
        color: "#2c2416",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: '"Noto Sans SC",sans-serif',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&family=Noto+Serif+SC:wght@400;700&family=Noto+Sans+SC:wght@300;400&family=JetBrains+Mono:wght@400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;user-select:none}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#e8e0d4}::-webkit-scrollbar-thumb{background:#c8a045;border-radius:3px}
        button{cursor:pointer;border:none;font-family:inherit}
        @keyframes pulse{0%,100%{opacity:.07}50%{opacity:.02}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
      `}</style>

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

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
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

        <main
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
            background: "#ebe5d8",
          }}
        >
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
              style={{
                position: "absolute",
                bottom: 16,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(255,252,245,.95)",
                border: `1px solid rgba(${modeColor(mode)},.4)`,
                padding: "8px 18px",
                borderRadius: 6,
                fontSize: 12,
                color: `rgb(${modeColor(mode)})`,
                pointerEvents: "none",
                letterSpacing: 1,
                boxShadow: "0 2px 12px rgba(0,0,0,.08)",
              }}
            >
              {mode === "bfs"
                ? "⬛ 点击任意节点，开始广度优先搜索 BFS"
                : "🔺 点击任意节点，开始深度优先搜索 DFS"}
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