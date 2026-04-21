import {
  buildTimelineTicks,
  buildWeightedTimelineRanges,
  computeEraTimelinePositions,
  formatTimelineTickLabel,
  getActiveEraIndex,
  mapYearToTimelineX,
  mergeEraBackgrounds,
} from "./timelineUtils";

const timelineConfig = [
  { name: "甲", start: 0, end: 100, scale: 1, color: "#111", lightColor: "#eee" },
  { name: "乙", start: 100, end: 200, scale: 1, color: "#222", lightColor: "#ddd" },
  { name: "丙", start: 200, end: 300, scale: 2, color: "#333", lightColor: "#ccc" },
];

describe("timelineUtils", () => {
  test("builds continuous weighted timeline ranges", () => {
    const ranges = buildWeightedTimelineRanges(timelineConfig);

    expect(ranges).toHaveLength(3);
    expect(ranges[0].x1).toBe(60);
    expect(ranges[0].weightedStart).toBe(0);
    expect(ranges[0].x2).toBe(ranges[1].x1);
    expect(ranges[1].x2).toBe(ranges[2].x1);
    expect(ranges[2].weightedSpan).toBeGreaterThan(ranges[1].weightedSpan);
  });

  test("computes stable weighted era positions", () => {
    const positions = computeEraTimelinePositions(timelineConfig);

    expect(positions).toHaveLength(3);
    expect(positions[0].x1).toBe(60);
    expect(positions[0].x2).toBeGreaterThan(positions[0].x1);
    expect(positions[1].x1).toBe(positions[0].x2);
    expect(positions[2].width).toBeGreaterThan(positions[1].width);
  });

  test("maps years continuously and expands high-scale eras", () => {
    const ranges = buildWeightedTimelineRanges(timelineConfig);
    const boundaryX = mapYearToTimelineX(200, timelineConfig);
    const boundaryLeft = mapYearToTimelineX(199.5, timelineConfig);
    const boundaryRight = mapYearToTimelineX(200.5, timelineConfig);
    const firstEraSpacing = mapYearToTimelineX(50, timelineConfig) - mapYearToTimelineX(40, timelineConfig);
    const thirdEraSpacing = mapYearToTimelineX(250, timelineConfig) - mapYearToTimelineX(240, timelineConfig);

    expect(boundaryX).toBeCloseTo(ranges[2].x1, 6);
    expect(boundaryRight).toBeGreaterThan(boundaryLeft);
    expect(thirdEraSpacing).toBeGreaterThan(firstEraSpacing);
  });

  test("switches when an era left edge reaches the configured trigger", () => {
    const positions = computeEraTimelinePositions(timelineConfig);
    const secondEraPanX = 600 - positions[1].x1;

    expect(getActiveEraIndex(positions, secondEraPanX + 1, 1, 600)).toBe(0);
    expect(getActiveEraIndex(positions, secondEraPanX, 1, 600)).toBe(1);
  });

  test("merges frontend fallback backgrounds without mutating timeline data", () => {
    const merged = mergeEraBackgrounds(timelineConfig, {
      "甲": {
        image: "/custom-a.jpg",
        position: "left top",
      },
    });

    expect(merged[0].background.image).toBe("/custom-a.jpg");
    expect(merged[0].background.position).toBe("left top");
    expect(merged[1].background.image).toBeTruthy();
    expect(timelineConfig[0].background).toBeUndefined();
  });

  test("formats compact tick labels", () => {
    expect(formatTimelineTickLabel(-221)).toBe("221 BC");
    expect(formatTimelineTickLabel(0)).toBe("0");
    expect(formatTimelineTickLabel(618)).toBe("618");
  });

  test("builds denser ticks at higher zoom without duplicating boundaries", () => {
    const lowScaleTicks = buildTimelineTicks({
      timelineConfig,
      scale: 0.4,
      viewportWidthPx: 1200,
      viewBoxWidth: 1200,
      panX: 0,
    });
    const highScaleTicks = buildTimelineTicks({
      timelineConfig,
      scale: 1.2,
      viewportWidthPx: 1200,
      viewBoxWidth: 1200,
      panX: 0,
    });

    const lowMajorTicks = lowScaleTicks.filter((tick) => tick.isMajor);
    const highMajorTicks = highScaleTicks.filter((tick) => tick.isMajor);
    const highYears = highScaleTicks.map((tick) => tick.year);

    expect(highMajorTicks.length).toBeGreaterThan(lowMajorTicks.length);
    expect(new Set(highYears).size).toBe(highYears.length);
    expect(highScaleTicks.some((tick) => tick.label)).toBe(true);
  });

  test("hides crowded labels near viewport edges", () => {
    const ticks = buildTimelineTicks({
      timelineConfig,
      scale: 1.2,
      viewportWidthPx: 280,
      viewBoxWidth: 1200,
      panX: 0,
    });

    const labeledTicks = ticks.filter((tick) => tick.label);

    expect(labeledTicks.length).toBeGreaterThan(0);
    expect(labeledTicks.length).toBeLessThan(ticks.filter((tick) => tick.isMajor).length);
  });
});
