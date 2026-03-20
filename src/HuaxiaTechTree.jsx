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

import { useState, useMemo } from "react";

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
import { LoadingScreen, ErrorScreen } from "./components/StateScreen";

import { modeColor } from "./utils/constants";
import { deriveEdges } from "./utils/graphUtils";

export default function HuaxiaTechTree() {
  const [tab, setTab] = useState("graph");
  const { NODES, POS, CAT, ADJ, RADJ, NMAP, loading, error } = useGraphData();

  const {
    pan,
    timelinePanX,
    scale,
    isDragging,
    viewportRef,
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

  useAutoPlay(playing, steps.length, setSi, setPlaying);

  const EDGES = useMemo(() => deriveEdges(NODES, ADJ), [NODES, ADJ]);
  const step = steps[si] ?? null;
  const selD = sel ? NMAP[sel] : null;

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
        />
      </div>

      <BottomBar step={step} mode={mode} NMAP={NMAP} />
    </div>
  );
}