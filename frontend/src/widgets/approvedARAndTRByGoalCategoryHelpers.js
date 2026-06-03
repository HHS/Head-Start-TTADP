import colors from '../colors';

export const AR_COLOR = colors.ttahubBlue;
export const TR_COLOR = colors.ttahubMediumBlue;
export const LEFT_MARGIN = 200;

export const SORT_OPTIONS = [
  { value: 'total-desc', label: 'Total (high to low)' },
  { value: 'total-asc', label: 'Total (low to high)' },
  { value: 'category-asc', label: 'Goal Category (A-Z)' },
  { value: 'category-desc', label: 'Goal Category (Z-A)' },
];

// All three columns for CSV export.
export const TABLE_HEADINGS = ['Activity Reports', 'Training Sessions', 'Total'];
// Only the two non-total columns for the table widget — Total is rendered via showTotalColumn.
export const WIDGET_HEADINGS = ['Activity Reports', 'Training Sessions'];
export const FIRST_COLUMN = 'Goal category';

// Plotly renders horizontal bar charts bottom-to-top, so to show the
// "first" item (e.g. highest total) at the TOP it must be LAST in the array.
export function sortDataForChart(data, sortOption) {
  if (!data || !Array.isArray(data)) return [];
  const sorted = [...data];
  switch (sortOption) {
    case 'total-desc':
      return sorted.sort((a, b) => a.total - b.total); // lowest first → highest at top
    case 'total-asc':
      return sorted.sort((a, b) => b.total - a.total); // highest first → lowest at top
    case 'category-asc':
      return sorted.sort((a, b) => b.category.localeCompare(a.category)); // Z first → A at top
    case 'category-desc':
      return sorted.sort((a, b) => a.category.localeCompare(b.category)); // A first → Z at top
    default:
      return sorted.sort((a, b) => a.total - b.total);
  }
}

export function buildTabularData(data) {
  if (!data || !Array.isArray(data)) return [];
  return data.map((row, index) => ({
    heading: row.category,
    id: `${row.category.replace(/\s+/g, '-').toLowerCase()}-${index}`,
    data: [
      // sortKey values match what HorizontalTableWidget.Header generates via header.replaceAll(' ', '_')
      { value: row.activityReportCount, title: 'Activity Reports', sortKey: 'Activity_Reports' },
      { value: row.sessionReportCount, title: 'Training Sessions', sortKey: 'Training_Sessions' },
      { value: row.total, title: 'Total', sortKey: 'Total' },
    ],
  }));
}

export function buildPlotlyTraces(sortedData, showAR, showTR) {
  const traces = [];
  if (showTR) {
    traces.push({
      type: 'bar',
      orientation: 'h',
      name: 'Training Sessions',
      x: sortedData.map((d) => d.sessionReportCount),
      y: sortedData.map((d) => d.category),
      marker: { color: TR_COLOR },
      hovertemplate: '%{x}<extra></extra>',
    });
  }
  if (showAR) {
    traces.push({
      type: 'bar',
      orientation: 'h',
      name: 'Activity Reports',
      x: sortedData.map((d) => d.activityReportCount),
      y: sortedData.map((d) => d.category),
      marker: { color: AR_COLOR },
      hovertemplate: '%{x}<extra></extra>',
    });
  }
  return traces;
}

export function computeChartDimensions(sortedData, showAR, showTR) {
  const seriesCount = (showAR ? 1 : 0) + (showTR ? 1 : 0);
  const height = sortedData.length * (seriesCount * 24 + 20) + 40;
  const maxCount = sortedData.reduce(
    (acc, d) =>
      Math.max(acc, showAR ? d.activityReportCount : 0, showTR ? d.sessionReportCount : 0),
    1,
  );
  const xRangeMax = maxCount + Math.ceil(maxCount * 0.1) + 1;
  return { height, xRangeMax };
}

export function buildPlotlyChartLayout(xRangeMax, width, height) {
  return {
    barmode: 'group',
    bargap: 0.5,
    bargroupgap: 0.2,
    height,
    width,
    hoverlabel: { bgcolor: '#000', bordercolor: '#000', font: { color: '#fff', size: 16 } },
    font: { color: colors.textInk },
    margin: { l: LEFT_MARGIN, r: 20, t: 10, b: 0 },
    xaxis: { range: [0, xRangeMax] },
    yaxis: {
      zeroline: false,
      ticklen: 4,
      tickwidth: 1,
      tickcolor: 'transparent',
      title: { text: 'Goal category', standoff: 20 },
    },
    showlegend: false,
  };
}

export function buildPlotlyBottomAxisLayout(xRangeMax, width) {
  return {
    width,
    height: 80,
    margin: { l: LEFT_MARGIN, t: 0, r: 20, b: 40 },
    yaxis: { tickmode: 'array', tickvals: [] },
    xaxis: {
      range: [0, xRangeMax],
      title: { text: 'Number of approved reports' },
    },
  };
}
