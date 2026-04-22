/* ============================================================
 * NodeTooltip.jsx
 * 节点悬停提示组件
 * ============================================================ */
 /* 职责:
  * 1. 显示悬浮节点的基本信息
  * 2. 位置自适应(避免超出视口)
  * 3. 使用React Portal渲染到body
  * 4. 动画过渡效果
  *
  * 显示内容:
  *   - 节点名称 + 英文名
  *   - 类别标签 + 年份
  *   - 描述摘要(截断80字符)
  *   - 发明者
  * ============================================================ */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './NodeTooltip.css';

/**
 * 节点悬浮提示
 * 使用React Portal渲染到document.body
 *
 * @param {Object} props
 * @param {Object|null} props.node - 当前悬浮的节点
 * @param {Object} props.CAT - 类别映射
 * @param {Object} props.position - 显示位置(屏幕坐标)
 * @param {boolean} props.isVisible - 是否显示
 */
export function NodeTooltip({ node, CAT, position, isVisible }) {
  const tooltipRef = useRef(null);
  // 保存渲染用的节点(允许动画完成后再隐藏)
  const [renderedNode, setRenderedNode] = useState(node);
  // 保存渲染用的位置
  const [renderedPosition, setRenderedPosition] = useState(position);
  // 调整后的位置(避免超出视口)
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  // 显示状态: visible/leaving/hidden
  const [displayState, setDisplayState] = useState(
    isVisible && node ? 'visible' : 'hidden'
  );

  // ===================== 状态更新 =====================
  // 显示或准备离开
  useEffect(() => {
    if (isVisible && node) {
      setRenderedNode(node);
      setRenderedPosition(position);
      setAdjustedPosition(position);
      setDisplayState('visible');
      return;
    }

    if (renderedNode) {
      setDisplayState('leaving');
    }
  }, [isVisible, node, position, renderedNode]);

  // ===================== 位置调整 =====================
  // 根据视口边界调整tooltip位置
  useEffect(() => {
    if (displayState !== 'visible' || !renderedNode || !tooltipRef.current) return;

    const rect = tooltipRef.current.getBoundingClientRect();
    const tooltipWidth = rect.width || 280;
    const newPos = { ...renderedPosition };

    // X方向: 保持在视口内
    newPos.x = Math.min(
      Math.max(renderedPosition.x + 12, 8),
      window.innerWidth - tooltipWidth - 8
    );

    // Y方向: 避免超出上下边界
    if (rect.top < 0) {
      newPos.y += Math.abs(rect.top) + 8;
    }
    if (rect.bottom > window.innerHeight) {
      newPos.y -= (rect.bottom - window.innerHeight) + 16;
    }

    setAdjustedPosition(newPos);
  }, [displayState, renderedNode, renderedPosition]);

  // 无节点则不渲染
  if (!renderedNode) return null;

  // 获取类别信息
  const catInfo = CAT[renderedNode.cat];
  const catColor = catInfo?.color || '#c8a045';
  const catLabel = catInfo?.label || renderedNode.cat;

  // 格式化年份
  const yearStr = !renderedNode.year
    ? ''
    : renderedNode.year < 0
      ? `${Math.abs(renderedNode.year)} BC`
      : `${renderedNode.year} AD`;

  // 使用Portal渲染到body
  return createPortal(
    <div
      ref={tooltipRef}
      className={`node-tooltip node-tooltip--${displayState}`}
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
      onAnimationEnd={() => {
        if (displayState === 'leaving') {
          setRenderedNode(null);
          setDisplayState('hidden');
        }
      }}
    >
      <div className="node-tooltip-content">
        {/* 头部: 名称 */}
        <div className="node-tooltip-header">
          <div className="node-tooltip-name">{renderedNode.name}</div>
          {renderedNode.en && <div className="node-tooltip-en">{renderedNode.en}</div>}
        </div>

        {/* 元信息: 类别 + 年份 */}
        <div className="node-tooltip-meta">
          <span 
            className="node-tooltip-category"
            style={{ borderColor: catColor, color: catColor }}
          >
            {catLabel}
          </span>
          {yearStr && <span className="node-tooltip-year">{yearStr}</span>}
        </div>

        {/* 描述摘要 */}
        {renderedNode.desc && (
          <div className="node-tooltip-desc">
            {renderedNode.desc.slice(0, 80)}
            {renderedNode.desc.length > 80 ? '...' : ''}
          </div>
        )}

        {/* 发明者 */}
        {renderedNode.inv && (
          <div className="node-tooltip-inv">
            <strong>发明者：</strong>{renderedNode.inv}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
