/* ============================================================
 * NodeTooltip.jsx
 * 节点悬停提示组件
 * 
 * 显示节点的基本信息：名称、分类、年份、描述摘要
 * ============================================================ */

import React, { useState, useRef, useEffect } from 'react';
import './NodeTooltip.css';

export function NodeTooltip({ node, CAT, position, isVisible }) {
  const tooltipRef = useRef(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // 根据视口边界调整 Tooltip 位置
  useEffect(() => {
    if (!isVisible || !tooltipRef.current) return;

    const rect = tooltipRef.current.getBoundingClientRect();
    const newPos = { ...position };

    // 检查右边界
    if (rect.right > window.innerWidth) {
      newPos.x -= (rect.right - window.innerWidth) + 16;
    }

    // 检查上边界
    if (rect.top < 0) {
      newPos.y += Math.abs(rect.top) + 8;
    }

    // 检查下边界
    if (rect.bottom > window.innerHeight) {
      newPos.y -= (rect.bottom - window.innerHeight) + 16;
    }

    // 检查左边界
    if (newPos.x < 0) {
      newPos.x = 8;
    }

    setAdjustedPosition(newPos);
  }, [isVisible, position]);

  if (!isVisible || !node) return null;

  const catInfo = CAT[node.cat];
  const catColor = catInfo?.color || '#c8a045';
  const catLabel = catInfo?.label || node.cat;

  // 格式化年份
  const yearStr = !node.year ? '' : node.year < 0 ? `${Math.abs(node.year)} BC` : `${node.year} AD`;

  return (
    <div
      ref={tooltipRef}
      className="node-tooltip"
      style={{
        left: `${adjustedPosition.x + 12}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      <div className="node-tooltip-content">
        <div className="node-tooltip-header">
          <div className="node-tooltip-name">{node.name}</div>
          {node.en && <div className="node-tooltip-en">{node.en}</div>}
        </div>

        <div className="node-tooltip-meta">
          <span 
            className="node-tooltip-category"
            style={{ borderColor: catColor, color: catColor }}
          >
            {catLabel}
          </span>
          {yearStr && <span className="node-tooltip-year">{yearStr}</span>}
        </div>

        {node.desc && (
          <div className="node-tooltip-desc">
            {node.desc.slice(0, 80)}
            {node.desc.length > 80 ? '...' : ''}
          </div>
        )}

        {node.inv && (
          <div className="node-tooltip-inv">
            <strong>发明者：</strong>{node.inv}
          </div>
        )}
      </div>
    </div>
  );
}
