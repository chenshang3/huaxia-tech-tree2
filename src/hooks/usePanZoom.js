// ============================================================
// usePanZoom.js
// 平移缩放状态管理与事件处理
// ============================================================
// 职责:
// 1. 管理视图的平移(pan)和缩放(scale)状态
// 2. 处理拖拽、滚轮、按钮等交互事件
// 3. 计算边界,限制拖拽范围
// 4. 提供动画过渡效果
//
// 坐标系统:
//
//   屏幕坐标 (Screen coords)
//     - 浏览器窗口的像素坐标
//     - clientX, clientY
//
//   SVG坐标 (SVG user space)
//     - SVG内部的坐标系
//     - 由 viewBox 定义
//
//   世界坐标 (World coords)
//     - 独立于视图变换的"真实"坐标
//     - pan=(0,0), scale=1 时的坐标
//
// 坐标转换:
//   屏幕 → SVG: clientToSvg(clientX, clientY)
//   SVG → 世界: (svgX - pan.x) / scale, (svgY - pan.y) / scale
//
// 拖拽边界说明:
//
//   水平方向:
//     - 限制在使所有节点可见的范围内
//     - minPanX ~ maxPanX 根据节点位置计算
//
//   垂直方向:
//     - 限制在屏幕垂直居中附近
//     - 节点不能被拖到屏幕2/3以下或1/3以上
// ============================================================

import { useState, useCallback, useRef } from "react";
import {
  MIN_SCALE,
  MAX_SCALE,
  ZOOM_FACTOR,
  SCALE_BUTTON_FACTOR_IN,
  SCALE_BUTTON_FACTOR_OUT,
} from "../utils/constants";

/**
 * 平移缩放Hook
 * 管理视图的平移和缩放状态,处理各种交互事件
 *
 * @returns {Object} 包含状态、引用、事件处理器、动作方法
 *
 * 返回结构:
 *   {
 *     pan: { x, y },         // 当前平移量
 *     timelinePanX: number,   // 时间轴专用平移量
 *     scale: number,         // 缩放比例
 *     isDragging: boolean,   // 拖拽中标志
 *     viewportRef: Ref,     // SVG视口引用
 *     boundsConfigRef: Ref, // 边界配置引用
 *     setBounds: Function,    // 设置边界方法
 *     handlers: {             // 事件处理器
 *       onWheel, onMouseDown, onMouseMove, onMouseUp, onMouseLeave
 *     },
 *     actions: {             // 动作方法
 *       zoomIn, zoomOut, resetView, panToWorldPoint, panToNode
 *     }
 *   }
 */
export function usePanZoom() {
  // ===================== 状态定义 =====================
  // 视图平移量(像素)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // 时间轴专用水平平移量(与pan.x同步)
  const [timelinePanX, setTimelinePanX] = useState(0);
  // 缩放比例(1=100%)
  const [scale, setScale] = useState(1);
  // 拖拽中标志(用于禁用tooltip等)
  const [isDragging, setIsDragging] = useState(false);

  // ===================== 引用定义 =====================
  // SVG视口DOM引用
  const viewportRef = useRef(null);

  // 内部状态引用(避免闭包问题)
  // 用于在事件处理中访问最新状态
  const panRef = useRef({
    x: 0,
    y: 0,
    dragging: false,  // 是否正在拖拽
    startX: 0,        // 拖拽起始点(SVG坐标)
    startY: 0,
  });

  // 缩放引用
  const scaleRef = useRef(1);

  // 动画帧引用
  const animTargetRef = useRef(null);

  // 边界配置引用
  // 由 useGraphData 或 HuaxiaTechTree 调用 setBounds 设置
  const boundsConfigRef = useRef({
    minNodeX: 0,       // 最左节点x
    maxNodeX: 0,       // 最右节点x
    minNodeY: 0,       // 最上节点y
    maxNodeY: 0,       // 最下节点y
    viewportWidth: Infinity,   // 视口宽度
    viewportHeight: Infinity, // 视口高度
  });

  // ===================== 边界设置 =====================
  /**
   * 设置拖拽���界
   * 由父组件在数据加载后调用
   *
   * @param {number} minNodeX - 最左节点x坐标
   * @param {number} maxNodeX - 最右节点x坐标
   * @param {number} viewportWidth - 视口宽度(像素)
   * @param {number} minNodeY - 最上节点y坐标(默认0)
   * @param {number} maxNodeY - 最下节点y坐标(默认0)
   * @param {number} viewportHeight - 视口高度(默认Infinity)
   */
  const setBoundsConfig = useCallback((minNodeX, maxNodeX, viewportWidth, minNodeY = 0, maxNodeY = 0, viewportHeight = Infinity) => {
    boundsConfigRef.current = { minNodeX, maxNodeX, minNodeY, maxNodeY, viewportWidth, viewportHeight };
  }, []);

  // ===================== 边界限制 =====================
  /**
   * 限制X方向平移量
   * 使节点在可视范围内
   *
   * @param {number} x - 原始平移量
   * @returns {number} 限制后的平移量
   */
  const clampPanX = useCallback((x) => {
    const { minNodeX, maxNodeX, viewportWidth } = boundsConfigRef.current;
    const currentScale = scaleRef.current;
    if (!isFinite(viewportWidth)) return x;

    // 计算可平移范围
    // 当panX = viewportWidth/2 - minNodeX*scale时,最左节点在视口左边缘
    // 当panX = viewportWidth/2 - maxNodeX*scale时,最右节点在视口右边缘
    const minPanX = viewportWidth / 2 - maxNodeX * currentScale;
    const maxPanX = viewportWidth / 2 - minNodeX * currentScale;

    return Math.max(minPanX, Math.min(maxPanX, x));
  }, []);

  /**
   * 限制Y方向平移量
   * 限制节点在视口垂直居中附近
   *
   * 规则:
   * - 最上节点不能被拖到屏幕2/3以下
   * - 最下节点不能被拖到屏幕1/3以上
   *
   * @param {number} y - 原始平移量
   * @returns {number} 限制后的平移量
   */
  const clampPanY = useCallback((y) => {
    const { minNodeY, maxNodeY, viewportHeight } = boundsConfigRef.current;
    const currentScale = scaleRef.current;
    if (!isFinite(viewportHeight)) return y;

    // 垂直分界线在屏幕中间
    const verticalBoundaryY = viewportHeight * (1/2);
    const minPanY = verticalBoundaryY - maxNodeY * currentScale;
    const maxPanY = verticalBoundaryY - minNodeY * currentScale;

    return Math.max(minPanY, Math.min(maxPanY, y));
  }, []);

  // ===================== 坐标转换 =====================
  /**
   * 屏幕坐标 → SVG坐标
   * 使用SVG的getScreenCTM矩阵变换
   *
   * @param {number} clientX - 屏幕X坐标
   * @param {number} clientY - 屏幕Y坐标
   * @returns {Object|null} { x, y } 或 null(如果失败)
   */
  const clientToSvg = useCallback((clientX, clientY) => {
    const svg = viewportRef.current;
    if (!svg) return null;

    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;

    const ctm = svg.getScreenCTM();
    if (!ctm) return null;

    return pt.matrixTransform(ctm.inverse());
  }, []);

  /**
   * 获取视口中心点(SVG坐标)
   * 用于按钮缩放时的中心点
   *
   * @returns {Object|null} { x, y } 或 null
   */
  const getViewportCenter = useCallback(() => {
    const svg = viewportRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    return clientToSvg(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [clientToSvg]);

  // ===================== 缩放 =====================
  /**
   * 在指定锚点缩放
   * 保持锚点位置不变
   *
   * @param {number} anchorX - 锚点X(SVG坐标)
   * @param {number} anchorY - 锚点Y(SVG坐标)
   * @param {number} targetScale - 目标缩放比例
   */
  const zoomAt = useCallback((anchorX, anchorY, targetScale) => {
    const oldScale = scaleRef.current;
    // 限制在允许范围内
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));
    if (newScale === oldScale) return;

    // 计算缩放前的世界坐���
    const worldX = (anchorX - panRef.current.x) / oldScale;
    const worldY = (anchorY - panRef.current.y) / oldScale;

    // 更新缩放
    scaleRef.current = newScale;

    // 根据新的世界坐标计算新的平移量
    const newPanX = clampPanX(anchorX - worldX * newScale);
    const newPanY = clampPanY(anchorY - worldY * newScale);

    panRef.current = {
      ...panRef.current,
      x: newPanX,
      y: newPanY,
    };

    // 更新React状态
    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
    setTimelinePanX(newPanX);
  }, [clampPanX, clampPanY]);

  // ===================== 事件处理 =====================
  /**
   * 滚轮事件 → 缩放
   * 向上滚动放大,向下滚动缩小
   */
  const onWheel = useCallback((e) => {
    e.preventDefault();

    // 滚动方向判断
    const factor = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
    const nextScale = scaleRef.current * factor;

    // 鼠标位置作为锚点
    const anchor = clientToSvg(e.clientX, e.clientY);
    if (!anchor) return;

    zoomAt(anchor.x, anchor.y, nextScale);
  }, [clientToSvg, zoomAt]);

  /**
   * 鼠标按下 → 开始拖拽
   * 只响应左键(button=0)
   */
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;

    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;

    // 记录起始位置
    panRef.current = {
      ...panRef.current,
      dragging: true,
      startX: p.x,
      startY: p.y,
    };

    setIsDragging(true);
  }, [clientToSvg]);

  /**
   * 鼠标移动 → 拖拽中
   * 计算拖拽距离,更新视图位置
   */
  const onMouseMove = useCallback((e) => {
    if (!panRef.current.dragging) return;

    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;

    // 计算拖拽位移
    const dx = p.x - panRef.current.startX;
    const dy = p.y - panRef.current.startY;

    // 更新起始点(为了连续拖拽)
    panRef.current.startX = p.x;
    panRef.current.startY = p.y;

    // 计算新位置(应用边界限制)
    const newPan = {
      x: clampPanX(panRef.current.x + dx),
      y: clampPanY(panRef.current.y + dy),
    };

    panRef.current = {
      ...panRef.current,
      x: newPan.x,
      y: newPan.y,
    };

    setPan(newPan);
    setTimelinePanX(newPan.x);
  }, [clientToSvg, clampPanX, clampPanY]);

  /**
   * 鼠标松开 → 结束拖拽
   */
  const onMouseUp = useCallback(() => {
    panRef.current = {
      ...panRef.current,
      dragging: false,
    };
    setIsDragging(false);
  }, []);

  /**
   * 鼠标离开 → 结束拖拽
   */
  const onMouseLeave = useCallback(() => {
    panRef.current = {
      ...panRef.current,
      dragging: false,
    };
    setIsDragging(false);
  }, []);

  // ===================== 动作方法 =====================
  /**
   * 放大
   * 以视口中心为锚点
   */
  const zoomIn = useCallback(() => {
    const center = getViewportCenter();
    if (!center) return;
    zoomAt(center.x, center.y, scaleRef.current * SCALE_BUTTON_FACTOR_IN);
  }, [getViewportCenter, zoomAt]);

  /**
   * 缩小
   * 以视口中心为锚点
   */
  const zoomOut = useCallback(() => {
    const center = getViewportCenter();
    if (!center) return;
    zoomAt(center.x, center.y, scaleRef.current * SCALE_BUTTON_FACTOR_OUT);
  }, [getViewportCenter, zoomAt]);

  /**
   * 重置视图
   * 回到初始位置(pan=0, scale=1)
   */
  const resetView = useCallback(() => {
    // 取消正在进行中的动画
    if (animTargetRef.current) {
      cancelAnimationFrame(animTargetRef.current);
      animTargetRef.current = null;
    }

    // 重置内部状态
    panRef.current = {
      x: 0,
      y: 0,
      dragging: false,
      startX: 0,
      startY: 0,
    };

    scaleRef.current = 1;

    // 重置React状态
    setPan({ x: 0, y: 0 });
    setScale(1);
    setTimelinePanX(0);
    setIsDragging(false);
  }, []);

  // ===================== 缓动函数 =====================
  /**
   * 指数缓动函数 (ease-out-expo)
   * 用于动画,开始快结束慢
   *
   * @param {number} t - 进度(0~1)
   * @returns {number} 缓动后的进度
   */
  const easeOutExpoNormalized = (t) => {
    if (t >= 1) return 1;
    const k = 5;
    return (1 - Math.exp(-k * t)) / (1 - Math.exp(-k));
  };

  // ===================== 动画过渡 =====================
  /**
   * 动画平移到指定位置
   *
   * @param {number} targetPanX - 目标X
   * @param {number} targetPanY - 目标Y
   */
  const animatePanTo = useCallback((targetPanX, targetPanY) => {
    // 取消之前的动画
    if (animTargetRef.current) {
      cancelAnimationFrame(animTargetRef.current);
      animTargetRef.current = null;
    }

    const startPanX = clampPanX(panRef.current.x);
    const startPanY = clampPanY(panRef.current.y);
    const clampedTargetPanX = clampPanX(targetPanX);
    const clampedTargetPanY = clampPanY(targetPanY);

    // 起点先规范化,避免动画第一帧纠偏
    if (startPanX !== panRef.current.x || startPanY !== panRef.current.y) {
      panRef.current = { ...panRef.current, x: startPanX, y: startPanY };
      setPan({ x: startPanX, y: startPanY });
      setTimelinePanX(startPanX);
    }

    const startTime = performance.now();
    const duration = 400;  // 毫秒

    // 动画循环
    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = easeOutExpoNormalized(t);

      const nextPanX = clampPanX(startPanX + (clampedTargetPanX - startPanX) * ease);
      const nextPanY = clampPanY(startPanY + (clampedTargetPanY - startPanY) * ease);

      panRef.current = { ...panRef.current, x: nextPanX, y: nextPanY };
      setPan({ x: nextPanX, y: nextPanY });
      setTimelinePanX(nextPanX);

      if (t < 1) {
        animTargetRef.current = requestAnimationFrame(animate);
      } else {
        animTargetRef.current = null;
      }
    };

    animTargetRef.current = requestAnimationFrame(animate);
  }, [clampPanX, clampPanY]);

  // ===================== 便捷方法 =====================
  /**
   * 平移到世界坐标点
   *
   * @param {Object} point - { x, y } 世界坐标(可选y)
   */
  const panToWorldPoint = useCallback(({ x, y }) => {
    if (!Number.isFinite(x)) return;

    const center = getViewportCenter();
    if (!center) return;

    // 根据世界坐标计算需要的平移量
    const targetPanX = center.x - x * scaleRef.current;
    const targetPanY = Number.isFinite(y)
      ? center.y - y * scaleRef.current
      : clampPanY(panRef.current.y);

    animatePanTo(targetPanX, targetPanY);
  }, [animatePanTo, clampPanY, getViewportCenter]);

  /**
   * 平移到指定节点
   *
   * @param {string} nodeId - 节点ID
   * @param {Object} POS - 位置映射
   */
  const panToNode = useCallback((nodeId, POS) => {
    const nodePos = POS[nodeId];
    if (!nodePos) return;

    panToWorldPoint(nodePos);
  }, [panToWorldPoint]);

  // ===================== 返回 =====================
  return {
    // 状态
    pan,
    timelinePanX,
    scale,
    isDragging,

    // 引用(供父组件访问内部状态)
    panRef,
    scaleRef,
    viewportRef,
    boundsConfigRef,

    // 边界设置方法
    setBounds: setBoundsConfig,

    // 事件处理器
    handlers: {
      onWheel,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
    },

    // 动作方法
    actions: {
      zoomIn,
      zoomOut,
      resetView,
      panToWorldPoint,
      panToNode,
    },
  };
}
