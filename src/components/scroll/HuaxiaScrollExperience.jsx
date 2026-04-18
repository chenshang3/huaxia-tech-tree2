import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./HuaxiaScrollExperience.module.css";
import {
  ERA_BACKGROUNDS_BY_NAME,
  ERA_BACKGROUND_SETTINGS,
} from "../../config/eraBackgrounds";
import { NODE_RADIUS, VIEW_BOX } from "../../utils/constants";
import { edgePath } from "../../utils/graphUtils";

const CATEGORY_TONE = {
  craft: { name: "工艺", tone: "#8A5F32", seal: "匠" },
  metallurgy: { name: "冶金", tone: "#6F4A2A", seal: "金" },
  culture: { name: "文教", tone: "#405A55", seal: "文" },
  science: { name: "格物", tone: "#355C63", seal: "理" },
  medicine: { name: "医药", tone: "#4D6B50", seal: "医" },
  engineering: { name: "营造", tone: "#7B5739", seal: "工" },
  military: { name: "军器", tone: "#7B2E2E", seal: "兵" },
  navigation: { name: "舟舆", tone: "#2F5B62", seal: "航" },
  textile: { name: "织造", tone: "#8D5D56", seal: "织" },
  trade: { name: "互市", tone: "#72572B", seal: "市" },
  agriculture: { name: "农政", tone: "#5F6F3A", seal: "耕" },
  math: { name: "算学", tone: "#514F64", seal: "算" },
};

const ERA_THEMES = {
  "新石器": "取土为器，磨石成形，先民开始以双手改写自然。",
  "黄帝时期": "衣被天下的传说在此萌芽，丝与医共同进入文明记忆。",
  "夏朝": "青铜初兴，礼器与权力一同铸入火光。",
  "商朝": "甲骨有辞，文字使祭祀、政治与历史开始被保存。",
  "周朝": "礼乐成制，器物与制度共同构成文明秩序。",
  "春秋": "铁器入田，诸侯竞逐中孕育生产力的跃迁。",
  "战国": "百家争鸣，农具、兵器与方术在变法中并进。",
  "秦朝": "车同轨，书同文，工程与治理压缩成统一的尺度。",
  "西汉": "凿空西域，纸、丝、历法和道路把世界接入中原。",
  "东汉": "知识落于纸上，观天测地之器体现实证精神。",
  "三国": "乱世促成军工、水利与稻作技术的快速流动。",
  "两晋": "士人书写山水，工艺与医药在迁徙中延续。",
  "南北朝": "南北交汇，佛寺、农书与本草塑造新的技术网络。",
  "隋朝": "大运河贯通南北，帝国重新组织人力、粮食与交通。",
  "唐朝": "万国来朝，印刷、药物、织造与航路进入盛世节奏。",
  "五代十国": "山河分裂而技艺未断，地方工匠保存火种。",
  "宋朝": "市井繁盛，火药、活字、瓷器与航海迎来密集突破。",
  "元朝": "欧亚贯通，天文、农政与交通在更大尺度上流转。",
  "明朝": "海路远行，营造、医药、瓷业与百科式知识成熟。",
  "清朝": "传统技艺精细化，西学东渐带来新的观察方式。",
  "近代": "机器、铁路与新式教育打开古今交汇的门缝。",
  "现代": "古老技艺进入现代体系，文明记忆转化为新的创造力。",
};

const ERA_ALIASES = {
  "上古": "新石器",
  "汉朝": "西汉",
  "秦汉": "东汉",
  "隋唐": "唐朝",
  "北宋": "宋朝",
  "南宋": "宋朝",
};

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
  if (year < 0) return `公元前 ${Math.abs(year)} 年`;
  return `公元 ${year} 年`;
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
    })
    .filter((era) => era.nodes.length > 0);
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
        "--calligraphy-image": `url("${publicPath}/images/backgrounds/bg_calligraphy.jpg")`,
        "--scroll-paper-image": `url("${publicPath}/images/backgrounds/bg_scroll_1.jpg")`,
      }}
    >
      <div className={styles.stageBackdrop} aria-hidden="true" />
      <header className={styles.manuscriptHeader}>
        <div>
          <p className={styles.kicker}>华夏文明科技树</p>
          <h1>一卷文明技术长图</h1>
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

function HybridTechTree({
  NODES,
  POS,
  CAT,
  EDGES,
  selectedId,
  lineage,
  pan,
  scale,
  viewportRef,
  handlers,
  actions,
  isDragging,
  onSelect,
}) {
  const hasTrace = Boolean(selectedId);

  return (
    <section className={styles.treeManuscript} aria-label="华夏科技树图谱">
      <div className={styles.treeTitleBlock}>
        <p className={styles.kicker}>科技树主卷</p>
        <h2>器物相因，技艺相生</h2>
        <p>
          保留有向科技树的节点、边与传承关系；以新版卷轴材质承载图谱，点击任一技艺即可展开前驱与后继的溯源脉络。
        </p>
      </div>

      <div className={styles.treeViewportShell} data-tree-viewport>
        <svg
          ref={viewportRef}
          className={styles.hybridGraphSvg}
          viewBox={VIEW_BOX}
          preserveAspectRatio="xMidYMin meet"
          xmlns="http://www.w3.org/2000/svg"
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

          <rect width="1200" height="640" fill="rgba(245,230,200,.42)" />
          <rect width="1200" height="640" fill="url(#hybridPaperGrid)" />
          <path
            d="M70 578 C240 548, 410 608, 610 568 S1010 540, 1140 586"
            fill="none"
            stroke="rgba(49,79,82,.16)"
            strokeWidth="18"
            strokeLinecap="round"
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
                  opacity={isDimmed ? 0.12 : 0.86}
                  className={isTraced ? styles.traceEdge : styles.treeEdge}
                />
              );
            })}

            {NODES.map((node) => {
              const position = POS[node.id];
              if (!position) return null;

              const category = CAT[node.cat] || CATEGORY_TONE[node.cat] || {};
              const isSelected = selectedId === node.id;
              const isAncestor = lineage.ancestors.has(node.id);
              const isDescendant = lineage.descendants.has(node.id);
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
                  style={{
                    "--tree-node-tone": isSelected ? "#8f2f28" : tone,
                    opacity: isDimmed ? 0.2 : 1,
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
                  <circle r="4" cy={-NODE_RADIUS - 5} fill={isAncestor ? "#314f52" : isDescendant ? "#8f2f28" : "transparent"} />
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
          <button type="button" onClick={actions.zoomIn}>放大</button>
          <button type="button" onClick={actions.zoomOut}>缩小</button>
          <button type="button" onClick={() => selectedId && actions.panToNode(selectedId, POS)}>归位</button>
          <button type="button" onClick={actions.resetView}>全卷</button>
        </div>
      </div>
    </section>
  );
}

function AnnotationPanel({ node, categories, predecessorNodes, successorNodes, lineage, onSelect, onClose }) {
  if (!node) {
    return (
      <aside className={styles.annotationPanel}>
        <p className={styles.annotationKicker}>卷旁笺注</p>
        <h2>择一技艺，溯其来路</h2>
        <p>
          点击科技树中的节点，可见发明缘起、前驱依赖与后续传承。图中会以朱砂线标出可追溯的技术脉络。
        </p>
      </aside>
    );
  }

  const category = categories[node.cat] || { label: node.cat, color: "#6F4A2A" };

  return (
    <aside className={styles.annotationPanel} style={{ "--annotation-tone": category.color }}>
      <button type="button" className={styles.closeAnnotation} onClick={onClose}>收起</button>
      <p className={styles.annotationKicker}>{formatYear(node.year)} · {node.era} · {category.label}</p>
      <h2>{node.name}</h2>
      <p className={styles.annotationLead}>{node.sig}</p>
      <p>{node.desc}</p>
      <dl className={styles.annotationFacts}>
        <div>
          <dt>传述者</dt>
          <dd>{node.inv || "未详"}</dd>
        </div>
        <div>
          <dt>文明脉络</dt>
          <dd>
            上承 {lineage.ancestors.size} 项技艺，下启 {lineage.descendants.size} 项发明。
            {successorNodes.length ? ` 近支延展至 ${successorNodes.map((item) => item.name).join("、")}。` : " 此支暂止，余韵仍在器物与制度之中。"}
          </dd>
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
}) {
  const categories = useMemo(() => normalizeCategories(CAT), [CAT]);
  const eras = useMemo(
    () => buildEraSections(NODES, timelineConfig, categories),
    [NODES, timelineConfig, categories]
  );
  const [activeEraName, setActiveEraName] = useState(eras[0]?.name || "");
  const [selectedId, setSelectedId] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!eras.length) return;
    setActiveEraName((current) => current || eras[0].name);
  }, [eras]);

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
    setActiveEraName(eraName);
    const eraNode = NODES.find((node) => normalizeEraName(node.era) === eraName && POS[node.id]);
    if (eraNode) {
      actions.panToNode(eraNode.id, POS);
    }
  };

  const selectNode = (id) => {
    setSelectedId(id);
    setSearchOpen(false);
    const node = NMAP[id];
    if (node) {
      setActiveEraName(normalizeEraName(node.era));
      window.setTimeout(() => actions.panToNode(node.id, POS), 20);
    }
  };

  return (
    <div className={styles.experienceShell}>
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
          selectedId={selectedId}
          lineage={lineage}
          pan={pan}
          scale={scale}
          viewportRef={viewportRef}
          handlers={handlers}
          actions={actions}
          isDragging={isDragging}
          onSelect={selectNode}
        />
      </ScrollContainer>

      <Timeline eras={eras} activeEraName={activeEraName} onEraSelect={scrollToEra} />

      <AnnotationPanel
        node={selectedNode}
        categories={categories}
        predecessorNodes={predecessorNodes}
        successorNodes={successorNodes}
        lineage={lineage}
        onSelect={selectNode}
        onClose={() => setSelectedId("")}
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
