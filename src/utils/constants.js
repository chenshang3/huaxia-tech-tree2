// ============================================================
// constants.js
// 全局常量定义
// ============================================================

export const NODE_RADIUS = 28;

export const VIEW_BOX = "0 0 1200 640";

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 1.5;

export const ZOOM_FACTOR = 1.05; // 滚轮缩放倍数
export const SCALE_BUTTON_FACTOR_IN = 1.2;
export const SCALE_BUTTON_FACTOR_OUT = 0.8;

export const AUTO_PLAY_INTERVAL = 900;

export const modeColor = (mode) =>
  mode === "bfs" ? "74,144,217" : mode === "dfs" ? "46,204,113" : "200,160,69";

export const YEAR_RANGE = { min: -8000, max: 2026 };
