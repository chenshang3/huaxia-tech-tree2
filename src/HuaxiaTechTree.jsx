// ============================================================
// HuaxiaTechTree.jsx
// 华夏文明科技树 —— 历史卷轴式沉浸体验入口
// ============================================================

import { useEffect, useMemo } from "react";

import { useGraphData } from "./hooks/useGraphData";
import { usePanZoom } from "./hooks/usePanZoom";
import { HuaxiaScrollExperience } from "./components/scroll/HuaxiaScrollExperience";
import { LoadingScreen, ErrorScreen } from "./components/StateScreen";
import { normalizeUiConfig } from "./config/uiConfig";
import { deriveEdges } from "./utils/graphUtils";

function buildFallbackMaps(nodes) {
  const adj = Object.fromEntries(nodes.map((node) => [node.id, node.outEdges || []]));
  const radj = Object.fromEntries(nodes.map((node) => [node.id, []]));
  const nmap = Object.fromEntries(nodes.map((node) => [node.id, node]));

  nodes.forEach((node) => {
    (node.outEdges || []).forEach((targetId) => {
      if (radj[targetId]) radj[targetId].push(node.id);
    });
  });

  return { adj, radj, nmap };
}

export default function HuaxiaTechTree({ uiConfig: uiConfigOverride } = {}) {
  const { NODES, POS, CAT, ADJ, RADJ, NMAP, timelineConfig, uiConfig, loading, error } = useGraphData();
  const {
    pan,
    scale,
    isDragging,
    viewportRef,
    setBounds,
    handlers,
    actions,
  } = usePanZoom();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector("[data-scroll-search]")?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const graphMaps = useMemo(() => {
    if (Object.keys(NMAP || {}).length) {
      return { adj: ADJ, radj: RADJ, nmap: NMAP };
    }
    return buildFallbackMaps(NODES);
  }, [ADJ, RADJ, NMAP, NODES]);
  const EDGES = useMemo(() => deriveEdges(NODES, graphMaps.adj), [NODES, graphMaps.adj]);
  const resolvedUiConfig = useMemo(
    () => normalizeUiConfig(uiConfigOverride || uiConfig),
    [uiConfigOverride, uiConfig]
  );

  useEffect(() => {
    if (NODES.length === 0 || Object.keys(POS).length === 0) return;

    const timeoutId = setTimeout(() => {
      const viewportEl = viewportRef.current;
      if (!viewportEl) return;

      const rect = viewportEl.getBoundingClientRect();
      const viewportWidth = rect.width;
      const viewportHeight = rect.height;
      const xValues = Object.values(POS).map((position) => position.x);
      const yValues = Object.values(POS).map((position) => position.y);

      setBounds(
        Math.min(...xValues),
        Math.max(...xValues),
        viewportWidth,
        Math.min(...yValues),
        Math.max(...yValues),
        viewportHeight
      );
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [NODES, POS, setBounds, viewportRef]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;

  return (
    <HuaxiaScrollExperience
      NODES={NODES}
      POS={POS}
      CAT={CAT}
      EDGES={EDGES}
      ADJ={graphMaps.adj}
      RADJ={graphMaps.radj}
      NMAP={graphMaps.nmap}
      timelineConfig={timelineConfig}
      uiConfig={resolvedUiConfig}
      pan={pan}
      scale={scale}
      viewportRef={viewportRef}
      handlers={handlers}
      actions={actions}
      isDragging={isDragging}
    />
  );
}
