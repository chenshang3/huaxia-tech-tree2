// ============================================================
// constants.js
// 全局常量定义
// ============================================================

export const NODE_RADIUS = 28;

export const VIEW_BOX = "0 0 1200 640";

export const MIN_SCALE = 0.3;
export const MAX_SCALE = 4;

export const ZOOM_FACTOR = 1.05; // 滚轮缩放倍数
export const SCALE_BUTTON_FACTOR_IN = 1.2;
export const SCALE_BUTTON_FACTOR_OUT = 0.8;

export const AUTO_PLAY_INTERVAL = 900;

export const modeColor = (mode) =>
  mode === "bfs" ? "74,144,217" : mode === "dfs" ? "46,204,113" : "200,160,69";

export const timelineConfig = [
{ name: '新石器', start: -8000, end: -2700, color: '#7a5230', lightColor: '#f0e6dc' },
  { name: '黄帝时期', start: -2700, end: -2100, color: '#8b6914', lightColor: '#f5e6c8' },
  { name: '夏朝', start: -2100, end: -1300, color: '#a07820', lightColor: '#f8ecd4' },
  { name: '商朝', start: -1300, end: -1100, color: '#b89030', lightColor: '#faf0dc' },
  { name: '周朝', start: -1100, end: -770, color: '#c8a045', lightColor: '#fdf6e8' },
  { name: '春秋', start: -770, end: -475, color: '#d0a55c', lightColor: '#fef7e8' },
  { name: '战国', start: -475, end: -221, color: '#d8b070', lightColor: '#fef9eb' },
  { name: '秦朝', start: -221, end: -206, color: '#e09460', lightColor: '#fff0e4' },
  { name: '西汉', start: -206, end: 25, color: '#e8a080', lightColor: '#fff4ea' },
  { name: '东汉', start: 25, end: 220, color: '#eda490', lightColor: '#fff7eb' },
  { name: '三国', start: 220, end: 265, color: '#f0b0a0', lightColor: '#fff9ec' },
  { name: '两晋', start: 265, end: 420, color: '#f3bca8', lightColor: '#fffbee' },
  { name: '南北朝', start: 420, end: 581, color: '#f6c8b0', lightColor: '#fffdee' },
  { name: '隋朝', start: 581, end: 618, color: '#f9d4b8', lightColor: '#fffef0' },
  { name: '唐朝', start: 618, end: 907, color: '#fac4a0', lightColor: '#fff8f0' },
  { name: '五代十国', start: 907, end: 960, color: '#fbb690', lightColor: '#fff7f0' },
  { name: '宋朝', start: 960, end: 1271, color: '#fcb080', lightColor: '#fff6ef' },
  { name: '元朝', start: 1271, end: 1368, color: '#fd9c70', lightColor: '#fff5ee' },
  { name: '明朝', start: 1368, end: 1636, color: '#fd8058', lightColor: '#fff3ed' },
  { name: '清朝', start: 1636, end: 1840, color: '#fc6040', lightColor: '#fff1ec' },
  { name: '近代', start: 1840, end: 1912, color: '#fa4040', lightColor: '#fff0eb' },
  { name: '现代', start: 1912, end: 2026, color: '#4080f0', lightColor: '#e6f0ff' }
];

export const YEAR_RANGE = { min: -8000, max: 2026 };
