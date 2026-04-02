// ============================================================
// GraphView.jsx
// SVG 知识图谱渲染组件
// ============================================================

import React from "react";
import { NODE_RADIUS, VIEW_BOX } from "../utils/constants";
import { nState, eState, edgePath } from "../utils/graphUtils";

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
  return (
    <>
      <svg
        ref={viewportRef}
        viewBox={VIEW_BOX}
        preserveAspectRatio="xMidYMin meet"
        style={{
          width: "100%",
          height: "100%",
          cursor: isDragging ? "grabbing" : "grab", // 改这里
        }}
        xmlns="http://www.w3.org/2000/svg"
        onWheel={handlers.onWheel}
        onMouseDown={handlers.onMouseDown}
        onMouseMove={handlers.onMouseMove}
        onMouseUp={handlers.onMouseUp}
        onMouseLeave={handlers.onMouseLeave} // 改这里
      >
        <defs>
          <pattern id="grid" width="45" height="45" patternUnits="userSpaceOnUse">
            <path d="M 45 0 L 0 0 0 45" fill="none" stroke="rgba(139,105,20,.06)" strokeWidth=".6" />
          </pattern>

          {[
            ["a0", "rgba(139,105,20,.35)"],
            ["aD", "rgba(139,105,20,.7)"],
            ["aA", "#e74c3c"],
          ].map(([id, fill]) => (
            <marker key={id} id={id} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3z" fill={fill} />
            </marker>
          ))}

          <linearGradient id="timelineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b6914" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#c8a045" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#b8860b" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        <rect width="1200" height="640" fill="url(#grid)" />

        <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
          {EDGES.map((e, i) => {
            const st = eState(e.from, e.to, step);
            const [clr, sw, mk] =
              st === "active"
                ? ["#e74c3c", 2.5, "aA"]
                : st === "done"
                  ? ["rgba(139,105,20,.55)", 1.8, "aD"]
                  : ["rgba(139,105,20,.18)", 1.2, "a0"];

            return (
              <path
                key={i}
                d={edgePath(e.from, e.to, POS, NODE_RADIUS)}
                fill="none"
                stroke={clr}
                strokeWidth={sw}
                markerEnd={`url(#${mk})`}
                style={{ transition: "stroke .35s,stroke-width .35s" }}
              />
            );
          })}

          {NODES.map((node) => {
            const p = POS[node.id];
            const st = nState(node.id, step, mode);
            const cc = CAT[node.cat]?.color ?? "#c8a045";
            const isSel = sel === node.id;
            const rc =
              st === "current"
                ? "#e74c3c"
                : st === "visited"
                  ? "#c8a045"
                  : st === "queued"
                    ? "#4a90d9"
                  : st === "stacked"
                    ? "#2ecc71"
                    : isSel && mode === "explore"
                      ? "#e74c3c"
                      : cc;
            const rw = st !== "idle" ? 2.5 : 1.8;
            const nm = node.name;
            const nl = nm.length;

            return (
              <g
                key={node.id}
                transform={`translate(${p.x},${p.y})`}
                onClick={() => onNode(node.id)}
                style={{ cursor: "pointer" }}
              >
                {st === "current" && (
                  <circle r={NODE_RADIUS + 14} fill="#e74c3c" opacity=".08">
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
                    opacity=".1"
                  />
                )}

                <circle r={NODE_RADIUS} fill="#fffef8" />
                <circle
                  r={NODE_RADIUS}
                  fill="none"
                  stroke={rc}
                  strokeWidth={rw}
                  style={{ transition: "stroke .3s" }}
                />

                {nl <= 3 && (
                  <text y="3" textAnchor="middle" fontSize="11" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700">
                    {nm}
                  </text>
                )}
                {nl === 4 && (
                  <text y="3" textAnchor="middle" fontSize="9.5" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700">
                    {nm}
                  </text>
                )}
                {nl > 4 && (
                  <>
                    <text y="-6" textAnchor="middle" fontSize="9" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700">
                      {nm.slice(0, 4)}
                    </text>
                    <text y="5" textAnchor="middle" fontSize="9" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700">
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

          
          // 计算每个时期的带scale的年份跨度，用于确定时间轴上的位置
          let cumulativeYears = 0;
          const eraPositions = timelineConfig.map(({ start, end, scale: eraScale }) => {
            const eraSpan = end - start;
            const weightedSpan = eraSpan * eraScale;
            const result = { startX: cumulativeYears, endX: cumulativeYears + weightedSpan };
            cumulativeYears += weightedSpan;
            return result;
          });
          const totalWeightedYears = cumulativeYears;
          const baseOffset = 60;
          const TIMELINE_SCALE = 10; // 时间轴延长倍数
          const timelineWidth = (1140 - 60) * TIMELINE_SCALE;

          return (
            <g transform={`translate(${timelinePanX},0)`}>
              {/* 1) 只缩放”图形”，不缩放文字 */}
              <g transform={`scale(${scale},1)`}>
                <line
                  x1={baseOffset}
                  y1={TL_Y}
                  x2={1140 * TIMELINE_SCALE}
                  y2={TL_Y}
                  stroke={'rgba(139,105,20,.1)'}
                  strokeWidth={14}
                  strokeLinecap={'round'}
                />

                {timelineConfig.map(({ name, start, end, color, lightColor }, idx) => {
                  const pos = eraPositions[idx];
                  const x1 = Math.round(baseOffset + (pos.startX / totalWeightedYears) * timelineWidth);
                  const x2 = Math.round(baseOffset + (pos.endX / totalWeightedYears) * timelineWidth);
                  const width = x2 - x1;

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
              {timelineConfig.map(({ name, start, color }, idx) => {
                const pos = eraPositions[idx];
                const x1 = Math.round(baseOffset + (pos.startX / totalWeightedYears) * timelineWidth);
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

      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <button
          onClick={actions.zoomIn}
          style={{
            width: 28,
            height: 28,
            background: "rgba(255,252,245,.92)",
            color: "#8b6914",
            border: "1px solid rgba(200,160,69,.3)",
            borderRadius: 4,
            fontSize: 16,
            lineHeight: 1,
            boxShadow: "0 2px 6px rgba(0,0,0,.06)",
          }}
        >
          +
        </button>

        <button
          onClick={actions.zoomOut}
          style={{
            width: 28,
            height: 28,
            background: "rgba(255,252,245,.92)",
            color: "#8b6914",
            border: "1px solid rgba(200,160,69,.3)",
            borderRadius: 4,
            fontSize: 16,
            lineHeight: 1,
            boxShadow: "0 2px 6px rgba(0,0,0,.06)",
          }}
        >
          −
        </button>

        <button
          onClick={() => sel && actions.panToNode(sel, POS)}
          title="回到当前节点"
          style={{
            width: 28,
            height: 28,
            background: "rgba(255,252,245,.92)",
            color: "#8b6914",
            border: "1px solid rgba(200,160,69,.3)",
            borderRadius: 4,
            fontSize: 11,
            boxShadow: "0 2px 6px rgba(0,0,0,.06)",
          }}
        >
          ◎
        </button>

        <button
          onClick={actions.resetView}
          style={{
            width: 28,
            height: 28,
            background: "rgba(255,252,245,.92)",
            color: "#8b6914",
            border: "1px solid rgba(200,160,69,.3)",
            borderRadius: 4,
            fontSize: 11,
            boxShadow: "0 2px 6px rgba(0,0,0,.06)",
          }}
        >
          ⌂
        </button>
      </div>
    </>
  );
});