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

  const viewportRef = useRef(null);

  const panRef = useRef({
    x: 0,
    y: 0,
    dragging: false,
    startX: 0, // 改成存 SVG 坐标
    startY: 0,
  });

  const scaleRef = useRef(1);
  const animTargetRef = useRef(null);

  const boundsConfigRef = useRef({
    minNodeX: 0,
    maxNodeX: 0,
    viewportWidth: Infinity, // 这里也应该是 SVG 坐标宽度
  });

  const setBoundsConfig = useCallback((minNodeX, maxNodeX, viewportWidth) => {
    boundsConfigRef.current = { minNodeX, maxNodeX, viewportWidth };
  }, []);

  const clampPanX = useCallback((x) => {
    const { minNodeX, maxNodeX, viewportWidth } = boundsConfigRef.current;
    const currentScale = scaleRef.current;
    if (!isFinite(viewportWidth)) return x;

    const minPanX = viewportWidth / 2 - maxNodeX * currentScale;
    const maxPanX = viewportWidth / 2 - minNodeX * currentScale;

    return Math.max(minPanX, Math.min(maxPanX, x));
  }, []);

  // 屏幕坐标 -> SVG user space
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

  // 视口中心，返回 SVG 坐标
  const getViewportCenter = useCallback(() => {
    const svg = viewportRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    return clientToSvg(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [clientToSvg]);

  const zoomAt = useCallback((anchorX, anchorY, targetScale) => {
    const oldScale = scaleRef.current;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));
    if (newScale === oldScale) return;

    const worldX = (anchorX - panRef.current.x) / oldScale;
    const worldY = (anchorY - panRef.current.y) / oldScale;

    const newPanX = clampPanX(anchorX - worldX * newScale);
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
  }, [clampPanX]);

  const onWheel = useCallback((e) => {
    e.preventDefault();

    const factor = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
    const nextScale = scaleRef.current * factor;

    const anchor = clientToSvg(e.clientX, e.clientY);
    if (!anchor) return;

    zoomAt(anchor.x, anchor.y, nextScale);
  }, [clientToSvg, zoomAt]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;

    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;

    panRef.current = {
      ...panRef.current,
      dragging: true,
      startX: p.x,
      startY: p.y,
    };

    setIsDragging(true);
  }, [clientToSvg]);

  const onMouseMove = useCallback((e) => {
    if (!panRef.current.dragging) return;

    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;

    const dx = p.x - panRef.current.startX;
    const dy = p.y - panRef.current.startY;

    panRef.current.startX = p.x;
    panRef.current.startY = p.y;

    const newPan = {
      x: clampPanX(panRef.current.x + dx),
      y: panRef.current.y + dy,
    };

    panRef.current = {
      ...panRef.current,
      x: newPan.x,
      y: newPan.y,
    };

    setPan(newPan);
    setTimelinePanX(newPan.x);
  }, [clientToSvg, clampPanX]);

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

  const zoomIn = useCallback(() => {
    const center = getViewportCenter();
    if (!center) return;
    zoomAt(center.x, center.y, scaleRef.current * SCALE_BUTTON_FACTOR_IN);
  }, [getViewportCenter, zoomAt]);

  const zoomOut = useCallback(() => {
    const center = getViewportCenter();
    if (!center) return;
    zoomAt(center.x, center.y, scaleRef.current * SCALE_BUTTON_FACTOR_OUT);
  }, [getViewportCenter, zoomAt]);

  const resetView = useCallback(() => {
    if (animTargetRef.current) {
      cancelAnimationFrame(animTargetRef.current);
      animTargetRef.current = null;
    }

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

  const easeOutExpoNormalized = (t) => {
    if (t >= 1) return 1;
    const k = 5;
    return (1 - Math.exp(-k * t)) / (1 - Math.exp(-k));
  };

  const panToNode = useCallback((nodeId, POS) => {
    const nodePos = POS[nodeId];
    if (!nodePos) return;

    const center = getViewportCenter();
    if (!center) return;

    if (animTargetRef.current) {
      cancelAnimationFrame(animTargetRef.current);
      animTargetRef.current = null;
    }

    const startPanX = clampPanX(panRef.current.x);
    const startPanY = panRef.current.y;

    const targetPanX = clampPanX(center.x - nodePos.x * scaleRef.current);
    const targetPanY = center.y - nodePos.y * scaleRef.current;

    // 起点先规范化，避免动画第一帧纠偏
    if (startPanX !== panRef.current.x) {
      panRef.current = { ...panRef.current, x: startPanX, y: startPanY };
      setPan({ x: startPanX, y: startPanY });
      setTimelinePanX(startPanX);
    }

    const startTime = performance.now();
    const duration = 400;

    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = easeOutExpoNormalized(t);

      const nextPanX = clampPanX(startPanX + (targetPanX - startPanX) * ease);
      const nextPanY = startPanY + (targetPanY - startPanY) * ease;

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
  }, [getViewportCenter, clampPanX]);

  return {
    pan,
    timelinePanX,
    scale,
    isDragging,
    panRef,
    scaleRef,
    viewportRef,
    boundsConfigRef,
    setBounds: setBoundsConfig,
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
      panToNode,
    },
  };
}