// ============================================================
// HuaxiaTechTree.jsx
// 华夏文明科技树主入口组件
// ============================================================
// 职责:
// 1. 从后端获取图数据(节点、位置、邻接表、时代配置)
// 2. 管理平移缩放状态
// 3. 组装卷轴式体验容器
//
// 数据流:
//   useGraphData (Hook)  --> 获取后端数据
//     |                     --> NODES: 节点数组 [{ id, name, year, era, cat, outEdges, ... }]
//     |                     --> POS: 位置映射 { nodeId: { x, y } }
//     |                     --> CAT: 类别映射 { catId: { code, name, color } }
//     |                     --> ADJ: 邻接表 { nodeId: [targetId, ...] }
//     |                     --> RADJ: 逆邻接表 { nodeId: [sourceId, ...] }
//     |                     --> NMAP: 节点映射 { nodeId: nodeObject }
//     |                     --> timelineConfig: 时代配置 [{ name, start, end, scale }]
//     |                     --> uiConfig: UI配置
//     |
//   usePanZoom (Hook)  --> 管理交互状态
//     |                   --> pan: { x, y } 平移量
//     |                   --> scale: 缩放比例
//     |                   --> isDragging: 拖拽中标志
//     |                   --> viewportRef: SVG视口引用
//     |                   --> handlers: 事件处理对象 { onWheel, onMouseDown, onMouseMove, onMouseUp, onMouseLeave }
//     |                   --> actions: 动作方法 { zoomIn, zoomOut, resetView, panToNode, panToWorldPoint }
//     |
//   数据处理
//     |--> buildFallbackMaps: 当后端未返回ADJ/RADJ/NMAP时,从节点outEdges构建
//     |--> deriveEdges: 从节点和邻接表推导所有有向边
//     |--> normalizeUiConfig: 规范化UI配置
//     |
//   HuaxiaScrollExperience (组件)  --> 渲染卷轴式UI
// ============================================================

import { useEffect, useMemo } from "react";

import { useGraphData } from "./hooks/useGraphData";
import { usePanZoom } from "./hooks/usePanZoom";
import { HuaxiaScrollExperience } from "./components/scroll/HuaxiaScrollExperience";
import { LoadingScreen, ErrorScreen } from "./components/StateScreen";
import { normalizeUiConfig } from "./config/uiConfig";
import { deriveEdges } from "./utils/graphUtils";

/**
 * 构建备选图结构映射
 * 当后端未返回预计算的邻接表(ADJ/RADJ/NMAP)时使用
 * 从节点数据中推导: 从节点.outEdges 构建邻接表,从邻接表构建逆邻接表
 *
 * @param {Array} nodes - 节点数组,每个节点包含 id,outEdges
 * @returns {Object} { adj: 邻接表, radj: 逆邻接表, nmap: 节点映射 }
 *
 * 示例输入:
 *   nodes = [
 *     { id: "造纸术", outEdges: ["蔡伦"] },
 *     { id: "蔡伦", outEdges: [] }
 *   ]
 *
 * 示例输出:
 *   {
 *     adj: { "造纸术": ["蔡伦"], "蔡伦": [] },
 *     radj: { "造纸术": [], "蔡伦": ["造纸术"] },
 *     nmap: { "造纸术": {节点1}, "蔡伦": {节点2} }
 *   }
 */
function buildFallbackMaps(nodes) {
  // ========================================
  // 第1步: 构建邻接表(ADJ)
  // adj: { nodeId: [targetId, ...], ... }
  // 从每个节点的 outEdges 数组直接映射
  // ========================================
  const adj = Object.fromEntries(nodes.map((node) => [node.id, node.outEdges || []]));

  // ========================================
  // 第2步: 构建逆邻接表(RADJ)
  // radj: { nodeId: [sourceId, ...], ... }
  // 先初始化为空数组,之后在第3步填充
  // ========================================
  const radj = Object.fromEntries(nodes.map((node) => [node.id, []]));

  // ========================================
  // 第3步: 构建节点映射(NMAP)
  // nmap: { nodeId: nodeObject, ... }
  // 便于通过ID快速查找节点对象
  // ========================================
  const nmap = Object.fromEntries(nodes.map((node) => [node.id, node]));

  // ========================================
  // 第4步: 填充逆邻接表
  // 遍历每个节点的出边,反向填充到radj中
  // 如果节点A有边指向节点B,则在radj[B]中加入A
  // ========================================
  nodes.forEach((node) => {
    (node.outEdges || []).forEach((targetId) => {
      // 只处理存在的targetId,避免undefined键
      if (radj[targetId]) radj[targetId].push(node.id);
    });
  });

  return { adj, radj, nmap };
}

/**
 * 科技树主组件
 * 作为整个应用的根组件,负责数据获取、状态管理和子组件组装
 *
 * @param {Object} props
 * @param {Object} [props.uiConfig] - 可选的UI配置覆盖(用于调试/预览)
 *   传入时会覆盖从后端获取的uiConfig
 *
 * @returns {JSX.Element}
 *
 * 状态流程:
 *   1. 初始: loading=true, 显示LoadingScreen
 *   2. 成功: loading=false, error=null, 显示卷轴体验
 *   3. 失败: error有值, 显示ErrorScreen
 */
export default function HuaxiaTechTree({ uiConfig: uiConfigOverride } = {}) {
  // ===================== 数据层 =====================
  // 从后端获取图数据
  // useGraphData 是异步的,初始返回 loading=true
  // 成功后会设置各状态并返回数据
  // 失败时会设置 error 并返回
  //
  // 返回的数据结构:
  //   NODES: 节点数组
  //   POS: 位置映射 { nodeId: { x, y } }
  //   CAT: 类别映射 { catId: { code, name, color } }
  //   ADJ: 邻接表 { nodeId: [targetId, ...] }
  //   RADJ: 逆邻接表 { nodeId: [sourceId, ...] }
  //   NMAP: 节点映射 { nodeId: nodeObject }
  //   timelineConfig: 时代配置数组
  //   uiConfig: UI配置对象
  //   loading: 加载中标志
  //   error: 错误信息(如有)
  // =====================
  const { NODES, POS, CAT, ADJ, RADJ, NMAP, timelineConfig, uiConfig, loading, error } = useGraphData();

  // ===================== 交互层 =====================
  // 管理视图的平移(pan)和缩放(scale)状态
  // 以及相关的交互事件处理
  //
  // 状态:
  //   pan: { x, y } 画布平移量(像素)
  //   scale: 缩放比例(1=100%)
  //   isDragging: 鼠标拖拽中标志
  //   viewportRef: SVG视口的React引用
  //
  // handlers (事件处理):
  //   onWheel: 滚轮缩放
  //   onMouseDown: 拖拽开始
  //   onMouseMove: 拖拽中
  //   onMouseUp: 拖拽结束
  //   onMouseLeave: 鼠标离开画布
  //
  // actions (动作方法):
  //   zoomIn: 放大
  //   zoomOut: 缩小
  //   resetView: 重置视图到初始位置
  //   panToNode(id): 平移到指定节点
  //   panToWorldPoint({ x, y }): 平移到世界坐标
  // =====================
  const {
    pan,
    scale,
    isDragging,
    viewportRef,
    setBounds,
    handlers,
    actions,
  } = usePanZoom();

  // ===================== 快捷键 =====================
  // 注册 Ctrl+K / Cmd+K 快捷键
  // 用于快速打开搜索弹窗
  // (效果等同于点击搜索按钮)
  // =====================
  useEffect(() => {
    const handleKeyDown = (event) => {
      // 检查 Ctrl+K (Windows/Linux) 或 Cmd+K (macOS)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();  // 阻止浏览器默认的快捷键行为
        // 触发搜索按钮点击
        // data-scroll-search 属性标识搜索按钮
        document.querySelector("[data-scroll-search]")?.click();
      }
    };

    // 注册键盘事件
    window.addEventListener("keydown", handleKeyDown);
    // 清理: 组件卸载时移除事件监听
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ===================== 图数据处理 =====================
  // graphMaps: 图结构映射
  //
  // 优先使用后端返回的ADJ/RADJ/NMAP
  // 如果后端未返回(空对象),则从节点数据构建
  // =====================
  const graphMaps = useMemo(() => {
    // 检查后端是否返回了预计算的映射
    if (Object.keys(NMAP || {}).length) {
      // 使用后端返回的
      return { adj: ADJ, radj: RADJ, nmap: NMAP };
    }
    // 后端未返回,从节点数据构建备选映射
    return buildFallbackMaps(NODES);
  }, [ADJ, RADJ, NMAP, NODES]);

  // EDGES: 有向边数组
  // 从节点列表和邻接表推导所有边
  // 边的格式: { from: sourceId, to: targetId }
  // =====================
  const EDGES = useMemo(() => deriveEdges(NODES, graphMaps.adj), [NODES, graphMaps.adj]);

  // resolvedUiConfig: 解析后的UI配置
  // 优先使用传入的覆盖配置,否则使用后端配置
  // =====================
  const resolvedUiConfig = useMemo(
    () => normalizeUiConfig(uiConfigOverride || uiConfig),
    [uiConfigOverride, uiConfig]
  );

  // ===================== 视口边界计算 =====================
  // 根据节点位置设置拖拽边界
  // 确保:
  // 1. 所有节点都在可视区域内
  // 2. 拖拽不会让节点移出画面太多
  //
  // 使用 setTimeout(0) 确保在DOM渲染完成后执行
  // =====================
  useEffect(() => {
    // 数据未准备好则跳过
    if (NODES.length === 0 || Object.keys(POS).length === 0) return;

    const timeoutId = setTimeout(() => {
      const viewportEl = viewportRef.current;
      if (!viewportEl) return;

      // 获取视口尺寸
      const rect = viewportEl.getBoundingClientRect();
      const viewportWidth = rect.width;
      const viewportHeight = rect.height;

      // 收集所有节点的x、y坐标
      const xValues = Object.values(POS).map((position) => position.x);
      const yValues = Object.values(POS).map((position) => position.y);

      // 设置拖拽边界
      // 参数: minX, maxX, viewWidth, minY, maxY, viewHeight
      // 使节点分布范围适配视口大小
      setBounds(
        Math.min(...xValues),  // 最左节点x
        Math.max(...xValues),  // 最右节点x
        viewportWidth,       // 视口宽度
        Math.min(...yValues),  // 最上节点y
        Math.max(...yValues),  // 最下节点y
        viewportHeight      // 视口高度
      );
    }, 0);  // 延迟0ms,在下一帧执行

    // 清理 timeout
    return () => clearTimeout(timeoutId);
  }, [NODES, POS, setBounds, viewportRef]);

  // ===================== 渲染 =====================
  // 根据状态渲染不同内容:
  //   1. loading=true -> LoadingScreen (加载中界面)
  //   2. error有值 -> ErrorScreen (错误界面)
  //   3. 正常 -> HuaxiaScrollExperience (主界面)
  // =====================

  // 加载中显示
  if (loading) return <LoadingScreen />;

  // 错误显示
  if (error) return <ErrorScreen error={error} />;

  // 正常渲染卷轴式体验
  // 将所有数据和交互方法传递给子组件
  return (
    <HuaxiaScrollExperience
      // 节点数据
      NODES={NODES}
      // 节点位置
      POS={POS}
      // 类别
      CAT={CAT}
      // 边
      EDGES={EDGES}
      // 邻接表(前驱)
      ADJ={graphMaps.adj}
      // 逆邻接表(后继)
      RADJ={graphMaps.radj}
      // 节点映射
      NMAP={graphMaps.nmap}
      // 时代配置
      timelineConfig={timelineConfig}
      // UI配置
      uiConfig={resolvedUiConfig}
      // 视图状态
      pan={pan}
      scale={scale}
      // 视口引用
      viewportRef={viewportRef}
      // 事件���理
      handlers={handlers}
      // 动作方法
      actions={actions}
      // 拖拽状态
      isDragging={isDragging}
    />
  );
}
