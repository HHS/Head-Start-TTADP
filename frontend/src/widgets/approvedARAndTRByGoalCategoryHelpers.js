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
export const TABLE_HEADINGS = ['Number of Activity Reports', 'Number of Training Report Sessions', 'Total'];
// Only the two non-total columns for the table widget — Total is rendered via showTotalColumn.
export const WIDGET_HEADINGS = ['Number of Activity Reports', 'Number of Training Report Sessions'];
export const FIRST_COLUMN = 'Goal category';

// Plotly renders horizontal bar charts bottom-to-top, so to show the
// "first" item (e.g. highest total) at the TOP it must be LAST in the array.
export function sortDataForChart(data, sortOption) {
  if (!data || !Array.isArray(data)) return [];
  const sorted = [...data];
  switch (sortOption) {
    case 'total-desc':
      // lowest total first → highest at top; ties broken Z→A so A appears at chart top
      return sorted.sort((a, b) => (a.total - b.total) || b.category.localeCompare(a.category));
    case 'total-asc':
      // highest total first → lowest at top; ties broken Z→A so A appears at chart top
      return sorted.sort((a, b) => (b.total - a.total) || b.category.localeCompare(a.category));
    case 'category-asc':
      return sorted.sort((a, b) => b.category.localeCompare(a.category)); // Z first → A at top
    case 'category-desc':
      return sorted.sort((a, b) => a.category.localeCompare(b.category)); // A first → Z at top
    default:
      return sorted.sort((a, b) => (a.total - b.total) || b.category.localeCompare(a.category));
  }
}

export function buildTabularData(data) {
  if (!data || !Array.isArray(data)) return [];
  return data.map((row, index) => ({
    heading: row.category,
    id: `${row.category.replace(/\s+/g, '-').toLowerCase()}-${index}`,
    data: [
      // sortKey values match what HorizontalTableWidget.Header generates via header.replaceAll(' ', '_')
      { value: row.activityReportCount, title: 'Number of Activity Reports', sortKey: 'Number_of_Activity_Reports' },
      { value: row.sessionReportCount, title: 'Number of Training Report Sessions', sortKey: 'Number_of_Training_Report_Sessions' },
      { value: row.total, title: 'Total', sortKey: 'Total', className: 'text-bold' },
    ],
  }));
}

// Sorts tabular data rows (built by buildTabularData) by sortOption.
// Uses the "natural" (non-Plotly-reversed) order: highest total first for total-desc, A-Z for category-asc, etc.
export function sortTabularData(tabularData, sortOption) {
  if (!tabularData || !Array.isArray(tabularData)) return [];
  const sorted = [...tabularData];
  const getTotal = (row) => {
    const cell = row.data.find((d) => d.sortKey === 'Total');
    return cell ? Number(cell.value) : 0;
  };
  switch (sortOption) {
    case 'total-desc':
      return sorted.sort((a, b) => (getTotal(b) - getTotal(a)) || a.heading.toLowerCase().localeCompare(b.heading.toLowerCase()));
    case 'total-asc':
      return sorted.sort((a, b) => (getTotal(a) - getTotal(b)) || a.heading.toLowerCase().localeCompare(b.heading.toLowerCase()));
    case 'category-asc':
      return sorted.sort((a, b) => a.heading.toLowerCase().localeCompare(b.heading.toLowerCase()));
    case 'category-desc':
      return sorted.sort((a, b) => b.heading.toLowerCase().localeCompare(a.heading.toLowerCase()));
    default:
      return sorted.sort((a, b) => (getTotal(b) - getTotal(a)) || a.heading.toLowerCase().localeCompare(b.heading.toLowerCase()));
  }
}

export function buildPlotlyTraces(sortedData, showAR, showTR) {
  // Always include both traces so Plotly reserves space for each in the group,
  // keeping bar widths consistent when one series is toggled off.
  return [
    {
      type: 'bar',
      orientation: 'h',
      name: 'Training Sessions',
      x: sortedData.map((d) => d.sessionReportCount),
      y: sortedData.map((d) => d.category),
      marker: { color: TR_COLOR },
      hovertemplate: '%{x}<extra></extra>',
      ...(showTR ? {} : { opacity: 0, hoverinfo: 'skip' }),
    },
    {
      type: 'bar',
      orientation: 'h',
      name: 'Activity Reports',
      x: sortedData.map((d) => d.activityReportCount),
      y: sortedData.map((d) => d.category),
      marker: { color: AR_COLOR },
      hovertemplate: '%{x}<extra></extra>',
      ...(showAR ? {} : { opacity: 0, hoverinfo: 'skip' }),
    },
  ];
}

export function computeChartDimensions(sortedData, showAR, showTR) {
  const height = sortedData.length * (2 * 24 + 20) + 40;
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
      ticklabelposition: 'outside top',
      ticklabelstandoff: 6,
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
