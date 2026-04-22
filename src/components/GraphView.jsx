// ============================================================
// GraphView.jsx
// SVG 知识图谱渲染组件
// ============================================================
// 职责:
// 1. 渲染SVG画布(网格背景)
// 2. 渲染节点(圆形+文字+年份)
// 3. 渲染边(贝塞尔曲线)
// 4. 渲染时间轴(时代色块+标签)
// 5. 管理悬浮tooltip
// 6. 提供缩放控制按钮
//
// 节点视觉:
//
//   外环: 状态色圆环(区分current/visited/queued/stacked/faded)
//   底色: 宣纸色圆形(#fffef8)
//   边框: 根据状态变色
//   名称: 根据字数调整字号和位置
//   年份: 显示在节点下方
//   脉冲: 当前节点有动画效果
//
// 边视觉:
//
//   - active: 红色粗线(正在遍历)
//   - path: 红色最粗(叶子边)
//   - done: 橙色(已完成)
//   - idle: 淡棕色(待遍历)
//   - faded: 很淡的棕色(不可达)
//
// 时间轴:
//
//   - 随pan和scale变换
//   - 图形(scale变换会拉伸)
//   - 文字(单独渲染避免拉伸)
// ============================================================

import React from "react";
import { NODE_RADIUS, VIEW_BOX } from "../utils/constants";
import { nState, eState, edgePath } from "../utils/graphUtils";
import {
  computeEraTimelinePositions,
  getActiveEraIndex,
  mergeEraBackgrounds,
  TIMELINE_LAYOUT,
} from "../utils/timelineUtils";
import { ERA_BACKGROUND_SETTINGS } from "../config/eraBackgrounds";
import { EraBackgroundLayer } from "./EraBackgroundLayer";
import { NodeTooltip } from "./NodeTooltip";
import "../styles/GraphView.css";

/**
 * 图谱视图组件
 * 核心渲染组件,负责SVG图谱的绘制
 *
 * @param {Object} props
 * @param {Array} props.NODES - 节点数组
 * @param {Object} props.POS - 位置映射
 * @param {Object} props.CAT - 类别映射
 * @param {Object} props.ADJ - 邻接表
 * @param {Array} props.EDGES - 边数组
 * @param {Object} props.pan - 平移量 { x, y }
 * @param {number} props.scale - 缩放比例
 * @param {number} props.timelinePanX - 时间轴平移量
 * @param {string} props.sel - 选中的节点ID
 * @param {Object} props.step - 当前遍历步骤
 * @param {string} props.mode - 遍历模式
 * @param {Function} props.onNode - 节点点击回调
 * @param {Object} props.handlers - 事件处理
 * @param {Object} props.actions - 动作方法
 * @param {Ref} props.viewportRef - SVG引用
 * @param {boolean} props.isDragging - 拖拽中
 * @param {Array} props.timelineConfig - 时代配置
 */
export const GraphView = React.memo(function GraphView({
  NODES,
  POS,
  CAT,
  ADJ,
  EDGES,
  pan,
  scale,
  timelinePanX,
  sel,
  step,
  mode,
  onNode,
  handlers,
  actions,
  viewportRef,
  isDragging,
  timelineConfig,
}) {
  // ===================== 状态 =====================
  // 悬浮的节点
  const [hoveredNode, setHoveredNode] = React.useState(null);
  // tooltip位置(屏幕坐标)
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

  // ===================== 时代计算 =====================
  // 时代位置
  const eraPositions = React.useMemo(
    () => computeEraTimelinePositions(timelineConfig),
    [timelineConfig]
  );
  // 时代背景(含图片等)
  const eraBackgrounds = React.useMemo(
    () => mergeEraBackgrounds(timelineConfig),
    [timelineConfig]
  );
  // 当前时代索引
  const activeEraIndex = React.useMemo(
    () => getActiveEraIndex(
      eraPositions,
      timelinePanX,
      scale,
      ERA_BACKGROUND_SETTINGS.switchTriggerX
    ),
    [eraPositions, timelinePanX, scale]
  );
  // 当前时代
  const activeEra = eraBackgrounds[activeEraIndex] || eraBackgrounds[0] || null;
  // 预加载时代(前后各1个)
  const preloadEras = React.useMemo(
    () => [
      eraBackgrounds[activeEraIndex - 1],
      eraBackgrounds[activeEraIndex],
      eraBackgrounds[activeEraIndex + 1],
    ].filter(Boolean),
    [eraBackgrounds, activeEraIndex]
  );

  // ===================== 渲染 =====================
  return (
    <>
      {/* 时代背景层 */}
      <EraBackgroundLayer
        era={activeEra}
        settings={ERA_BACKGROUND_SETTINGS}
        preloadEras={preloadEras}
      />

      {/* SVG画布 */}
      <svg
        ref={viewportRef}
        className="graph-view-svg"
        viewBox={VIEW_BOX}
        preserveAspectRatio="xMidYMin meet"
        style={{
          width: "100%",
          height: "100%",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        xmlns="http://www.w3.org/2000/svg"
        onWheel={handlers.onWheel}
        onMouseDown={handlers.onMouseDown}
        onMouseMove={handlers.onMouseMove}
        onMouseUp={handlers.onMouseUp}
        onMouseLeave={handlers.onMouseLeave}
      >
        <defs>
          {/* 网格图案 */}
          <pattern id="grid" width="45" height="45" patternUnits="userSpaceOnUse">
            <path d="M 45 0 L 0 0 0 45" fill="none" stroke="rgba(139,105,20,.06)" strokeWidth=".6" />
          </pattern>

          {/* 箭头标记 */}
          {[
            ["a0", "rgba(139,105,20,.35)"],  // idle
            ["aD", "rgba(139,105,20,.7)"], // done
            ["aA", "#e74c3c"],            // active
            ["aP", "#e74c3c"],           // path
            ["aO", "#e67e22"],            // done另一种
          ].map(([id, fill]) => (
            <marker key={id} id={id} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3z" fill={fill} />
            </marker>
          ))}

          {/* 时间轴渐变 */}
          <linearGradient id="timelineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b6914" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#c8a045" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#b8860b" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* 网格背景 */}
        <rect width="1200" height="640" fill="url(#grid)" />

        {/* 图谱层: 应用平移和缩放 */}
        <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
          {/* ===================== 边 ===================== */}
          {EDGES.map((e, i) => {
            // 计算边的遍历状态
            const st = eState(e.from, e.to, step, mode);
            // 根据状态确定样式
            const [clr, sw, mk, opacity, isActive] =
              st === "active"
                ? ["#e74c3c", 2.5, "aA", 1, true]
              : st === "path"
                ? ["#e74c3c", 3.5, "aP", 1, false]
              : st === "done"
                ? ["#e67e22", 2.0, "aO", 1, false]
              : st === "idle"
                ? ["rgba(139,105,20,.35)", 1.5, "a0", 1, false]
              : st === "faded"
                ? ["rgba(139,105,20,.18)", 1.0, "a0", 0.25, false]
                : ["rgba(139,105,20,.35)", 1.5, "a0", 1, false];

            return (
              <path
                key={i}
                d={edgePath(e.from, e.to, POS, NODE_RADIUS)}
                fill="none"
                stroke={clr}
                strokeWidth={sw}
                markerEnd={`url(#${mk})`}
                opacity={opacity}
                className={`graph-edge ${isActive ? 'active' : ''}`}
                style={{ 
                  transition: "stroke .35s,stroke-width .35s,opacity .35s"
                }}
              />
            );
          })}

          {/* ===================== 节点 ===================== */}
          {NODES.map((node) => {
            const p = POS[node.id];
            const st = nState(node.id, step, mode);
            // 类别颜色
            const cc = CAT[node.cat]?.color ?? "#c8a045";
            // 是否选中
            const isSel = sel === node.id;
            // 边框颜色
            const rc =
              st === "current"
                ? "#e74c3c"
              : st === "visited"
                ? "#e67e22"
              : st === "queued"
                ? "#4a90d9"
              : st === "stacked"
                ? "#2ecc71"
              : st === "faded"
                ? "rgba(139,105,20,.5)"
              : isSel && mode === "explore"
                ? "#e74c3c"
                : cc;
            // 边框宽度
            const rw = st !== "idle" && st !== "faded" ? 2.5 : 1.8;
            const nm = node.name;
            const nl = nm.length;

            return (
              <g
                key={node.id}
                className={`graph-node ${isSel ? 'selected' : ''}`}
                transform={`translate(${p.x},${p.y})`}
                onClick={() => onNode(node.id)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredNode(node);
                  setTooltipPos({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                  });
                }}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: "pointer" }}
              >
                {/* 脉冲环: 仅当前节点 */}
                {st === "current" && (
                  <circle r={NODE_RADIUS + 14} fill="#e74c3c" opacity=".08" className="node-pulse-ring">
                    <animate
                      attributeName="r"
                      values={`${NODE_RADIUS + 10};${NODE_RADIUS + 20};${NODE_RADIUS + 10}`}
                      dur=".9s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.08;0.03;0.08"
                      dur=".9s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* 外环: 状态色 */}
                {(st !== "idle" || isSel) && (
                  <circle
                    r={NODE_RADIUS + 7}
                    fill={isSel && st === "idle" ? "#c8a045" : rc}
                    opacity={st === "faded" ? ".05" : ".1"}
                    className="node-ring"
                  />
                )}

                {/* 节点底色: 宣纸色 */}
                <circle r={NODE_RADIUS} fill="#fffef8" opacity={st === "faded" ? 0.4 : 1} />
                {/* 节点边框 */}
                <circle
                  r={NODE_RADIUS}
                  fill="none"
                  stroke={rc}
                  strokeWidth={rw}
                  opacity={st === "faded" ? 0.4 : 1}
                  className="node-circle-primary"
                  style={{ transition: "stroke .3s,opacity .3s,r .3s" }}
                />

                {/* ===================== 节点名称 ===================== */}
                {/* 1-3字: 单行 */}
                {nl <= 3 && (
                  <text y="3" textAnchor="middle" fontSize="11" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700" opacity={st === "faded" ? 0.4 : 1} className="node-text">
                    {nm}
                  </text>
                )}
                {/* 4字: 稍小 */}
                {nl === 4 && (
                  <text y="3" textAnchor="middle" fontSize="9.5" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700" opacity={st === "faded" ? 0.4 : 1} className="node-text">
                    {nm}
                  </text>
                )}
                {/* >4字: 分两行 */}
                {nl > 4 && (
                  <>
                    <text y="-6" textAnchor="middle" fontSize="9" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700" opacity={st === "faded" ? 0.4 : 1} className="node-text">
                      {nm.slice(0, 4)}
                    </text>
                    <text y="5" textAnchor="middle" fontSize="9" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700" opacity={st === "faded" ? 0.4 : 1} className="node-text">
                      {nm.slice(4)}
                    </text>
                  </>
                )}

                {/* ===================== 年份标签 ===================== */}
                <text
                  y={NODE_RADIUS + 13}
                  textAnchor="middle"
                  fontSize="8"
                  fill="rgba(90,74,56,.5)"
                  fontFamily='"JetBrains Mono"'
                  opacity={st === "faded" ? 0.4 : 1}
                  className="node-text"
                >
                  {node.year < 0 ? `${Math.abs(node.year)}BC` : `${node.year}AD`}
                </text>
              </g>
            );
          })}
        </g>

        {/* ===================== 时间轴 ===================== */}
        {(() => {
          const TL_base = 12;
          const TL_Y = TL_base + 24;           // 主轴纵坐标
          const TL_BAR_Y = TL_base + 16;       // 朝代色块纵坐标
          const TL_NAME_Y = TL_base + 8;      // 朝代名称文字
          const TL_YEAR_Y = TL_base + 40;      // 起始年份文字

          
          return (
            <g transform={`translate(${timelinePanX},0)`}>
              {/* 图形: 随scale缩放 */}
              <g transform={`scale(${scale},1)`}>
                {/* 时间轴线 */}
                <line
                  x1={TIMELINE_LAYOUT.baseOffset}
                  y1={TL_Y}
                  x2={TIMELINE_LAYOUT.rightEdge * TIMELINE_LAYOUT.widthMultiplier}
                  y2={TL_Y}
                  stroke={'rgba(139,105,20,.1)'}
                  strokeWidth={14}
                  strokeLinecap={'round'}
                />

                {/* 时代色块 */}
                {eraPositions.map(({ name, color, lightColor, x1, x2, width }) => {
                  return (
                    <g key={`shape-${name}`}>
                      <rect
                        x={x1}
                        y={TL_BAR_Y}
                        width={width}
                        height="16"
                        rx="4"
                        fill={lightColor}
                        opacity="0.7"
                      />
                      <line
                        x1={x1}
                        y1={TL_Y}
                        x2={x2}
                        y2={TL_Y}
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        opacity="0.8"
                      />
                    </g>
                  );
                })}
              </g>

              {/* 文字: 单独计算避免拉伸 */}
              {eraPositions.map(({ name, start, color, x1 }) => {
                const scaledX1 = x1 * scale;

                return (
                  <g key={`label-${name}`}>
                    <text
                      x={scaledX1 + 4}
                      y={TL_NAME_Y}
                      textAnchor="start"
                      fontSize="11"
                      fill={color}
                      fontFamily='"Noto Serif SC"'
                      fontWeight="600"
                      letterSpacing="1"
                    >
                      {name}
                    </text>

                    <text
                      x={scaledX1 + 4}
                      y={TL_YEAR_Y}
                      textAnchor="start"
                      fontSize="8"
                      fill="rgba(90,74,56,.55)"
                      fontFamily='"JetBrains Mono"'
                    >
                      {start < 0 ? `${Math.abs(start)}BC` : `${start}AD`}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })()}
      </svg>

      {/* ===================== 控制按钮 ===================== */}
      <div className="graph-view__controls">
        <button
          onClick={actions.zoomIn}
          className="graph-view__control-button"
        >
          +
        </button>

        <button
          onClick={actions.zoomOut}
          className="graph-view__control-button"
        >
          −
        </button>

        <button
          onClick={() => sel && actions.panToNode(sel, POS)}
          title="回到当前节点"
          className="graph-view__control-button graph-view__control-button--small"
        >
          ◎
        </button>

        <button
          onClick={actions.resetView}
          className="graph-view__control-button graph-view__control-button--small"
        >
          ⌂
        </button>
      </div>

      {/* ===================== Tooltip ===================== */}
      <NodeTooltip
        node={hoveredNode}
        CAT={CAT}
        position={tooltipPos}
        isVisible={hoveredNode !== null && !isDragging}
      />
    </>
  );
});
                }}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: "pointer" }}
              >
                {st === "current" && (
                  <circle r={NODE_RADIUS + 14} fill="#e74c3c" opacity=".08" className="node-pulse-ring">
                    <animate
                      attributeName="r"
                      values={`${NODE_RADIUS + 10};${NODE_RADIUS + 20};${NODE_RADIUS + 10}`}
                      dur=".9s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.08;0.03;0.08"
                      dur=".9s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {(st !== "idle" || isSel) && (
                  <circle
                    r={NODE_RADIUS + 7}
                    fill={isSel && st === "idle" ? "#c8a045" : rc}
                    opacity={st === "faded" ? ".05" : ".1"}
                    className="node-ring"
                  />
                )}

                <circle r={NODE_RADIUS} fill="#fffef8" opacity={st === "faded" ? 0.4 : 1} />
                <circle
                  r={NODE_RADIUS}
                  fill="none"
                  stroke={rc}
                  strokeWidth={rw}
                  opacity={st === "faded" ? 0.4 : 1}
                  className="node-circle-primary"
                  style={{ transition: "stroke .3s,opacity .3s,r .3s" }}
                />

                {nl <= 3 && (
                  <text y="3" textAnchor="middle" fontSize="11" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700" opacity={st === "faded" ? 0.4 : 1} className="node-text">
                    {nm}
                  </text>
                )}
                {nl === 4 && (
                  <text y="3" textAnchor="middle" fontSize="9.5" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700" opacity={st === "faded" ? 0.4 : 1} className="node-text">
                    {nm}
                  </text>
                )}
                {nl > 4 && (
                  <>
                    <text y="-6" textAnchor="middle" fontSize="9" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700" opacity={st === "faded" ? 0.4 : 1} className="node-text">
                      {nm.slice(0, 4)}
                    </text>
                    <text y="5" textAnchor="middle" fontSize="9" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700" opacity={st === "faded" ? 0.4 : 1} className="node-text">
                      {nm.slice(4)}
                    </text>
                  </>
                )}

                <text
                  y={NODE_RADIUS + 13}
                  textAnchor="middle"
                  fontSize="8"
                  fill="rgba(90,74,56,.5)"
                  fontFamily='"JetBrains Mono"'
                  opacity={st === "faded" ? 0.4 : 1}
                  className="node-text"
                >
                  {node.year < 0 ? `${Math.abs(node.year)}BC` : `${node.year}AD`}
                </text>
              </g>
            );
          })}
        </g>

        {/* 时间轴位置常量：统一控制高低 */}
        {(() => {
          const TL_base = 12;
          const TL_Y = TL_base + 24;           // 主轴纵坐标（原来 44）
          const TL_BAR_Y = TL_base + 16;       // 朝代色块纵坐标（原来 36）
          const TL_NAME_Y = TL_base + 8;      // 朝代名称文字（原来 28）
          const TL_YEAR_Y = TL_base + 40;      // 起始年份文字（原来 60）

          
          return (
            <g transform={`translate(${timelinePanX},0)`}>
              {/* 1) 只缩放”图形”，不缩放文字 */}
              <g transform={`scale(${scale},1)`}>
                <line
                  x1={TIMELINE_LAYOUT.baseOffset}
                  y1={TL_Y}
                  x2={TIMELINE_LAYOUT.rightEdge * TIMELINE_LAYOUT.widthMultiplier}
                  y2={TL_Y}
                  stroke={'rgba(139,105,20,.1)'}
                  strokeWidth={14}
                  strokeLinecap={'round'}
                />

                {eraPositions.map(({ name, color, lightColor, x1, x2, width }) => {
                  return (
                    <g key={`shape-${name}`}>
                      <rect
                        x={x1}
                        y={TL_BAR_Y}
                        width={width}
                        height="16"
                        rx="4"
                        fill={lightColor}
                        opacity="0.7"
                      />
                      <line
                        x1={x1}
                        y1={TL_Y}
                        x2={x2}
                        y2={TL_Y}
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        opacity="0.8"
                      />
                    </g>
                  );
                })}
              </g>

              {/* 2) 单独渲染文字：位置跟着 scale 变化，但文字本身不被拉伸 */}
              {eraPositions.map(({ name, start, color, x1 }) => {
                const scaledX1 = x1 * scale;

                return (
                  <g key={`label-${name}`}>
                    <text
                      x={scaledX1 + 4}
                      y={TL_NAME_Y}
                      textAnchor="start"
                      fontSize="11"
                      fill={color}
                      fontFamily='"Noto Serif SC"'
                      fontWeight="600"
                      letterSpacing="1"
                    >
                      {name}
                    </text>

                    <text
                      x={scaledX1 + 4}
                      y={TL_YEAR_Y}
                      textAnchor="start"
                      fontSize="8"
                      fill="rgba(90,74,56,.55)"
                      fontFamily='"JetBrains Mono"'
                    >
                      {start < 0 ? `${Math.abs(start)}BC` : `${start}AD`}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })()}
      </svg>

      <div className="graph-view__controls">
        <button
          onClick={actions.zoomIn}
          className="graph-view__control-button"
        >
          +
        </button>

        <button
          onClick={actions.zoomOut}
          className="graph-view__control-button"
        >
          −
        </button>

        <button
          onClick={() => sel && actions.panToNode(sel, POS)}
          title="回到当前节点"
          className="graph-view__control-button graph-view__control-button--small"
        >
          ◎
        </button>

        <button
          onClick={actions.resetView}
          className="graph-view__control-button graph-view__control-button--small"
        >
          ⌂
        </button>
      </div>

      {/* Tooltip 显示 */}
      <NodeTooltip
        node={hoveredNode}
        CAT={CAT}
        position={tooltipPos}
        isVisible={hoveredNode !== null && !isDragging}
      />
    </>
  );
});
