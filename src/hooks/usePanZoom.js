// ============================================================
// usePanZoom.js
// 画布平移与缩放逻辑
// ============================================================

import { useState, useCallback, useRef } from "react";
import {
  MIN_SCALE,
  MAX_SCALE,
  ZOOM_FACTOR,
  SCALE_BUTTON_FACTOR_IN,
  SCALE_BUTTON_FACTOR_OUT,
} from "../utils/constants";

export function usePanZoom() {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [timelinePanX, setTimelinePanX] = useState(0);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  // 绑定到 svg 或画布容器上，用于获取画布中心点
  const viewportRef = useRef(null);

  const panRef = useRef({
    x: 0,
    y: 0,
    dragging: false,
    startX: 0,
    startY: 0,
  });

  const scaleRef = useRef(1);

  // 通用缩放函数：以容器内某个锚点(anchorX, anchorY)进行缩放
  const zoomAt = useCallback((anchorX, anchorY, targetScale) => {
    const oldScale = scaleRef.current;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));

    if (newScale === oldScale) return;

    // 缩放前，锚点对应的“世界坐标 / 画布坐标”
    const worldX = (anchorX - panRef.current.x) / oldScale;
    const worldY = (anchorY - panRef.current.y) / oldScale;

    // 缩放后重新计算 pan，让这个世界坐标仍然停留在 anchor 上
    const newPanX = anchorX - worldX * newScale;
    const newPanY = anchorY - worldY * newScale;

    scaleRef.current = newScale;
    panRef.current = {
      ...panRef.current,
      x: newPanX,
      y: newPanY,
    };

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
    setTimelinePanX(newPanX);
  }, []);

  // 获取画布中心点（相对当前容器左上角）
  const getViewportCenter = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    return {
      x: rect.width / 2,
      y: rect.height / 2,
    };
  }, []);

  // 鼠标滚轮缩放：以鼠标位置为中心
  const onWheel = useCallback(
    (e) => {
      e.preventDefault();

      const factor = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
      const nextScale = scaleRef.current * factor;

      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      zoomAt(mouseX, mouseY, nextScale);
    },
    [zoomAt]
  );

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;

    panRef.current = {
      ...panRef.current,
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
    };

    setIsDragging(true);
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!panRef.current.dragging) return;

    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;

    panRef.current.startX = e.clientX;
    panRef.current.startY = e.clientY;

    const newPan = {
      x: panRef.current.x + dx,
      y: panRef.current.y + dy,
    };

    panRef.current = {
      ...panRef.current,
      x: newPan.x,
      y: newPan.y,
    };

    setPan(newPan);
    setTimelinePanX(newPan.x);
  }, []);

  const onMouseUp = useCallback(() => {
    panRef.current = {
      ...panRef.current,
      dragging: false,
    };
    setIsDragging(false);
  }, []);

  const onMouseLeave = useCallback(() => {
    panRef.current = {
      ...panRef.current,
      dragging: false,
    };
    setIsDragging(false);
  }, []);

  // 按钮放大：以画布中心为中心
  const zoomIn = useCallback(() => {
    const center = getViewportCenter();
    if (!center) return;

    const nextScale = scaleRef.current * SCALE_BUTTON_FACTOR_IN;
    zoomAt(center.x, center.y, nextScale);
  }, [getViewportCenter, zoomAt]);

  // 按钮缩小：以画布中心为中心
  const zoomOut = useCallback(() => {
    const center = getViewportCenter();
    if (!center) return;

    const nextScale = scaleRef.current * SCALE_BUTTON_FACTOR_OUT;
    zoomAt(center.x, center.y, nextScale);
  }, [getViewportCenter, zoomAt]);

  const resetView = useCallback(() => {
    panRef.current = {
      x: 0,
      y: 0,
      dragging: false,
      startX: 0,
      startY: 0,
    };

    scaleRef.current = 1;

    setPan({ x: 0, y: 0 });
    setScale(1);
    setTimelinePanX(0);
    setIsDragging(false);
  }, []);

  return {
    pan,
    timelinePanX,
    scale,
    isDragging,
    panRef,
    scaleRef,
    viewportRef,
    handlers: {
      onWheel,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
    },
    actions: {
      zoomIn,
      zoomOut,
      resetView,
    },
  };
}