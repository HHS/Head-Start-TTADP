import colors from '../colors';

const BASE_COLOR = colors.ttahubMediumBlue; // #336A90
const DARK_COLOR = colors.ttahubBlue; // #264A64
const INK = colors.textInk; // #1b1b1b

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

export const BASE_RGB = hexToRgb(BASE_COLOR);

// 6-step color scale from coolest (level 0) to hottest (level 5)
export const COLOR_SCALE = [
  { bg: '#FFFFFF', textColor: INK },
  { bg: `rgba(${BASE_RGB.join(',')}, 0.2)`, textColor: INK },
  { bg: `rgba(${BASE_RGB.join(',')}, 0.4)`, textColor: INK },
  { bg: `rgba(${BASE_RGB.join(',')}, 0.7)`, textColor: '#fff' },
  { bg: `rgba(${BASE_RGB.join(',')}, 1)`, textColor: '#fff' },
  { bg: DARK_COLOR, textColor: '#fff' },
];

// Return top 10 categories by total count (sum across months), descending
export function getTop10(data) {
  return [...data]
    .map((row) => ({
      ...row,
      total: row.total ?? (row.counts || []).reduce((sum, c) => sum + c, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

// Divide [1, max] into 5 equal buckets; returns strictly increasing
// upper-bound thresholds, collapsing duplicate buckets for small max values.
export function computeLegendRanges(max) {
  if (!max || max <= 0) return [0, 0, 0, 0, 0];
  const step = max / 5;
  return [1, 2, 3, 4, 5].reduce((ranges, i) => {
    const threshold = Math.ceil(step * i);
    if (ranges[ranges.length - 1] !== threshold) {
      ranges.push(threshold);
    }
    return ranges;
  }, []);
}

// Map a count value to a CSS background color using the 6-step color scale
export function getColorForValue(value, max) {
  if (!value || value === 0 || !max) return COLOR_SCALE[0].bg;
  const ratio = value / max;
  let level;
  if (ratio <= 0.2) level = 1;
  else if (ratio <= 0.4) level = 2;
  else if (ratio <= 0.6) level = 3;
  else if (ratio <= 0.8) level = 4;
  else level = 5;
  return COLOR_SCALE[level].bg;
}

// Build legend items {bg, textColor, label} aligned with getColorForValue's ratio buckets
export function buildLegendLabels(max) {
  if (!max || max <= 0) {
    return [{ bg: COLOR_SCALE[0].bg, textColor: COLOR_SCALE[0].textColor, label: '0' }];
  }

  const ratioThresholds = [0.2, 0.4, 0.6, 0.8];
  const items = [{ bg: COLOR_SCALE[0].bg, textColor: COLOR_SCALE[0].textColor, label: '0' }];
  let prevUpper = 0;

  ratioThresholds.forEach((ratio, index) => {
    const upper = Math.floor(ratio * max);
    if (upper > prevUpper) {
      const lower = prevUpper + 1;
      items.push({
        bg: COLOR_SCALE[index + 1].bg,
        textColor: COLOR_SCALE[index + 1].textColor,
        label: lower === upper ? `${lower}` : `${lower}\u2013${upper}`,
      });
      prevUpper = upper;
    }
  });

  const finalLower = prevUpper + 1;
  items.push({
    bg: COLOR_SCALE[5].bg,
    textColor: COLOR_SCALE[5].textColor,
    label: `${finalLower}+`,
  });

  return items;
}

// Text color based on color scale level
export function getTextColorForLevel(value, max) {
  if (!value || !max) return COLOR_SCALE[0].textColor;
  const ratio = value / max;
  let level;
  if (ratio <= 0.2) level = 1;
  else if (ratio <= 0.4) level = 2;
  else if (ratio <= 0.6) level = 3;
  else if (ratio <= 0.8) level = 4;
  else level = 5;
  return COLOR_SCALE[level].textColor;
}
