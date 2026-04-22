import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./HuaxiaScrollExperience.module.css";
import {
  CATEGORY_TONE,
  DEFAULT_PANEL_COLLAPSE_EFFECT,
  ERA_ALIASES,
  ERA_THEMES,
  RULER_LABEL_FONT_SIZE,
  RULER_LABEL_Y,
  RULER_MAJOR_TICK_HEIGHT,
  RULER_MINOR_TICK_HEIGHT,
  RULER_RAIL_Y,
  RULER_VIEW_BOX_HEIGHT,
  VIEW_BOX_WIDTH,
} from "./huaxiaScrollConstants";
import {
  ERA_BACKGROUNDS_BY_NAME,
  ERA_BACKGROUND_SETTINGS,
} from "../../config/eraBackgrounds";
import { NodeTooltip } from "../NodeTooltip";
import { NODE_RADIUS, VIEW_BOX } from "../../utils/constants";
import { edgePath } from "../../utils/graphUtils";
import { buildTimelineTicks, computeEraTimelinePositions } from "../../utils/timelineUtils";
import { buildRadiusCssVars } from "../../config/uiConfig";

export {
  DEFAULT_PANEL_COLLAPSE_EFFECT,
  PANEL_COLLAPSE_EFFECTS,
} from "./huaxiaScrollConstants";

const BLANK_CLICK_DRAG_THRESHOLD = 6;

function normalizeCategories(categories) {
  if (!Array.isArray(categories)) return categories || {};

  return categories.reduce((acc, item) => {
    const fallback = CATEGORY_TONE[item.code] || {};
    acc[item.code] = {
      ...item,
      label: item.name || fallback.name || item.code,
      color: fallback.tone || "#6F4A2A",
      seal: fallback.seal || "技",
    };
    return acc;
  }, {});
}

function formatYear(year) {
  if (typeof year !== "number") return "纪年未详";
  if (year < 0) return `公元前${Math.abs(year)}年`;
  return `公元${year}年`;
}

function normalizeEraName(eraName) {
  return ERA_ALIASES[eraName] || eraName;
}

function collectLineage(nodeId, ADJ, RADJ) {
  const ancestors = new Set();
  const descendants = new Set();
  const edges = new Set();

  const walkBack = (currentId) => {
    (RADJ[currentId] || []).forEach((parentId) => {
      edges.add(`${parentId}->${currentId}`);
      if (ancestors.has(parentId)) return;
      ancestors.add(parentId);
      walkBack(parentId);
    });
  };

  const walkForward = (currentId) => {
    (ADJ[currentId] || []).forEach((childId) => {
      edges.add(`${currentId}->${childId}`);
      if (descendants.has(childId)) return;
      descendants.add(childId);
      walkForward(childId);
    });
  };

  if (nodeId) {
    walkBack(nodeId);
    walkForward(nodeId);
  }

  return {
    ancestors,
    descendants,
    nodes: new Set([nodeId, ...ancestors, ...descendants].filter(Boolean)),
    edges,
  };
}

function buildEraSections(nodes, timelineConfig, categories) {
  const grouped = new Map();
  nodes.forEach((node) => {
    const eraName = normalizeEraName(node.era);
    if (!grouped.has(eraName)) grouped.set(eraName, []);
    grouped.get(eraName).push(node);
  });

  return timelineConfig
    .map((era) => {
      const eraNodes = (grouped.get(era.name) || []).sort((a, b) => a.year - b.year);
      const categoryNames = Array.from(new Set(eraNodes.map((node) => categories[node.cat]?.label || node.cat)));
      const representative = eraNodes.reduce((best, node) => {
        if (!best) return node;
        return (node.outEdges?.length || 0) > (best.outEdges?.length || 0) ? node : best;
      }, null);

      return {
        ...era,
        nodes: eraNodes,
        theme: ERA_THEMES[era.name] || "一段文明缓缓展开，器物与制度留下可追溯的纹理。",
        categories: categoryNames,
        representative,
        background: ERA_BACKGROUNDS_BY_NAME[era.name] || {
          image: ERA_BACKGROUND_SETTINGS.fallbackImage,
          position: ERA_BACKGROUND_SETTINGS.fallbackPosition,
        },
      };
    });
}

function getEraAtWorldX(eraPositions, worldX) {
  if (!eraPositions.length || !Number.isFinite(worldX)) return "";

  const containing = eraPositions.find((era) => worldX >= era.x1 && worldX < era.x2);
  if (containing) return containing.name;

  return eraPositions.reduce((closest, era) => {
    const eraCenter = (era.x1 + era.x2) / 2;
    const closestCenter = (closest.x1 + closest.x2) / 2;
    return Math.abs(eraCenter - worldX) < Math.abs(closestCenter - worldX) ? era : closest;
  }, eraPositions[0]).name;
}

function ScrollContainer({ children, activeEraName, onSearch, scrollRef }) {
  const publicPath = process.env.PUBLIC_URL || "";
  const handleWheel = (event) => {
    if (event.target.closest?.("[data-tree-viewport]")) return;
    if (!scrollRef.current || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    event.preventDefault();
    scrollRef.current.scrollLeft += event.deltaY;
  };

  return (
    <main
      className={styles.scrollStage}
      style={{
        "--calligraphy-image": `url("${publicPath}/images/backgrounds/cal_2.jpg")`,
        // "--scroll-paper-image": `url("${publicPath}/images/backgrounds/bg_scroll_1.jpg")`,
        "--scroll-scene-image": `url("${publicPath}/images/backgrounds/tsing_ming.jpg")`,
      }}
    >
      <div className={styles.stageBackdrop} aria-hidden="true" />
      <header className={styles.manuscriptHeader}>
        <div className={styles.headerBrand}>
          <img src={`${publicPath}/icon2.png`} alt="" aria-hidden="true" />
          <div className={styles.headerTitleText}>
            <h1>华夏文明科技树</h1>
            <span>Huaxia Civilization Tech Tree</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <span>{activeEraName}</span>
          <button type="button" data-scroll-search onClick={onSearch}>检索技艺</button>
        </div>
      </header>
      <section
        ref={scrollRef}
        className={styles.scrollViewport}
        onWheel={handleWheel}
        aria-label="横向历史卷轴"
      >
        {children}
      </section>
    </main>
  );
}

function TimelineRuler({ timelineConfig, panX, scale, viewportWidthPx }) {
  const ticks = useMemo(
    () => buildTimelineTicks({
      timelineConfig,
      scale,
      viewportWidthPx,
      viewBoxWidth: VIEW_BOX_WIDTH,
      panX,
    }),
    [timelineConfig, scale, viewportWidthPx, panX]
  );

  return (
    <div className={styles.timelineRuler} aria-hidden="true">
      <div className={styles.timelineRulerPointer}>
        <svg viewBox="0 0 20 24" role="presentation" focusable="false">
          <polygon points="5,2 15,2 15,13 10,19 5,13" />
        </svg>
      </div>
      <svg
        className={styles.timelineRulerSvg}
        viewBox={`0 0 ${VIEW_BOX_WIDTH} ${RULER_VIEW_BOX_HEIGHT}`}
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
      >
        <line
          className={styles.timelineRulerRail}
          x1="0"
          y1={RULER_RAIL_Y}
          x2={VIEW_BOX_WIDTH}
          y2={RULER_RAIL_Y}
        />
        <g transform={`translate(${panX}, 0) scale(${scale}, 1)`}>
          {ticks.map((tick) => {
            const tickHeight = tick.isMajor ? RULER_MAJOR_TICK_HEIGHT : RULER_MINOR_TICK_HEIGHT;
            return (
              <g key={`tick-${tick.year}`}>
                <line
                  className={tick.isBoundary ? styles.timelineRulerBoundary : styles.timelineRulerTick}
                  x1={tick.x}
                  y1={RULER_RAIL_Y - tickHeight}
                  x2={tick.x}
                  y2={RULER_RAIL_Y}
                />
              </g>
            );
          })}
        </g>
      </svg>
      <div className={styles.timelineRulerLabels} aria-hidden="true">
        {ticks.map((tick) => (
          tick.label ? (
            <span
              key={`label-${tick.year}`}
              className={styles.timelineRulerLabel}
              style={{
                left: `${(tick.viewportX / VIEW_BOX_WIDTH) * 100}%`,
                top: `${RULER_LABEL_Y}px`,
                fontSize: `${RULER_LABEL_FONT_SIZE}px`,
              }}
            >
              {tick.label}
            </span>
          ) : null
        ))}
      </div>
    </div>
  );
}

function Timeline({ eras, activeEraName, onEraSelect }) {
  return (
    <nav className={styles.timeline} aria-label="时代索引">
      <span className={styles.timelineStart}>卷首</span>
      {eras.map((era) => (
        <button
          type="button"
          key={era.name}
          className={`${styles.timelineItem} ${activeEraName === era.name ? styles.timelineItemActive : ""}`}
          onClick={() => onEraSelect(era.name)}
        >
          <span>{era.name}</span>
        </button>
      ))}
      <span className={styles.timelineEnd}>未竟</span>
    </nav>
  );
}

function PanelToggle({ side, isOpen, onToggle }) {
  return (
    <button
      type="button"
      className={`${styles.panelToggle} ${styles[`panelToggle${side === "left" ? "Left" : "Right"}`]}`}
      onClick={onToggle}
      aria-label={isOpen ? `收起${side === "left" ? "左侧卷目" : "右侧笺注"}` : `展开${side === "left" ? "左侧卷目" : "右侧笺注"}`}
      aria-expanded={isOpen}
    />
  );
}

function TreeCodexPanel({ activeEra, selectedNode, lineage, categoryStats, totalNodes, totalEdges, isOpen }) {
  const topCategories = categoryStats.slice(0, 6);

  return (
    <aside
      className={`${styles.treeTitleBlock} ${!isOpen ? styles.panelClosed : ""}`}
      aria-hidden={!isOpen}
    >
      <h2 className={styles.codexTitle}>
        <span>器物相因</span>
        <span>技艺相生</span>
      </h2>

      <div className={styles.codexSection}>
        <span>当前卷段</span>
        <strong>{activeEra?.name || "卷首"}</strong>
        <p>{activeEra?.theme || "移动图谱，时间线会随视野自动切换。"}</p>
      </div>

      <div className={styles.codexStats}>
        <div>
          <strong>{totalNodes}</strong>
          <span>技艺节点</span>
        </div>
        <div>
          <strong>{totalEdges}</strong>
          <span>传承边</span>
        </div>
      </div>

      <div className={styles.codexSection}>
        <span>卷中门类</span>
        <div className={styles.categoryLedger}>
          {topCategories.map((item) => (
            <div key={item.label}>
              <i style={{ background: item.color }} />
              <b>{item.label}</b>
              <em>{item.count}</em>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.codexSection}>
        <span>溯源状态</span>
        {selectedNode ? (
          <p>
            已选「{selectedNode.name}」，上承 {lineage.ancestors.size} 项，下启 {lineage.descendants.size} 项。朱砂线为当前脉络，黛青点为前驱，朱砂点为后继。
          </p>
        ) : (
          <p>悬停查看简注，点击节点展开溯源；顶部时间尺和下方朝代条都会随视野同步响应。</p>
        )}
      </div>
    </aside>
  );
}

function HybridTechTree({
  NODES,
  POS,
  CAT,
  EDGES,
  activeEra,
  selectedId,
  selectedNode,
  lineage,
  categoryStats,
  pan,
  scale,
  viewportRef,
  handlers,
  actions,
  isDragging,
  onSelect,
  onClearSelection,
  leftOpen,
  onToggleLeft,
  timelineConfig,
}) {
  const hasTrace = Boolean(selectedId);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const treeViewportRef = useRef(null);
  const blankCanvasPressRef = useRef({ pending: false, moved: false, startX: 0, startY: 0 });
  const [viewportWidthPx, setViewportWidthPx] = useState(VIEW_BOX_WIDTH);
  const scrollSceneProgress = useMemo(() => {
    const positions = Object.values(POS || {});
    if (!positions.length) return 0;

    const xValues = positions
      .map((position) => position?.x)
      .filter((value) => Number.isFinite(value));

    if (!xValues.length) return 0;

    const minNodeX = Math.min(...xValues);
    const maxNodeX = Math.max(...xValues);
    const minPanX = VIEW_BOX_WIDTH / 2 - maxNodeX * scale;
    const maxPanX = VIEW_BOX_WIDTH / 2 - minNodeX * scale;
    const panSpan = maxPanX - minPanX;

    if (!Number.isFinite(panSpan) || panSpan <= 0) return 0;

    const clampedPanX = Math.min(maxPanX, Math.max(minPanX, pan.x));
    return (maxPanX - clampedPanX) / panSpan;
  }, [POS, pan.x, scale]);

  const resetBlankCanvasPress = () => {
    blankCanvasPressRef.current = { pending: false, moved: false, startX: 0, startY: 0 };
  };

  const handleCanvasMouseDownCapture = (event) => {
    if (event.button !== 0 || event.target.dataset?.blankCanvas !== "true") {
      resetBlankCanvasPress();
      return;
    }

    blankCanvasPressRef.current = {
      pending: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleCanvasMouseMoveCapture = (event) => {
    const press = blankCanvasPressRef.current;
    if (!press.pending || press.moved) return;

    if (Math.hypot(event.clientX - press.startX, event.clientY - press.startY) > BLANK_CLICK_DRAG_THRESHOLD) {
      press.moved = true;
    }
  };

  const handleBlankCanvasClick = () => {
    const press = blankCanvasPressRef.current;
    if (selectedId && press.pending && !press.moved) {
      onClearSelection();
    }
    resetBlankCanvasPress();
  };

  useEffect(() => {
    const viewportShell = treeViewportRef.current;
    if (!viewportShell) return undefined;

    const updateViewportWidth = () => {
      const width = viewportShell.getBoundingClientRect().width;
      setViewportWidthPx(width || VIEW_BOX_WIDTH);
    };

    updateViewportWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewportWidth);
      return () => window.removeEventListener("resize", updateViewportWidth);
    }

    const observer = new ResizeObserver(() => updateViewportWidth());
    observer.observe(viewportShell);

    return () => observer.disconnect();
  }, []);

  return (
    <section className={styles.treeManuscript} aria-label="华夏科技树图谱">
      <PanelToggle side="left" isOpen={leftOpen} onToggle={onToggleLeft} />
      <TreeCodexPanel
        activeEra={activeEra}
        selectedNode={selectedNode}
        lineage={lineage}
        categoryStats={categoryStats}
        totalNodes={NODES.length}
        totalEdges={EDGES.length}
        isOpen={leftOpen}
      />

      <div ref={treeViewportRef} className={styles.treeViewportShell} data-tree-viewport>
        <TimelineRuler
          timelineConfig={timelineConfig}
          panX={pan.x}
          scale={scale}
          viewportWidthPx={viewportWidthPx}
        />

        <div className={styles.treeCanvasBody}>
          <div
            className={styles.treeScrollPainting}
            aria-hidden="true"
            style={{ "--scroll-scene-progress": `${scrollSceneProgress * 100}%` }}
          />
          <svg
            ref={viewportRef}
            className={styles.hybridGraphSvg}
            viewBox={VIEW_BOX}
            preserveAspectRatio="xMidYMin meet"
            xmlns="http://www.w3.org/2000/svg"
            onMouseDownCapture={handleCanvasMouseDownCapture}
            onMouseMoveCapture={handleCanvasMouseMoveCapture}
            onWheel={handlers.onWheel}
            onMouseDown={handlers.onMouseDown}
            onMouseMove={handlers.onMouseMove}
            onMouseUp={handlers.onMouseUp}
            onMouseLeave={handlers.onMouseLeave}
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          >
            <defs>
              <pattern id="hybridPaperGrid" width="54" height="54" patternUnits="userSpaceOnUse">
                <path d="M 54 0 L 0 0 0 54" fill="none" stroke="rgba(74,53,28,.08)" strokeWidth=".7" />
              </pattern>
              <marker id="hybridArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L0,7 L7,3.5z" fill="rgba(74,53,28,.42)" />
              </marker>
              <marker id="hybridArrowTrace" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L0,8 L8,4z" fill="#8f2f28" />
              </marker>
            </defs>

            <rect
              width="100%"
              height="100%"
              fill="transparent"
              data-blank-canvas="true"
              onClick={handleBlankCanvasClick}
            />

            <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
              {EDGES.map((edge) => {
                const edgeKey = `${edge.from}->${edge.to}`;
                const isTraced = lineage.edges.has(edgeKey);
                const isDimmed = hasTrace && !isTraced;

                return (
                  <path
                    key={edgeKey}
                    d={edgePath(edge.from, edge.to, POS, NODE_RADIUS)}
                    fill="none"
                    stroke={isTraced ? "#8f2f28" : "rgba(74,53,28,.34)"}
                    strokeWidth={isTraced ? 3.2 : 1.35}
                    markerEnd={isTraced ? "url(#hybridArrowTrace)" : "url(#hybridArrow)"}
                    opacity={isDimmed ? 0.38 : 0.96}
                    className={isTraced ? styles.traceEdge : styles.treeEdge}
                  />
                );
              })}

              {NODES.map((node) => {
                const position = POS[node.id];
                if (!position) return null;

                const category = CAT[node.cat] || CATEGORY_TONE[node.cat] || {};
                const isSelected = selectedId === node.id;
                const isTraced = lineage.nodes.has(node.id);
                const isDimmed = hasTrace && !isTraced;
                const tone = category.color || category.tone || "#6F4A2A";
                const label = node.name.length > 4 ? [node.name.slice(0, 4), node.name.slice(4)] : [node.name];

                return (
                  <g
                    key={node.id}
                    className={`${styles.treeNode} ${isSelected ? styles.treeNodeSelected : ""}`}
                    transform={`translate(${position.x},${position.y})`}
                    onClick={() => onSelect(node.id)}
                    onMouseEnter={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      setHoveredNode(node);
                      setTooltipPos({
                        x: rect.right,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{
                      "--tree-node-tone": isSelected ? "#8f2f28" : tone,
                      opacity: isDimmed ? 0.4 : 1,
                    }}
                  >
                    {isTraced && (
                      <circle
                        r={NODE_RADIUS + (isSelected ? 15 : 9)}
                        fill={isSelected ? "rgba(143,47,40,.13)" : "rgba(49,79,82,.1)"}
                        className={styles.traceHalo}
                      />
                    )}
                    <circle r={NODE_RADIUS} fill="rgba(255,249,230,.92)" />
                    <circle r={NODE_RADIUS} fill="none" stroke="var(--tree-node-tone)" strokeWidth={isSelected ? 3 : 2} />
                    {label.map((text, index) => (
                      <text
                        key={text}
                        y={label.length === 1 ? 4 : index === 0 ? -5 : 8}
                        textAnchor="middle"
                        fontSize={label.length === 1 ? 10.5 : 9}
                        fill="#2f2619"
                        fontFamily='"Noto Serif SC"'
                        fontWeight="700"
                      >
                        {text}
                      </text>
                    ))}
                    <text
                      y={NODE_RADIUS + 14}
                      textAnchor="middle"
                      fontSize="8"
                      fill="rgba(92,74,51,.62)"
                      fontFamily='"Noto Serif SC"'
                    >
                      {normalizeEraName(node.era)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          <div className={styles.treeControls}>
            <button type="button" className="graph-view__control-button" onClick={actions.zoomIn}>+</button>
            <button type="button" className="graph-view__control-button" onClick={actions.zoomOut}>−</button>
            <button
              type="button"
              className="graph-view__control-button graph-view__control-button--small"
              onClick={() => selectedId ? actions.panToNode(selectedId, POS) : actions.resetView()}
              title="回归原位"
            >
              ◎
            </button>
          </div>
        </div>
      </div>

      <NodeTooltip
        node={hoveredNode}
        CAT={CAT}
        position={tooltipPos}
        isVisible={hoveredNode !== null && !isDragging}
      />
    </section>
  );
}

function AnnotationPanel({ node, categories, predecessorNodes, successorNodes, isOpen, onToggle, onSelect }) {
  if (!node) {
    return (
      <>
        <PanelToggle side="right" isOpen={isOpen} onToggle={onToggle} />
        <aside
          className={`${styles.annotationPanel} ${!isOpen ? styles.panelClosed : ""}`}
          aria-hidden={!isOpen}
        >
          <p className={styles.annotationKicker}>卷旁笺注</p>
          <h2>
            择一技艺
            <br />
            溯其来路
          </h2>
          <p>
            点击科技树中的节点，可见发明缘起、前驱依赖与后续传承。图中会以朱砂线标出可追溯的技术脉络。
          </p>
        </aside>
      </>
    );
  }

  const category = categories[node.cat] || { label: node.cat, color: "#6F4A2A" };

  return (
    <>
    <PanelToggle side="right" isOpen={isOpen} onToggle={onToggle} />
    <aside
      className={`${styles.annotationPanel} ${!isOpen ? styles.panelClosed : ""}`}
      style={{ "--annotation-tone": category.color }}
      aria-hidden={!isOpen}
    >
      <p className={styles.annotationKicker}>{formatYear(node.year)}</p>
      <p className={styles.annotationKicker}>{node.era} · {category.label}</p>
      <h2>{node.name}</h2>
      <p className={styles.annotationLead}>{node.sig}</p>
      <p>{node.desc}</p>
      <dl className={styles.annotationFacts}>
        <div>
          <dt>传述者</dt>
          <dd>{node.inv || "未详"}</dd>
        </div>
      </dl>
      {predecessorNodes.length > 0 && (
        <div className={styles.lineageGroup}>
          <span>前驱来路</span>
          <div className={styles.relatedNodes}>
            {predecessorNodes.slice(0, 6).map((item) => (
              <button type="button" key={item.id} onClick={() => onSelect(item.id)}>
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {successorNodes.length > 0 && (
        <div className={styles.lineageGroup}>
          <span>后继流向</span>
        <div className={styles.relatedNodes}>
          {successorNodes.slice(0, 6).map((item) => (
            <button type="button" key={item.id} onClick={() => onSelect(item.id)}>
              {item.name}
            </button>
          ))}
        </div>
        </div>
      )}
    </aside>
    </>
  );
}

function SearchSheet({ open, nodes, categories, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return nodes.slice(0, 12);
    return nodes
      .filter((node) => {
        return [node.name, node.en, node.era, node.desc, node.sig, node.inv]
          .filter(Boolean)
          .some((text) => text.toLowerCase().includes(keyword));
      })
      .slice(0, 20);
  }, [nodes, query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.searchLayer} role="dialog" aria-modal="true">
      <button type="button" className={styles.searchVeil} onClick={onClose} aria-label="关闭检索" />
      <section className={styles.searchSheet}>
        <div className={styles.searchHead}>
          <div>
            <p className={styles.annotationKicker}>技艺检索</p>
            <h2>从卷中寻一处发明</h2>
          </div>
          <button type="button" onClick={onClose}>合卷</button>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="输入造纸、宋朝、冶金、蔡伦..."
          autoFocus
        />
        <div className={styles.searchResults}>
          {results.map((node) => {
            const category = categories[node.cat] || { label: node.cat };
            return (
              <button type="button" key={node.id} onClick={() => onSelect(node.id)}>
                <strong>{node.name}</strong>
                <span>{node.era} · {formatYear(node.year)} · {category.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function HuaxiaScrollExperience({
  NODES,
  POS,
  CAT,
  EDGES,
  ADJ,
  RADJ,
  NMAP,
  timelineConfig,
  pan,
  scale,
  viewportRef,
  handlers,
  actions,
  isDragging,
  collapseEffect = DEFAULT_PANEL_COLLAPSE_EFFECT,
  uiConfig,
}) {
  const categories = useMemo(() => normalizeCategories(CAT), [CAT]);
  const eras = useMemo(
    () => buildEraSections(NODES, timelineConfig, categories),
    [NODES, timelineConfig, categories]
  );
  const eraPositions = useMemo(
    () => computeEraTimelinePositions(timelineConfig),
    [timelineConfig]
  );
  const categoryStats = useMemo(() => {
    const counts = NODES.reduce((acc, node) => {
      const category = categories[node.cat] || { label: node.cat, color: "#6F4A2A" };
      const key = category.label;
      acc[key] = acc[key] || { label: key, color: category.color || "#6F4A2A", count: 0 };
      acc[key].count += 1;
      return acc;
    }, {});

    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [NODES, categories]);
  const [activeEraName, setActiveEraName] = useState(eras[0]?.name || "");
  const [selectedId, setSelectedId] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const scrollRef = useRef(null);
  const radiusVars = useMemo(() => buildRadiusCssVars(uiConfig), [uiConfig]);

  useEffect(() => {
    if (!eras.length) return;
    setActiveEraName((current) => current || eras[0].name);
  }, [eras]);

  useEffect(() => {
    const viewCenterX = 600;
    const worldX = (viewCenterX - pan.x) / scale;
    const nextEraName = getEraAtWorldX(eraPositions, worldX);

    if (nextEraName && nextEraName !== activeEraName) {
      setActiveEraName(nextEraName);
    }
  }, [activeEraName, eraPositions, pan.x, scale]);

  const selectedNode = selectedId ? NMAP[selectedId] : null;
  const lineage = useMemo(
    () => collectLineage(selectedId, ADJ, RADJ),
    [selectedId, ADJ, RADJ]
  );
  const predecessorNodes = selectedNode
    ? (RADJ[selectedNode.id] || []).map((id) => NMAP[id]).filter(Boolean)
    : [];
  const successorNodes = selectedNode
    ? (ADJ[selectedNode.id] || []).map((id) => NMAP[id]).filter(Boolean)
    : [];

  const scrollToEra = (eraName) => {
    const targetEra = eraPositions.find((era) => era.name === eraName);
    if (!targetEra) return;

    actions.panToWorldPoint({
      x: (targetEra.x1 + targetEra.x2) / 2,
    });
  };

  const clearSelection = () => {
    setSelectedId("");
  };

  const selectNode = (id) => {
    setSelectedId(id);
    setSearchOpen(false);
    const node = NMAP[id];
    if (node) {
      window.setTimeout(() => actions.panToNode(node.id, POS), 20);
    }
  };

  return (
    <div
      className={styles.experienceShell}
      data-left-panel={leftOpen ? "open" : "closed"}
      data-right-panel={rightOpen ? "open" : "closed"}
      data-collapse-effect={collapseEffect}
      style={radiusVars}
    >
      <ScrollContainer
        activeEraName={activeEraName}
        onSearch={() => setSearchOpen(true)}
        scrollRef={scrollRef}
      >
        <HybridTechTree
          NODES={NODES}
          POS={POS}
          CAT={categories}
          EDGES={EDGES}
          activeEra={eras.find((era) => era.name === activeEraName)}
          selectedId={selectedId}
          selectedNode={selectedNode}
          lineage={lineage}
          categoryStats={categoryStats}
          pan={pan}
          scale={scale}
          viewportRef={viewportRef}
          handlers={handlers}
          actions={actions}
          isDragging={isDragging}
          onSelect={selectNode}
          onClearSelection={clearSelection}
          leftOpen={leftOpen}
          onToggleLeft={() => setLeftOpen((open) => !open)}
          timelineConfig={timelineConfig}
        />
      </ScrollContainer>

      <Timeline eras={eras} activeEraName={activeEraName} onEraSelect={scrollToEra} />

      <AnnotationPanel
        node={selectedNode}
        categories={categories}
        predecessorNodes={predecessorNodes}
        successorNodes={successorNodes}
        isOpen={rightOpen}
        onToggle={() => setRightOpen((open) => !open)}
        onSelect={selectNode}
      />

      <SearchSheet
        open={searchOpen}
        nodes={NODES}
        categories={categories}
        onSelect={selectNode}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
