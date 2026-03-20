// ============================================================
// GraphView.jsx
// SVG 知识图谱渲染组件
// ============================================================

import { NODE_RADIUS, VIEW_BOX, timelineConfig, YEAR_RANGE } from "../utils/constants";
import { nState, eState, edgePath } from "../utils/graphUtils";

export function GraphView({
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
  viewportRef,     // 新增
  isDragging,      // 新增
}) {
  return (
    <>
      <svg
        ref={viewportRef}   // 新增：绑定画布 ref
        viewBox={VIEW_BOX}
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
            const rc =
              st === "current"
                ? "#e74c3c"
                : st === "visited"
                ? "#c8a045"
                : st === "queued"
                ? "#4a90d9"
                : st === "stacked"
                ? "#2ecc71"
                : cc;
            const rw = st !== "idle" ? 2.5 : 1.8;
            const isSel = sel === node.id;
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

        <g transform={`translate(${timelinePanX},0) scale(${scale},1)`}>
          <line
            x1="60"
            y1="44"
            x2="1140"
            y2="44"
            stroke="rgba(139,105,20,.1)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {timelineConfig.map(({ name, start, end, color, lightColor }) => {
            const { min, max } = YEAR_RANGE;
            const yearRange = max - min;
            const x1 = Math.round(60 + ((start - min) / yearRange) * (1140 - 60) * 5);
            const x2 = Math.round(60 + ((end - min) / yearRange) * (1140 - 60) * 5);
            const width = x2 - x1;

            return (
              <g key={name}>
                <rect
                  x={x1}
                  y="36"
                  width={width}
                  height="16"
                  rx="4"
                  fill={lightColor}
                  opacity="0.7"
                />
                <line
                  x1={x1}
                  y1="44"
                  x2={x2}
                  y2="44"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <text
                  x={x1 + 4}
                  y="28"
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
                  x={x1 + 4}
                  y="60"
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
}