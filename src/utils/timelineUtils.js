// ============================================================
// timelineUtils.js
// 时间轴区间布局、背景配置合并与当前时代判定
// ============================================================

import {
  ERA_BACKGROUNDS_BY_NAME,
  ERA_BACKGROUND_SETTINGS,
} from "../config/eraBackgrounds";

export const TIMELINE_LAYOUT = {
  baseOffset: 60,
  rightEdge: 1140,
  widthMultiplier: 10,
};

const MAJOR_TICK_STEPS = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
const MIN_MAJOR_TICK_SPACING_PX = 100;
const MAX_MAJOR_TICK_SPACING_PX = 96;
const MIN_MINOR_TICK_SPACING_PX = 12;
const LABEL_MIN_GAP_PX = 56;
const LABEL_EDGE_PADDING_PX = 28;

function getTimelineWidth(layout = TIMELINE_LAYOUT) {
  return (layout.rightEdge - layout.baseOffset) * layout.widthMultiplier;
}

function getPxPerWorldUnit(viewportWidthPx, viewBoxWidth) {
  if (!Number.isFinite(viewportWidthPx) || viewportWidthPx <= 0) return 1;
  if (!Number.isFinite(viewBoxWidth) || viewBoxWidth <= 0) return 1;
  return viewportWidthPx / viewBoxWidth;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function alignYearToStep(year, step) {
  return Math.ceil(year / step) * step;
}

function buildWeightedYearMapper(timelineConfig) {
  const ranges = [];
  let cumulativeYears = 0;

  timelineConfig.forEach((era, index) => {
    const spanYears = Math.max(0, era.end - era.start);
    const scale = era.scale ?? 1;
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

function getWeightedYear(year, ranges) {
  if (!ranges.length || !Number.isFinite(year)) return 0;

  const firstRange = ranges[0];
  if (year <= firstRange.start) return 0;

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

export function formatTimelineTickLabel(year) {
  if (!Number.isFinite(year)) return "";
  if (year < 0) return `${Math.abs(year)} BC`;
  return `${year}`;
}

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

export function mapYearToTimelineX(year, timelineConfig, layout = TIMELINE_LAYOUT) {
  if (!Array.isArray(timelineConfig) || timelineConfig.length === 0 || !Number.isFinite(year)) {
    return layout.baseOffset;
  }

  const { ranges, totalWeightedYears } = buildWeightedYearMapper(timelineConfig);
  const weightedYear = getWeightedYear(year, ranges);
  const timelineWidth = getTimelineWidth(layout);

  return layout.baseOffset + (weightedYear / totalWeightedYears) * timelineWidth;
}

export function computeEraTimelinePositions(timelineConfig, layout = TIMELINE_LAYOUT) {
  return buildWeightedTimelineRanges(timelineConfig, layout).map((range) => ({
    ...range,
    x1: Math.round(range.x1),
    x2: Math.round(range.x2),
    width: Math.round(range.x2) - Math.round(range.x1),
  }));
}

export function getActiveEraIndex(eraPositions, timelinePanX, scale, switchTriggerX) {
  if (!Array.isArray(eraPositions) || eraPositions.length === 0) return -1;

  const triggerX = Number.isFinite(switchTriggerX)
    ? switchTriggerX
    : ERA_BACKGROUND_SETTINGS.switchTriggerX;

  let activeIndex = 0;
  eraPositions.forEach((era, index) => {
    const eraLeftInView = era.x1 * scale + timelinePanX;
    if (eraLeftInView <= triggerX) {
      activeIndex = index;
    }
  });

  return activeIndex;
}

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

  ranges.forEach((range) => {
    const spanYears = Math.max(1, range.spanYears);
    const worldPxPerYear = range.width / spanYears;
    const screenPxPerYear = worldPxPerYear * scale * pxPerWorldUnit;
    const majorStep = pickMajorTickStep(screenPxPerYear);
    const minorStep = pickMinorTickStep(majorStep, screenPxPerYear);

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

    for (let year = alignYearToStep(range.start, majorStep); year < range.end; year += majorStep) {
      upsertTick(tickMap, {
        year,
        x: mapYearToTimelineX(year, timelineConfig, layout),
        isMajor: true,
        isBoundary: false,
      });
    }

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
