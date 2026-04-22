// ============================================================
// timelineUtils.js
// 时间轴区间布局、背景配置合并与当前时代判定
// ============================================================
// 职责:
// 1. 时间轴布局配置(位置、宽度)
// 2. 加权年份映射(不同时代有不同的scale)
// 3. 刻度线计算(主刻度/次刻度)
// 4. 当前时代判定(根据视图位置)
// 5. 时代背景配置合并
//
// 核心概念:
//
//   加权年份 (Weighted Year):
//     - 不同时代在时间轴上占的长度不同
//     - 通过 scale 配置调整: 长度 = (end - start) * scale
//     - 现代可能scale=1, 史前scale=0.1(压缩)
//
//   时间轴布局:
//     - baseOffset: 起始偏移(60)
//     - rightEdge: 结束边缘(1140)
//     - widthMultiplier: 宽度乘数(10)
//     - 总宽度 = (1140-60) * 10 = 10800
//
//   当前时代判定:
//     - 根据视图的左边缘位置判断
//     - 如果时代左边缘 <= triggerX,该时代激活
// ============================================================

import {
  ERA_BACKGROUNDS_BY_NAME,
  ERA_BACKGROUND_SETTINGS,
} from "../config/eraBackgrounds";

/**
 * 时间轴布局配置
 * 定义时间轴在SVG中的位置和尺寸
 */
export const TIMELINE_LAYOUT = {
  // 起始偏移(从左边缘60像素开始)
  baseOffset: 60,
  // 结束边缘(到1140像素)
  rightEdge: 1140,
  // 宽度乘数(10倍,放大显示)
  widthMultiplier: 10,
};

// ===================== 刻度常量 =====================

/**
 * 主刻度步长候选值
 * 根据屏幕密度自动选择合适的步长
 */
const MAJOR_TICK_STEPS = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];

/**
 * 主刻度最小间距(像素)
 * 步长 * 像素/单位 >= 100
 */
const MIN_MAJOR_TICK_SPACING_PX = 100;

/**
 * 主刻度最大间距(像素)
 * 步长 * 像素/单位 <= 96
 */
const MAX_MAJOR_TICK_SPACING_PX = 96;

/**
 * 次刻度最小间距(像素)
 */
const MIN_MINOR_TICK_SPACING_PX = 12;

/**
 * 标签最小间距(像素)
 */
const LABEL_MIN_GAP_PX = 56;

/**
 * 标签边缘留白(像素)
 */
const LABEL_EDGE_PADDING_PX = 28;

// ===================== 辅助函数 =====================

/**
 * 获取时间轴总宽度
 */
function getTimelineWidth(layout = TIMELINE_LAYOUT) {
  return (layout.rightEdge - layout.baseOffset) * layout.widthMultiplier;
}

/**
 * 获取每世界单位的像素数
 */
function getPxPerWorldUnit(viewportWidthPx, viewBoxWidth) {
  if (!Number.isFinite(viewportWidthPx) || viewportWidthPx <= 0) return 1;
  if (!Number.isFinite(viewBoxWidth) || viewBoxWidth <= 0) return 1;
  return viewportWidthPx / viewBoxWidth;
}

/**
 * 数值限制
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * 按步长对齐年份
 * 确保年份是步长的倍数
 */
function alignYearToStep(year, step) {
  return Math.ceil(year / step) * step;
}

// ===================== 加权年份映射 =====================

/**
 * 构建加权年份映射
 * 为每个时代计算:
 * - weightedStart: 累积起始位置
 * - weightedEnd: 累积结束位置
 * - weightedSpan: 加权跨度
 *
 * @param {Array} timelineConfig - 时代配置
 * @returns {Object} { ranges, totalWeightedYears }
 */
function buildWeightedYearMapper(timelineConfig) {
  const ranges = [];
  let cumulativeYears = 0;

  timelineConfig.forEach((era, index) => {
    // 时代跨度
    const spanYears = Math.max(0, era.end - era.start);
    // 缩放比例
    const scale = era.scale ?? 1;
    // 加权跨度
    const weightedSpan = spanYears * scale;

    ranges.push({
      ...era,
      index,
      scale,
      spanYears,
      weightedStart: cumulativeYears,
      weightedEnd: cumulativeYears + weightedSpan,
      weightedSpan,
    });

    cumulativeYears += weightedSpan;
  });

  return { ranges, totalWeightedYears: cumulativeYears || 1 };
}

/**
 * 年份转加权年份
 * @param {number} year - 实际年份
 * @param {Array} ranges - 加权区间
 * @returns {number} 加权年份
 */
function getWeightedYear(year, ranges) {
  if (!ranges.length || !Number.isFinite(year)) return 0;

  const firstRange = ranges[0];
  if (year <= firstRange.start) return 0;

  // 找到年份所在的区间
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index];
    const isLastRange = index === ranges.length - 1;

    if (year < range.end || (isLastRange && year <= range.end)) {
      const clampedYearOffset = clamp(year - range.start, 0, range.spanYears);
      return range.weightedStart + clampedYearOffset * range.scale;
    }
  }

  return ranges[ranges.length - 1].weightedEnd;
}

// ===================== 刻度计算 =====================

/**
 * 选择主刻度步长
 * 根据屏幕密度自动选择
 */
function pickMajorTickStep(screenPxPerYear) {
  if (!Number.isFinite(screenPxPerYear) || screenPxPerYear <= 0) {
    return MAJOR_TICK_STEPS[MAJOR_TICK_STEPS.length - 1];
  }

  const stepWithinTarget = MAJOR_TICK_STEPS.find((step) => {
    const spacing = step * screenPxPerYear;
    return spacing >= MIN_MAJOR_TICK_SPACING_PX && spacing <= MAX_MAJOR_TICK_SPACING_PX;
  });

  if (stepWithinTarget) return stepWithinTarget;

  const stepMeetingMin = MAJOR_TICK_STEPS.find(
    (step) => step * screenPxPerYear >= MIN_MAJOR_TICK_SPACING_PX
  );

  return stepMeetingMin || MAJOR_TICK_STEPS[MAJOR_TICK_STEPS.length - 1];
}

/**
 * 选择次刻度步长
 * 主刻度的1/5或1/4
 */
function pickMinorTickStep(majorStep, screenPxPerYear) {
  const fifthStep = majorStep / 5;
  if (Number.isInteger(fifthStep) && fifthStep * screenPxPerYear >= MIN_MINOR_TICK_SPACING_PX) {
    return fifthStep;
  }

  const quarterStep = majorStep / 4;
  if (Number.isInteger(quarterStep) && quarterStep * screenPxPerYear >= MIN_MINOR_TICK_SPACING_PX) {
    return quarterStep;
  }

  return null;
}

/**
 * 插入/更新刻度
 * 边界刻度优先
 */
function upsertTick(tickMap, nextTick) {
  const existingTick = tickMap.get(nextTick.year);

  if (!existingTick) {
    tickMap.set(nextTick.year, nextTick);
    return;
  }

  if (nextTick.isMajor && !existingTick.isMajor) {
    tickMap.set(nextTick.year, { ...existingTick, ...nextTick });
    return;
  }

  if (nextTick.isBoundary) {
    tickMap.set(nextTick.year, { ...existingTick, isBoundary: true, isMajor: true });
  }
}

// ===================== 导出函数 =====================

/**
 * 格式化时间轴刻度标签
 */
export function formatTimelineTickLabel(year) {
  if (!Number.isFinite(year)) return "";
  if (year < 0) return `${Math.abs(year)} BC`;
  return `${year}`;
}

/**
 * 构建加权时间轴区间
 * 每个时代在时间轴上的位置(x1, x2)
 */
export function buildWeightedTimelineRanges(timelineConfig, layout = TIMELINE_LAYOUT) {
  if (!Array.isArray(timelineConfig) || timelineConfig.length === 0) return [];

  const { ranges, totalWeightedYears } = buildWeightedYearMapper(timelineConfig);
  const timelineWidth = getTimelineWidth(layout);

  return ranges.map((range) => {
    const x1 = layout.baseOffset + (range.weightedStart / totalWeightedYears) * timelineWidth;
    const x2 = layout.baseOffset + (range.weightedEnd / totalWeightedYears) * timelineWidth;

    return {
      ...range,
      x1,
      x2,
      width: x2 - x1,
    };
  });
}

/**
 * 年份转时间轴X坐标
 */
export function mapYearToTimelineX(year, timelineConfig, layout = TIMELINE_LAYOUT) {
  if (!Array.isArray(timelineConfig) || timelineConfig.length === 0 || !Number.isFinite(year)) {
    return layout.baseOffset;
  }

  const { ranges, totalWeightedYears } = buildWeightedYearMapper(timelineConfig);
  const weightedYear = getWeightedYear(year, ranges);
  const timelineWidth = getTimelineWidth(layout);

  return layout.baseOffset + (weightedYear / totalWeightedYears) * timelineWidth;
}

/**
 * 计算时代位置(取整)
 */
export function computeEraTimelinePositions(timelineConfig, layout = TIMELINE_LAYOUT) {
  return buildWeightedTimelineRanges(timelineConfig, layout).map((range) => ({
    ...range,
    x1: Math.round(range.x1),
    x2: Math.round(range.x2),
    width: Math.round(range.x2) - Math.round(range.x1),
  }));
}

/**
 * 获取当前时代索引
 * 根据视图位置判断当前显示的是哪个时代
 */
export function getActiveEraIndex(eraPositions, timelinePanX, scale, switchTriggerX) {
  if (!Array.isArray(eraPositions) || eraPositions.length === 0) return -1;

  // 触发线X坐标
  const triggerX = Number.isFinite(switchTriggerX)
    ? switchTriggerX
    : ERA_BACKGROUND_SETTINGS.switchTriggerX;

  // 找到最右边且左边缘在触发线左边的时代
  let activeIndex = 0;
  eraPositions.forEach((era, index) => {
    const eraLeftInView = era.x1 * scale + timelinePanX;
    if (eraLeftInView <= triggerX) {
      activeIndex = index;
    }
  });

  return activeIndex;
}

/**
 * 构建时间轴刻度
 * @param {Object} params
 *   - timelineConfig: 时代配置
 *   - scale: 缩放比例
 *   - viewportWidthPx: 视口宽度
 *   - viewBoxWidth: SVG宽度
 *   - panX: 平移量
 */
export function buildTimelineTicks({
  timelineConfig,
  layout = TIMELINE_LAYOUT,
  scale = 1,
  viewportWidthPx = 0,
  viewBoxWidth = 1200,
  panX = 0,
}) {
  const ranges = buildWeightedTimelineRanges(timelineConfig, layout);
  if (!ranges.length) return [];

  const pxPerWorldUnit = getPxPerWorldUnit(viewportWidthPx, viewBoxWidth);
  const tickMap = new Map();

  // 为每个区间生成刻度
  ranges.forEach((range) => {
    const spanYears = Math.max(1, range.spanYears);
    const worldPxPerYear = range.width / spanYears;
    const screenPxPerYear = worldPxPerYear * scale * pxPerWorldUnit;
    const majorStep = pickMajorTickStep(screenPxPerYear);
    const minorStep = pickMinorTickStep(majorStep, screenPxPerYear);

    // 边界刻度
    upsertTick(tickMap, {
      year: range.start,
      x: mapYearToTimelineX(range.start, timelineConfig, layout),
      isMajor: true,
      isBoundary: true,
    });
    upsertTick(tickMap, {
      year: range.end,
      x: mapYearToTimelineX(range.end, timelineConfig, layout),
      isMajor: true,
      isBoundary: true,
    });

    // 主刻度
    for (let year = alignYearToStep(range.start, majorStep); year < range.end; year += majorStep) {
      upsertTick(tickMap, {
        year,
        x: mapYearToTimelineX(year, timelineConfig, layout),
        isMajor: true,
        isBoundary: false,
      });
    }

    // 次刻度
    if (!minorStep) return;

    for (let year = alignYearToStep(range.start, minorStep); year < range.end; year += minorStep) {
      if (year % majorStep === 0) continue;

      upsertTick(tickMap, {
        year,
        x: mapYearToTimelineX(year, timelineConfig, layout),
        isMajor: false,
        isBoundary: false,
      });
    }
  });

  let previousLabelScreenX = -Infinity;

  return Array.from(tickMap.values())
    .sort((left, right) => left.x - right.x)
    .map((tick) => {
      const viewportX = tick.x * scale + panX;
      const screenX = (tick.x * scale + panX) * pxPerWorldUnit;
      // 判断是否显示标签(主刻度、在视口内、间距足够)
      const canShowLabel =
        tick.isMajor &&
        screenX >= LABEL_EDGE_PADDING_PX &&
        screenX <= viewportWidthPx - LABEL_EDGE_PADDING_PX &&
        screenX - previousLabelScreenX >= LABEL_MIN_GAP_PX;

      if (canShowLabel) {
        previousLabelScreenX = screenX;
      }

      return {
        ...tick,
        viewportX,
        label: canShowLabel ? formatTimelineTickLabel(tick.year) : "",
      };
    });
}

/**
 * 合并时代背景配置
 * 合并配置的背景与默认背景
 */
export function mergeEraBackgrounds(timelineConfig, backgroundMap = ERA_BACKGROUNDS_BY_NAME) {
  if (!Array.isArray(timelineConfig)) return [];

  return timelineConfig.map((era) => {
    const configured = backgroundMap[era.name] || {};
    const background = era.background || configured;

    return {
      ...era,
      background: {
        image: background.image || ERA_BACKGROUND_SETTINGS.fallbackImage,
        position: background.position || ERA_BACKGROUND_SETTINGS.fallbackPosition,
        opacity: background.opacity,
        credit: background.credit || era.name,
        source: background.source,
      },
    };
  });
}
