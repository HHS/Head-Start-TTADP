import '@testing-library/jest-dom';
import {
  sortDataForChart,
  buildTabularData,
  buildPlotlyTraces,
  computeChartDimensions,
  buildPlotlyChartLayout,
  buildPlotlyBottomAxisLayout,
} from '../approvedARAndTRByGoalCategoryHelpers';

const mockData = [
  { category: 'Mental Health', activityReportCount: 120, sessionReportCount: 30, total: 150 },
  { category: 'School Readiness', activityReportCount: 50, sessionReportCount: 10, total: 60 },
  {
    category: 'Professional Development',
    activityReportCount: 80,
    sessionReportCount: 15,
    total: 95,
  },
];

describe('approvedARAndTRByGoalCategoryHelpers', () => {
  describe('sortDataForChart', () => {
    it('returns empty array for null data', () => {
      expect(sortDataForChart(null, 'total-desc')).toEqual([]);
    });

    it('returns empty array for non-array data', () => {
      expect(sortDataForChart('not-an-array', 'total-desc')).toEqual([]);
    });

    it('sorts total-desc: lowest total first so highest appears at chart top', () => {
      const result = sortDataForChart(mockData, 'total-desc');
      expect(result[0].total).toBe(60);
      expect(result[result.length - 1].total).toBe(150);
    });

    it('sorts total-desc: breaks ties with Z-first so A appears at chart top', () => {
      const tied = [
        { category: 'Governance', activityReportCount: 1, sessionReportCount: 0, total: 1 },
        { category: 'Child Safety', activityReportCount: 1, sessionReportCount: 0, total: 1 },
        { category: 'Fiscal Management', activityReportCount: 1, sessionReportCount: 0, total: 1 },
        { category: 'Family Engagement', activityReportCount: 1, sessionReportCount: 0, total: 1 },
      ];
      const result = sortDataForChart(tied, 'total-desc');
      // Z (Governance) should be first (bottom of chart), A (Child Safety) should be last (top of chart)
      expect(result[0].category).toBe('Governance');
      expect(result[result.length - 1].category).toBe('Child Safety');
    });

    it('sorts total-asc: highest total first so lowest appears at chart top', () => {
      const result = sortDataForChart(mockData, 'total-asc');
      expect(result[0].total).toBe(150);
      expect(result[result.length - 1].total).toBe(60);
    });

    it('sorts total-asc: breaks ties with Z-first so A appears at chart top', () => {
      const tied = [
        { category: 'Governance', activityReportCount: 1, sessionReportCount: 0, total: 1 },
        { category: 'Child Safety', activityReportCount: 1, sessionReportCount: 0, total: 1 },
        { category: 'Fiscal Management', activityReportCount: 1, sessionReportCount: 0, total: 1 },
        { category: 'Family Engagement', activityReportCount: 1, sessionReportCount: 0, total: 1 },
      ];
      const result = sortDataForChart(tied, 'total-asc');
      expect(result[0].category).toBe('Governance');
      expect(result[result.length - 1].category).toBe('Child Safety');
    });

    it('sorts category-asc: Z first so A appears at chart top', () => {
      const result = sortDataForChart(mockData, 'category-asc');
      expect(result[result.length - 1].category).toBe('Mental Health');
    });

    it('sorts category-desc: A first so Z appears at chart top', () => {
      const result = sortDataForChart(mockData, 'category-desc');
      expect(result[result.length - 1].category).toBe('School Readiness');
    });

    it('defaults to total-desc sort for unknown sort option', () => {
      const result = sortDataForChart(mockData, 'unknown-option');
      expect(result[0].total).toBe(60);
      expect(result[result.length - 1].total).toBe(150);
    });
  });

  describe('buildTabularData', () => {
    it('returns empty array for null data', () => {
      expect(buildTabularData(null)).toEqual([]);
    });

    it('returns empty array for non-array data', () => {
      expect(buildTabularData('not-an-array')).toEqual([]);
    });

    it('maps data rows to tabular format with heading and data cells', () => {
      const result = buildTabularData(mockData);
      expect(result).toHaveLength(3);
      expect(result[0].heading).toBe('Mental Health');
      expect(result[0].data[0].value).toBe(120);
      expect(result[0].data[0].sortKey).toBe('Number_of_Activity_Reports');
      expect(result[0].data[1].value).toBe(30);
      expect(result[0].data[1].sortKey).toBe('Number_of_Training_Report_Sessions');
      expect(result[0].data[2].value).toBe(150);
      expect(result[0].data[2].sortKey).toBe('Total');
      expect(result[0].data[2].className).toBe('text-bold');
    });

    it('generates a stable id from category name and index', () => {
      const result = buildTabularData(mockData);
      expect(result[0].id).toBe('mental-health-0');
      expect(result[1].id).toBe('school-readiness-1');
    });
  });

  describe('buildPlotlyTraces', () => {
    it('includes both AR and TR traces when both are enabled', () => {
      const traces = buildPlotlyTraces(mockData, true, true);
      expect(traces).toHaveLength(2);
      expect(traces.some((t) => t.name === 'Training Sessions')).toBe(true);
      expect(traces.some((t) => t.name === 'Activity Reports')).toBe(true);
    });

    it('hides AR trace (opacity 0) when showAR is false', () => {
      const traces = buildPlotlyTraces(mockData, false, true);
      expect(traces).toHaveLength(2);
      const arTrace = traces.find((t) => t.name === 'Activity Reports');
      const trTrace = traces.find((t) => t.name === 'Training Sessions');
      expect(arTrace.opacity).toBe(0);
      expect(trTrace.opacity).toBeUndefined();
    });

    it('hides TR trace (opacity 0) when showTR is false', () => {
      const traces = buildPlotlyTraces(mockData, true, false);
      expect(traces).toHaveLength(2);
      const arTrace = traces.find((t) => t.name === 'Activity Reports');
      const trTrace = traces.find((t) => t.name === 'Training Sessions');
      expect(trTrace.opacity).toBe(0);
      expect(arTrace.opacity).toBeUndefined();
    });

    it('hides both traces (opacity 0) when both showAR and showTR are false', () => {
      const traces = buildPlotlyTraces(mockData, false, false);
      expect(traces).toHaveLength(2);
      expect(traces.every((t) => t.opacity === 0)).toBe(true);
    });

    it('TR trace x values are sessionReportCounts', () => {
      const traces = buildPlotlyTraces(mockData, false, true);
      const trTrace = traces.find((t) => t.name === 'Training Sessions');
      expect(trTrace.x).toEqual([30, 10, 15]);
    });

    it('AR trace x values are activityReportCounts', () => {
      const traces = buildPlotlyTraces(mockData, true, false);
      const arTrace = traces.find((t) => t.name === 'Activity Reports');
      expect(arTrace.x).toEqual([120, 50, 80]);
    });
  });

  describe('computeChartDimensions', () => {
    it('computes positive height and xRangeMax', () => {
      const { height, xRangeMax } = computeChartDimensions(mockData, true, true);
      expect(height).toBeGreaterThan(0);
      expect(xRangeMax).toBeGreaterThan(120);
    });

    it('uses only AR counts when showTR is false', () => {
      const { xRangeMax } = computeChartDimensions(mockData, true, false);
      // max AR count is 120; xRangeMax should be > 120
      expect(xRangeMax).toBeGreaterThan(120);
    });

    it('uses only TR counts when showAR is false', () => {
      const { xRangeMax } = computeChartDimensions(mockData, false, true);
      // max TR count is 30; xRangeMax should be > 30 but not related to 120
      expect(xRangeMax).toBeGreaterThan(30);
      expect(xRangeMax).toBeLessThan(50);
    });

    it('falls back to minimum xRangeMax of 2 when both series are empty', () => {
      const { xRangeMax } = computeChartDimensions(mockData, false, false);
      expect(xRangeMax).toBeGreaterThanOrEqual(2);
    });
  });

  describe('buildPlotlyChartLayout', () => {
    it('returns layout with correct width, height, and xaxis range', () => {
      const layout = buildPlotlyChartLayout(100, 800, 400);
      expect(layout.barmode).toBe('group');
      expect(layout.width).toBe(800);
      expect(layout.height).toBe(400);
      expect(layout.xaxis.range).toEqual([0, 100]);
    });

    it('includes required margin and yaxis config', () => {
      const layout = buildPlotlyChartLayout(50, 600, 300);
      expect(layout.margin.l).toBe(200);
      expect(layout.yaxis.zeroline).toBe(false);
    });
  });

  describe('buildPlotlyBottomAxisLayout', () => {
    it('returns layout with correct width and xaxis range', () => {
      const layout = buildPlotlyBottomAxisLayout(100, 800);
      expect(layout.width).toBe(800);
      expect(layout.height).toBe(80);
      expect(layout.xaxis.range).toEqual([0, 100]);
    });

    it('includes number-of-approved-reports axis title', () => {
      const layout = buildPlotlyBottomAxisLayout(50, 600);
      expect(layout.xaxis.title.text).toBe('Number of approved reports');
    });
  });
});
