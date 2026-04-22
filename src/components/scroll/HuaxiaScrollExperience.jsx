// ============================================================
// HuaxiaScrollExperience.jsx
// 卷轴式科技树体验主容器
// ============================================================
// 职责:
// 1. 管理全局状态(时代、选中节点、搜索、面板开关)
// 2. 渲染卷轴场景头部、时间尺、下方时代导航
// 3. 渲染图谱画布(节点、边、悬浮提示)
// 4. 渲染侧边栏(左侧代码、右侧详情、搜索弹窗)
//
// 组件结构:
//
//  HuaxiaScrollExperience (主组件)
//  |
//  +-- ScrollContainer (卷轴容器,含头部+滚动视口)
//  |   |
//  |   +-- manuscriptHeader (标题栏)
//  |   |   +-- headerBrand (Logo+标题)
//  |   |   +-- headerActions (当前时代+搜索按钮)
//  |   |
//  |   +-- scrollViewport (横向滚动内容区)
//  |       |
//  |       +-- HybridTechTree (SVG图谱渲染)
//  |           |
//  |           +-- TimelineRuler (时间尺,显示刻度和年份)
//  |           |
//  |           +-- SVG画布
//  |               +-- 边 (paths)
//  |               +-- 节点 (g circles + text)
//  |               +-- NodeTooltip (悬浮提示)
//  |
//  +-- Timeline (底部时代导航栏)
//  |
//  +-- AnnotationPanel (右侧详情面板)
//  |   +-- 节点基本信息
//  |   +-- 图片
//  |   +-- 前驱/后继节点按钮
//  |
//  +-- SearchSheet (搜索弹窗模态框)
//
// 状态管理:
//   activeEraName: 当前视图所在时代(自动跟踪视图位置)
//   selectedId: 选中的节点ID
//   searchOpen: 搜索弹窗显示状态
//   leftOpen: 左侧面板展开状态
//   rightOpen: 右侧面板展开状态
//
// 交互:
//   - 点击节点: 选中并显示详情
//   - 点击空白: 取消选中
//   - 拖拽画布: 平移视图
//   - 滚轮: 缩放
//   - 点击时代按钮: 跳转到该时代
//   - Ctrl+K: 打开搜索
// ============================================================

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
import { NodePicture } from "../NodePicture";
import { NODE_RADIUS, VIEW_BOX } from "../../utils/constants";
import { edgePath } from "../../utils/graphUtils";
import { buildTimelineTicks, computeEraTimelinePositions } from "../../utils/timelineUtils";
import { buildRadiusCssVars } from "../../config/uiConfig";

export {
  DEFAULT_PANEL_COLLAPSE_EFFECT,
  PANEL_COLLAPSE_EFFECTS,
} from "./huaxiaScrollConstants";

/**
 * 空画布点击与拖拽的区分阈值(像素)
 * 用于判断用户是点击还是拖拽
 * 当鼠标移动距离超过此阈值时,视为拖拽而非点击
 */
const BLANK_CLICK_DRAG_THRESHOLD = 6;

/**
 * 规范化类别数据
 * 后端返回的类别可能是数组格式,需要转换为映射格式
 * 并补充缺失的字段(使用默认样式)
 *
 * @param {Array|Object} categories - 类别数组或对象
 * @returns {Object} 类别映射 { catCode: { code, name, color, seal, ...} }
 *
 * 输入示例 (数组):
 *   [{ code: "ag", name: "农业" }, { code: "craft", name: "手工艺" }]
 *
 * 输出示例 (映射):
 *   {
 *     "ag": { code: "ag", name: "农业", color: "#7a9b4d", seal: "农" },
 *     "craft": { code: "craft", name: "手工艺", color: "#c8a045", seal: "技" }
 *   }
 *
 * 字段说明:
 *   - code: 类别代码(唯一标识)
 *   - name/label: 显示名称
 *   - color/tone: 主题色
 *   - seal: 印章文字
 */
function normalizeCategories(categories) {
  // 如果已经是对象,直接返回(或空对象)
  if (!Array.isArray(categories)) return categories || {};

  // 使用reduce构建映射
  return categories.reduce((acc, item) => {
    // 从常量中查找该类别的默认样式
    const fallback = CATEGORY_TONE[item.code] || {};
    acc[item.code] = {
      ...item,
      // 名称: 优先使用传入值,否则用默认值,否则用代码
      label: item.name || fallback.name || item.code,
      // 颜色: 优先使用传入值,否则用默认值
      color: fallback.tone || "#6F4A2A",
      // 印章: 优先使用传入值,否则用默认值
      seal: fallback.seal || "技",
    };
    return acc;
  }, {});
}

/**
 * 格式化年份显示
 * 将数值年份转换为中文显示格式
 *
 * @param {number} year - 年份(负数表示公元前)
 * @returns {string} 格式化后的年份字符串
 *
 * 示例:
 *   -8  -> "纪年未详"
 *   -105 -> "公元前105年"
 *   105  -> "公元105年"
 */
function formatYear(year) {
  if (typeof year !== "number") return "纪年未详";
  if (year < 0) return `公元前${Math.abs(year)}年`;
  return `公元${year}年`;
}

/**
 * 规范化时代名称(处理别名)
 * 有些时代可能有多个名称,需要统一映射
 *
 * @param {string} eraName - 时代名称
 * @returns {string} 规范化后的名称
 *
 * 例如ERA_ALIASES中定义了:
 *   { "上古": "史前", "先秦": "春秋战国" }
 */
function normalizeEraName(eraName) {
  return ERA_ALIASES[eraName] || eraName;
}

/**
 * 收集指定节点的完整传承脉络
 * 包括:
 * - 所有祖先节点(前驱/来源)
 * - 所有后代节点(后继/影响)
 * - 直接关联的边
 *
 * 使用深度优先搜索遍历
 *
 * @param {string} nodeId - 起始节点ID
 * @param {Object} ADJ - 邻接表 { nodeId: [childId, ...] }
 *   表示每个节点的直接后继
 * @param {Object} RADJ - 逆邻接表 { nodeId: [parentId, ...] }
 *   表示每个节点的直接前驱
 * @returns {Object}
 *   {
 *     ancestors: Set<string>,  // 所有前驱节点ID
 *     descendants: Set<string>, // 所有后继节点ID
 *     nodes: Set<string>,      // 前驱+后继+自身
 *     edges: Set<string>     // 格式: "from->to"
 *   }
 *
 * 遍历逻辑:
 *   1. walkBack: 从给定节点出发,沿RADJ逆向遍历,收集所有祖先
 *   2. walkForward: 从给定节点出发,沿ADJ正向遍历,收集所有后代
 *   3. 同时记录经过的边
 */
function collectLineage(nodeId, ADJ, RADJ) {
  const ancestors = new Set();    // 前驱集合
  const descendants = new Set(); // 后继集合
  const edges = new Set();       // 边集合

  // 递归收集祖先(前驱): 沿RADJ逆向遍历
  const walkBack = (currentId) => {
    (RADJ[currentId] || []).forEach((parentId) => {
      // 记录边: parentId -> currentId
      edges.add(`${parentId}->${currentId}`);
      // 已访问过则跳过(避免循环)
      if (ancestors.has(parentId)) return;
      ancestors.add(parentId);
      walkBack(parentId);  // 继续递归
    });
  };

  // 递归收集后代(后继): 沿ADJ正向遍历
  const walkForward = (currentId) => {
    (ADJ[currentId] || []).forEach((childId) => {
      // 记录边: currentId -> childId
      edges.add(`${currentId}->${childId}`);
      // 已访问过则跳过(避免循环)
      if (descendants.has(childId)) return;
      descendants.add(childId);
      walkForward(childId);  // 继续递归
    });
  };

  // 开始遍历
  if (nodeId) {
    walkBack(nodeId);
    walkForward(nodeId);
  }

  return {
    ancestors,
    descendants,
    // 合并所有相关节点(包括自身)
    nodes: new Set([nodeId, ...ancestors, ...descendants].filter(Boolean)),
    edges,
  };
}
      walkBack(parentId);
    });
  };

  // 递归收集后代(后继)
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

/**
 * 构建时代区块数据
 * 将节点按时代分组,关联时代配置、主题、代表性节点
 *
 * @param {Array} nodes - 节点数组
 * @param {Array} timelineConfig - 时代配置数组
 * @param {Object} categories - 类别映射
 * @returns {Array} 时代区块数组
 */
function buildEraSections(nodes, timelineConfig, categories) {
  // 按时代名分组节点
  const grouped = new Map();
  nodes.forEach((node) => {
    const eraName = normalizeEraName(node.era);
    if (!grouped.has(eraName)) grouped.set(eraName, []);
    grouped.get(eraName).push(node);
  });

  // 为每个配置的时代构建区块数据
  return timelineConfig
    .map((era) => {
      const eraNodes = (grouped.get(era.name) || []).sort((a, b) => a.year - b.year);
      const categoryNames = Array.from(new Set(eraNodes.map((node) => categories[node.cat]?.label || node.cat)));
      // 选择出边最多的节点作为代表
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

/**
 * 根据世界坐标X获取当前所在时代
 * @param {Array} eraPositions - 时代位置信息
 * @param {number} worldX - 世界坐标X
 * @returns {string} 时代名称
 */
function getEraAtWorldX(eraPositions, worldX) {
  if (!eraPositions.length || !Number.isFinite(worldX)) return "";

  // 先检查是否在某个时代区间内
  const containing = eraPositions.find((era) => worldX >= era.x1 && worldX < era.x2);
  if (containing) return containing.name;

  // 否则选择中心点最近的
  return eraPositions.reduce((closest, era) => {
    const eraCenter = (era.x1 + era.x2) / 2;
    const closestCenter = (closest.x1 + closest.x2) / 2;
    return Math.abs(eraCenter - worldX) < Math.abs(closestCenter - worldX) ? era : closest;
  }, eraPositions[0]).name;
}

/**
 * 卷轴容器组件
 * 包含: 背景图层、头部(标题+搜索按钮)、横向滚动视口
 * @param {Object} props
 * @param {ReactNode} props.children - 子元素(如图谱)
 * @param {string} props.activeEraName - 当前时代名称
 * @param {Function} props.onSearch - 搜索按钮点击回调
 * @param {RefObject} props.scrollRef - 滚动容器引用
 */
function ScrollContainer({ children, activeEraName, onSearch, scrollRef }) {
  const publicPath = process.env.PUBLIC_URL || "";

  // 滚轮事件处理: 将垂直滚动转换为水平滚动
  // 但跳过图谱视口内的滚动(由图谱自己处理)
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
        "--scroll-paper-image": `url("${publicPath}/images/backgrounds/tsing_ming.jpg")`,
        "--scroll-scene-image": `url("${publicPath}/images/backgrounds/tsing_ming.jpg")`,
      }}
    >
      {/* 背景遮罩层 */}
      <div className={styles.stageBackdrop} aria-hidden="true" />
      {/* 资源预加载(隐藏的img用于提前加载) */}
      <div className={styles.assetPreload} aria-hidden="true">
        <img
          src={`${publicPath}/images/backgrounds/bg_scroll_1.jpg`}
          alt=""
          decoding="async"
          fetchPriority="high"
        />
        <img
          src={`${publicPath}/images/backgrounds/tsing_ming.jpg`}
          alt=""
          decoding="async"
          fetchPriority="high"
        />
      </div>
      {/* 头部: 品牌logo + 标题 + 当前时代 + 搜索按钮 */}
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
      {/* 横向滚动视口,包含子组件 */}
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

/**
 * 时间尺组件
 * 渲染在图谱上方,显示时代刻度线和年份标签
 *
 * @param {Object} props
 * @param {Array} props.timelineConfig - 时代配置
 * @param {number} props.panX - 水平平移量
 * @param {number} props.scale - 缩放比例
 * @param {number} props.viewportWidthPx - 视口宽度(像素)
 */
function TimelineRuler({ timelineConfig, panX, scale, viewportWidthPx }) {
  // 计算刻度线数据
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
      {/* 当前视口指示器(小三角形) */}
      <div className={styles.timelineRulerPointer}>
        <svg viewBox="0 0 20 24" role="presentation" focusable="false">
          <polygon points="5,2 15,2 15,13 10,19 5,13" />
        </svg>
      </div>
      {/* 刻度线SVG */}
      <svg
        className={styles.timelineRulerSvg}
        viewBox={`0 0 ${VIEW_BOX_WIDTH} ${RULER_VIEW_BOX_HEIGHT}`}
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
      >
        {/* 铁轨线 */}
        <line
          className={styles.timelineRulerRail}
          x1="0"
          y1={RULER_RAIL_Y}
          x2={VIEW_BOX_WIDTH}
          y2={RULER_RAIL_Y}
        />
        {/* 刻度线: 随panX平移,scale只影响宽度不影响文字 */}
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
      {/* 年份标签(绝对定位,不受SVG变换影响) */}
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

/**
 * 时代导航栏
 * 位于页面底部,显示所有时代按钮,可点击跳转
 *
 * @param {Object} props
 * @param {Array} props.eras - 时代区块数组
 * @param {string} props.activeEraName - 当前选中时代
 * @param {Function} props.onEraSelect - 时代按钮点击回调
 */
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

/**
 * 面板折叠按钮
 * 位于左右两侧,控制面板展开/收起
 *
 * @param {Object} props
 * @param {"left" | "right"} props.side - 面板位置
 * @param {boolean} props.isOpen - 是否展开
 * @param {Function} props.onToggle - 切换回调
 */
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

/**
 * 左侧代码面板(树典)
 * 显示: 当前时代、节点/边统计、类别分布、溯源状态
 *
 * @param {Object} props
 * @param {Object} props.activeEra - 当前时代数据
 * @param {Object} props.selectedNode - 选中的节点
 * @param {Object} props.lineage - 传承脉络
 * @param {Array} props.categoryStats - 类别统计数据
 * @param {number} props.totalNodes - 节点总数
 * @param {number} props.totalEdges - 边总数
 * @param {boolean} props.isOpen - 是否展开
 */
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

/**
 * 混合科技树图谱组件
 * 核心渲染组件,负责:
 * 1. 渲染SVG画布(节点、边)
 * 2. 处理平移缩放事件
 * 3. 处理节点点击/悬浮
 * 4. 管理视口尺寸响应式变化
 *
 * @param {Object} props - 组件属性(见下方各字段)
 */
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
  // ===================== 状态 =====================
  const hasTrace = Boolean(selectedId);  // 是否显示了传承脉络
  const [hoveredNode, setHoveredNode] = useState(null);  // 悬浮的节点
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });  // tooltip位置(屏幕坐标)
  const treeViewportRef = useRef(null);  // SVG外层容器引用
  const blankCanvasPressRef = useRef({ pending: false, moved: false, startX: 0, startY: 0 });  // 空画布点击状态
  const [viewportWidthPx, setViewportWidthPx] = useState(VIEW_BOX_WIDTH);  // 视口宽度(响应式)

  // ===================== 滚动场景进度 =====================
  // 计算当前视图在整体图谱中的位置比例(0-1),用于背景动画
  const scrollSceneProgress = useMemo(() => {
    const positions = Object.values(POS || {});
    if (!positions.length) return 0;

    const xValues = positions
      .map((position) => position?.x)
      .filter((value) => Number.isFinite(value));

    if (!xValues.length) return 0;

    const minNodeX = Math.min(...xValues);
    const maxNodeX = Math.max(...xValues);
    // 根据缩放计算可平移范围
    const minPanX = VIEW_BOX_WIDTH / 2 - maxNodeX * scale;
    const maxPanX = VIEW_BOX_WIDTH / 2 - minNodeX * scale;
    const panSpan = maxPanX - minPanX;

    if (!Number.isFinite(panSpan) || panSpan <= 0) return 0;

    const clampedPanX = Math.min(maxPanX, Math.max(minPanX, pan.x));
    return (maxPanX - clampedPanX) / panSpan;
  }, [POS, pan.x, scale]);

  // ===================== 空画布点击事件处理 =====================
  // 区分用户是点击还是拖拽(避免拖拽后意外触发点击)
  const resetBlankCanvasPress = () => {
    blankCanvasPressRef.current = { pending: false, moved: false, startX: 0, startY: 0 };
  };

  // 鼠标按下: 记录起始位置
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

  // 鼠标移动: 检测是否超过阈值
  const handleCanvasMouseMoveCapture = (event) => {
    const press = blankCanvasPressRef.current;
    if (!press.pending || press.moved) return;

    if (Math.hypot(event.clientX - press.startX, event.clientY - press.startY) > BLANK_CLICK_DRAG_THRESHOLD) {
      press.moved = true;
    }
  };

  // 鼠标点击: 如果未移动则清除选中
  const handleBlankCanvasClick = () => {
    const press = blankCanvasPressRef.current;
    if (selectedId && press.pending && !press.moved) {
      onClearSelection();
    }
    resetBlankCanvasPress();
  };

  // ===================== 响应式视口 =====================
  // 监听容器尺寸变化,更新时间尺计算
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

  // ===================== 渲染 =====================
  return (
    <section className={styles.treeManuscript} aria-label="华夏科技树图谱">
      {/* 左侧面板开关 */}
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

      {/* 图谱视口 */}
      <div ref={treeViewportRef} className={styles.treeViewportShell} data-tree-viewport>
        {/* 时间尺 */}
        <TimelineRuler
          timelineConfig={timelineConfig}
          panX={pan.x}
          scale={scale}
          viewportWidthPx={viewportWidthPx}
        />

        {/* SVG画布 */}
        <div className={styles.treeCanvasBody}>
          {/* 滚动场景背景(根据进度显示) */}
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
              {/* 网格图案 */}
              <pattern id="hybridPaperGrid" width="54" height="54" patternUnits="userSpaceOnUse">
                <path d="M 54 0 L 0 0 0 54" fill="none" stroke="rgba(74,53,28,.08)" strokeWidth=".7" />
              </pattern>
              {/* 普通箭头标记 */}
              <marker id="hybridArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L0,7 L7,3.5z" fill="rgba(74,53,28,.42)" />
              </marker>
              {/* 追溯路径箭头标记(朱砂色) */}
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
              {/* ===================== 渲染边 ===================== */}
              {EDGES.map((edge) => {
                const edgeKey = `${edge.from}->${edge.to}`;
                const isTraced = lineage.edges.has(edgeKey);  // 是否在传承脉络中
                const isDimmed = hasTrace && !isTraced;  // 有选中时,非脉络边淡化

                return (
                  <path
                    key={edgeKey}
                    d={edgePath(edge.from, edge.to, POS, NODE_RADIUS)}
                    fill="none"
                    stroke={isTraced ? "#8f2f28" : "rgba(74,53,28,.34)"}  // 朱砂色:普通色
                    strokeWidth={isTraced ? 3.2 : 1.35}  // 脉络边更粗
                    markerEnd={isTraced ? "url(#hybridArrowTrace)" : "url(#hybridArrow)"}
                    opacity={isDimmed ? 0.38 : 0.96}
                    className={isTraced ? styles.traceEdge : styles.treeEdge}
                  />
                );
              })}

              {/* ===================== 渲染节点 ===================== */}
              {NODES.map((node) => {
                const position = POS[node.id];
                if (!position) return null;

                const category = CAT[node.cat] || CATEGORY_TONE[node.cat] || {};
                const isSelected = selectedId === node.id;  // 当前选中
                const isTraced = lineage.nodes.has(node.id);  // 在传承脉络中
                const isDimmed = hasTrace && !isTraced;  // 有选中时,非脉络节点淡化
                const tone = category.color || category.tone || "#6F4A2A";
                // 节点名称过长时分两行显示
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
                    {/* 传承光晕: 仅选中节点或脉络节点显示 */}
                    {isTraced && (
                      <circle
                        r={NODE_RADIUS + (isSelected ? 15 : 9)}
                        fill={isSelected ? "rgba(143,47,40,.13)" : "rgba(49,79,82,.1)"}
                        className={styles.traceHalo}
                      />
                    )}
                    {/* 节点底色: 宣纸色 */}
                    <circle r={NODE_RADIUS} fill="rgba(255,249,230,.92)" />
                    {/* 节点边框: 根据状态变色 */}
                    <circle r={NODE_RADIUS} fill="none" stroke="var(--tree-node-tone)" strokeWidth={isSelected ? 3 : 2} />
                    {/* 节点名称: 根据字数选择字号和位置 */}
                    {label.map((text, index) => (
                      <text
                        key={text}
                        y={label.length === 1 ? 4 : index === 0 ? -5 : 8}
                        textAnchor="middle"
                        fontSize={label.length === 1 ? 10.5 : 9}
                        fill="#2c2616"
                        fontFamily='"Noto Serif SC"'
                        fontWeight="700"
                      >
                        {text}
                      </text>
                    ))}
                    {/* 时代标签: 显示在节点下方 */}
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

/**
 * 右侧详情面板(笺注)
 * 显示选中节点的详细信息:
 * - 年份、时代、类别标签
 * - 图片、简介、历史意义
 * - 前驱/后继节点按钮
 *
 * @param {Object} props
 * @param {Object|null} props.node - 选中的节点,无选中时显示空状态
 * @param {Object} props.categories - 类别映射
 * @param {Array} props.predecessorNodes - 前驱节点数组
 * @param {Array} props.successorNodes - 后继节点数组
 * @param {boolean} props.isOpen - 是否展开
 * @param {Function} props.onToggle - 切换回调
 * @param {Function} props.onSelect - 节点按钮点击回调
 */
function AnnotationPanel({ node, categories, predecessorNodes, successorNodes, isOpen, onToggle, onSelect }) {
  // 空状态: 提示用户选择节点
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
      {/* 年份和类别标签 */}
      <p className={styles.annotationKicker}>{formatYear(node.year)}</p>
      <p className={styles.annotationKicker}>{node.era} · {category.label}</p>
      {/* 节点名称 */}
      <h2>{node.name}</h2>
      {/* 相关图片 */}
      <NodePicture
        nodeId={node.id}
        alt={`${node.name}相关图片`}
        figureClassName={styles.annotationPicture}
        frameClassName={styles.annotationPictureFrame}
        imageClassName={styles.annotationPictureImg}
        statusClassName={styles.annotationPictureStatus}
        errorClassName={styles.annotationPictureStatusError}
      />
      {/* 历史意义和描述 */}
      <p className={styles.annotationLead}>{node.sig}</p>
      <p>{node.desc}</p>
      {/* 发明者 */}
      <dl className={styles.annotationFacts}>
        <div>
          <dt>传述者</dt>
          <dd>{node.inv || "未详"}</dd>
        </div>
      </dl>
      {/* 前驱节点 */}
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
      {/* 后继节点 */}
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

/**
 * 搜索弹窗
 * 模态框形式,支持模糊搜索节点
 *
 * @param {Object} props
 * @param {boolean} props.open - 是否显示
 * @param {Array} props.nodes - 节点数组
 * @param {Object} props.categories - 类别映射
 * @param {Function} props.onSelect - 选中回调
 * @param {Function} props.onClose - 关闭回调
 */
function SearchSheet({ open, nodes, categories, onSelect, onClose }) {
  const [query, setQuery] = useState("");

  // 搜索过滤: 匹配名称/英文名/时代/描述/历史意义/发明者
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

  // 关闭时清空搜索词
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.searchLayer} role="dialog" aria-modal="true">
      {/* 遮罩层 */}
      <button type="button" className={styles.searchVeil} onClick={onClose} aria-label="关闭检索" />
      {/* 搜索面板 */}
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
        {/* 搜索结果列表 */}
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

/**
 * 卷轴式科技树体验主组件
 * 负责管理全局状态并组装所有子组件
 *
 * @param {Object} props
 * @param {Array} props.NODES - 节点数组
 * @param {Object} props.POS - 节点位置映射 { nodeId: { x, y } }
 * @param {Object} props.CAT - 类别映射
 * @param {Array} props.EDGES - 边数组 [ { from, to } ]
 * @param {Object} props.ADJ - 邻接表
 * @param {Object} props.RADJ - 逆邻接表
 * @param {Object} props.NMAP - 节点映射
 * @param {Array} props.timelineConfig - 时代配置
 * @param {Object} props.pan - 平移量 { x, y }
 * @param {number} props.scale - 缩放比例
 * @param {RefObject} props.viewportRef - SVG视口引用
 * @param {Object} props.handlers - 事件处理对象
 * @param {Object} props.actions - 动作方法对象
 * @param {boolean} props.isDragging - 是否正在拖拽
 * @param {string} props.collapseEffect - 面板折叠动画类型
 * @param {Object} props.uiConfig - UI配置
 */
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
  // ===================== 派生数据 =====================
  // 规范化类别
  const categories = useMemo(() => normalizeCategories(CAT), [CAT]);
  // 时代区块
  const eras = useMemo(
    () => buildEraSections(NODES, timelineConfig, categories),
    [NODES, timelineConfig, categories]
  );
  // 时代位置(用于判断当前所在时代)
  const eraPositions = useMemo(
    () => computeEraTimelinePositions(timelineConfig),
    [timelineConfig]
  );
  // 类别统计(按数量排序)
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

  // ===================== UI状态 =====================
  const [activeEraName, setActiveEraName] = useState(eras[0]?.name || "");  // 当前时代
  const [selectedId, setSelectedId] = useState("");  // 选中的节点ID
  const [searchOpen, setSearchOpen] = useState(false);  // 搜索弹窗显示
  const [leftOpen, setLeftOpen] = useState(true);  // 左侧面板展开
  const [rightOpen, setRightOpen] = useState(true);  // 右侧面板展开
  const scrollRef = useRef(null);  // 横向滚动容器引用
  const radiusVars = useMemo(() => buildRadiusCssVars(uiConfig), [uiConfig]);  // CSS变量

  // ===================== 副作用 =====================
  // 初始化当前时代(如果有)
  useEffect(() => {
    if (!eras.length) return;
    setActiveEraName((current) => current || eras[0].name);
  }, [eras]);

  // 监听视图移动,自动更新当前时代
  useEffect(() => {
    const viewCenterX = 600;
    const worldX = (viewCenterX - pan.x) / scale;
    const nextEraName = getEraAtWorldX(eraPositions, worldX);

    if (nextEraName && nextEraName !== activeEraName) {
      setActiveEraName(nextEraName);
    }
  }, [activeEraName, eraPositions, pan.x, scale]);

  // ===================== 衍生数据 =====================
  // 选中的节点对象
  const selectedNode = selectedId ? NMAP[selectedId] : null;
  // 传承脉络
  const lineage = useMemo(
    () => collectLineage(selectedId, ADJ, RADJ),
    [selectedId, ADJ, RADJ]
  );
  // 前驱节点(从逆邻接表获取)
  const predecessorNodes = selectedNode
    ? (RADJ[selectedNode.id] || []).map((id) => NMAP[id]).filter(Boolean)
    : [];
  // 后继节点(从邻接表获取)
  const successorNodes = selectedNode
    ? (ADJ[selectedNode.id] || []).map((id) => NMAP[id]).filter(Boolean)
    : [];

  // ===================== 动作方法 =====================
  // 滚动到指定时代(平移到时代中心)
  const scrollToEra = (eraName) => {
    const targetEra = eraPositions.find((era) => era.name === eraName);
    if (!targetEra) return;

    actions.panToWorldPoint({
      x: (targetEra.x1 + targetEra.x2) / 2,
    });
  };

  // 清除选中
  const clearSelection = () => {
    setSelectedId("");
  };

  // 选中节点
  const selectNode = (id) => {
    setSelectedId(id);
    setSearchOpen(false);
    const node = NMAP[id];
    if (node) {
      // 延迟移动视图,确保选中状态已更新
      window.setTimeout(() => actions.panToNode(node.id, POS), 20);
    }
  };

  // ===================== 渲染 =====================
  return (
    <div
      className={styles.experienceShell}
      data-left-panel={leftOpen ? "open" : "closed"}
      data-right-panel={rightOpen ? "open" : "closed"}
      data-collapse-effect={collapseEffect}
      style={radiusVars}
    >
      {/* 卷轴容器(头部+图谱) */}
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

      {/* 底部时代导航 */}
      <Timeline eras={eras} activeEraName={activeEraName} onEraSelect={scrollToEra} />

      {/* 右侧详情面板 */}
      <AnnotationPanel
        node={selectedNode}
        categories={categories}
        predecessorNodes={predecessorNodes}
        successorNodes={successorNodes}
        isOpen={rightOpen}
        onToggle={() => setRightOpen((open) => !open)}
        onSelect={selectNode}
      />

      {/* 搜索弹窗 */}
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
