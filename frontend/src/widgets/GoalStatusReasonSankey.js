import React, {
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import createPlotlyComponent from 'react-plotly.js/factory';
import colors from '../colors';

let plotComponentPromise;

// Lazy-loads Plotly and wraps it in a React component. Cached in module scope so
// subsequent calls reuse the same promise rather than re-importing the heavy bundle.
/* istanbul ignore next */
function getPlotComponent() {
  if (!plotComponentPromise) {
    plotComponentPromise = import('plotly.js/dist/plotly').then((plotlyModule) => {
      const plotlyLib = plotlyModule.default || plotlyModule;
      return createPlotlyComponent(plotlyLib);
    });
  }

  return plotComponentPromise;
}

const STATUS_NODE_IDS = [
  'status:Not Started',
  'status:In Progress',
  'status:Closed',
  'status:Suspended',
];

const STRAIGHT_GOALS_LINK_STATUS_IDS = new Set([
  'status:Not Started',
  'status:In Progress',
]);

const CENTER_ALIGNED_STATUS_LABEL_IDS = new Set([
  'status:Not Started',
  'status:In Progress',
]);

const REASON_NODE_PREFIXES = [
  'reason:Closed:',
  'reason:Suspended:',
];

// Extra normalized-Y gap added after specific status nodes on top of BASE_PAD_FRAC.
// In Progress gets extra breathing room before the curved Closed/Suspended links;
// Closed gets a small buffer before Suspended's label clearance zone.
const FIXED_STATUS_GAP_AFTER = {
  'status:In Progress': 0.025,
  'status:Closed': 0.02,
};

// Statuses that live at the bottom of the chart and need extra vertical clearance
// above them so their labels (rendered above the node) don't overlap the previous band.
const TRAILING_STATUS_IDS = ['status:Closed', 'status:Suspended'];
// 0.07 × 560px ≈ 39px — minimum gap to clear a two-line status label above Closed/Suspended.
const MIN_DYNAMIC_GAP_BEFORE_TRAILING_STATUS = 0.07;
// 0.14 × 560px ≈ 78px — cap so the gap doesn't grow unboundedly when In Progress is large.
const MAX_DYNAMIC_GAP_BEFORE_TRAILING_STATUS = 0.14;

const SANKEY_CHART_HEIGHT = 560; // px — fixed chart height; all normalized-Y math references this
const SANKEY_NODE_THICKNESS = 180; // px — node rect width at full screen width
const SANKEY_NODE_PAD = 20; // px — Plotly node.pad; vertical gap between adjacent nodes
const SANKEY_FONT_SIZE = 16; // pt — base font size passed to Plotly's layout.font
const SANKEY_LEFT_MARGIN = 16; // px — left margin; keeps the Goals node from touching the edge
// normalized Y center of the Goals node; 0.4 places it slightly above midpoint
const GOALS_NODE_Y = 0.4;
// Below this raw link value Plotly renders links as near-invisible slivers, so we inflate them.
const MIN_RENDER_LINK_VALUE = 16;
// Raw counts above this threshold are used as-is; only small counts are inflated.
const MAX_INFLATED_LINK_VALUE = 10;
// Small counts (1–MAX_INFLATED_LINK_VALUE) are multiplied by this before
// applying the progressive floor.
const LOW_VALUE_SCALE_MULTIPLIER = 3.5;
// Exponent < 1 makes the progressive minimum ramp up faster at the low end of the range,
// so even value=1 gets a meaningful minimum floor without over-inflating value=10.
const LOW_VALUE_CURVE_EXPONENT = 0.8;

// x distance between Goals column and Status column in normalized [0,1] space.
// Used to derive the maximum node thickness that prevents horizontal overlap.
// Constraint: goals_right_edge < status_left_edge
//   GOALS_X * plotAreaWidth + thickness < STATUS_X * plotAreaWidth
//   thickness < (STATUS_X - GOALS_X) * plotAreaWidth  →  0.36 * plotAreaWidth
const COLUMN_GAP_FRACTION = 0.36; // STATUS_X(0.46) - GOALS_X(0.10)
const THICKNESS_SAFETY = 0.88; // leave a 12% gap so nodes never butt up against each other

// Below this width the chart is in "narrow" mode: explicit dimensions, scaled
// values, responsive:false.  Above it the original autosize/responsive behavior
// is restored so full-screen always looks exactly like before.
// 1100px is derived from the worst-case geometry: with the widest right margin
// (560px) and the original thickness (180px), the chart needs ~1076px to avoid
// column overlap — so 1100 gives a small safety buffer.
const NARROW_THRESHOLD = 1100;

// Computes normalized Y-coordinate bounds { top, center, bottom } for every present
// status node, distributing the chart's vertical space proportionally by inflated
// rendered value and inserting calibrated gaps between nodes so labels always fit.
// inflatedValues maps status IDs to their inflated rendered values (matching
// what Plotly uses for node sizing). Passing these ensures gap calculations
// account for how tall each node actually renders, not just its raw count.
function computeStatusNodeYBounds(nodeById, inflatedValues = {}) {
  const relevantNodes = STATUS_NODE_IDS.filter((id) => nodeById[id]);
  const totalCount = relevantNodes.reduce((sum, id) => sum + (nodeById[id]?.count || 0), 0);

  // Raw counts (not inflated) drive dominance so headroom reflects true data weight.
  const dominantStatusPct = totalCount > 0
    ? Math.max(...relevantNodes.map((id) => (nodeById[id]?.count || 0) / totalCount))
    : 0;
  // When one status exceeds 40% of the total, add up to 4% extra top padding so
  // the thick link band doesn't press directly against the chart edge.
  // Formula: linear ramp of (dominantPct - 0.40) × 0.2, capped at 0.04.
  const dominantStatusHeadroom = dominantStatusPct > 0.4
    ? Math.min(0.04, (dominantStatusPct - 0.4) * 0.2)
    : 0;
  const TOP_BUFFER = 0.03 + dominantStatusHeadroom; // 0.03 base + headroom for dominant statuses
  const BOTTOM_BUFFER = 0.04; // normalized space reserved at the chart bottom
  // Derived from SANKEY_NODE_PAD (20px) / reference chart height (700px) so gap
  // tracks the actual Plotly node.pad when chart height is near 700px.
  const BASE_PAD_FRAC = Math.max(0.02, SANKEY_NODE_PAD / 700);

  // Use inflated values for proportional heights so our gap reservations match
  // the actual pixel sizes Plotly renders. Falls back to raw count when no
  // inflated value is available (e.g. tests that don't pass inflatedValues).
  const getVal = (id) => inflatedValues[id] ?? nodeById[id]?.count ?? 0;
  const totalValue = relevantNodes.reduce((sum, id) => sum + getVal(id), 0);

  const extraGapAfter = {
    'status:In Progress': FIXED_STATUS_GAP_AFTER['status:In Progress'],
    'status:Closed': FIXED_STATUS_GAP_AFTER['status:Closed'],
  };

  // Extra gap between the two horizontal-link statuses (Not Started → In Progress),
  // proportional to their combined visual weight so thick bands don't visually merge.
  // combinedPct × 0.05 produces up to ~5% extra gap; subtracting BASE_PAD_FRAC avoids
  // double-counting the base padding already added between every status pair.
  if (nodeById['status:Not Started'] && nodeById['status:In Progress']) {
    const combinedPct = totalValue > 0
      ? (getVal('status:Not Started') + getVal('status:In Progress')) / totalValue
      : 0;
    const nsIpExtraGap = Math.max(0, combinedPct * 0.05 - BASE_PAD_FRAC);
    if (nsIpExtraGap > 0) {
      extraGapAfter['status:Not Started'] = (extraGapAfter['status:Not Started'] || 0) + nsIpExtraGap;
    }
  }

  // Use inflated In Progress proportion so the gap before trailing statuses
  // reflects how tall In Progress actually renders, not just its raw count.
  const inProgressPct = totalValue > 0
    ? getVal('status:In Progress') / totalValue
    : 0;
  // Scale the gap by 0.08 of the In Progress proportion so the clearance grows when
  // In Progress is tall; clamp between MIN and MAX to bound the effect.
  const dynamicGapBeforeTrailingStatus = Math.min(
    MAX_DYNAMIC_GAP_BEFORE_TRAILING_STATUS,
    Math.max(
      MIN_DYNAMIC_GAP_BEFORE_TRAILING_STATUS,
      MIN_DYNAMIC_GAP_BEFORE_TRAILING_STATUS + (inProgressPct * 0.08),
    ),
  );

  // Keep clear space before trailing Closed/Suspended statuses so the
  // status labels rendered above those nodes always have room.
  const trailingStatuses = TRAILING_STATUS_IDS.filter((id) => relevantNodes.includes(id));
  if (trailingStatuses.length) {
    const firstTrailingIndex = relevantNodes.indexOf(trailingStatuses[0]);
    if (firstTrailingIndex > 0) {
      const prevStatusId = relevantNodes[firstTrailingIndex - 1];
      extraGapAfter[prevStatusId] = Math.max(
        extraGapAfter[prevStatusId] || 0,
        dynamicGapBeforeTrailingStatus,
      );
    }
  }

  // Dynamic Closed→Suspended gap: the Suspended label sits 28px above the
  // Suspended node, so the gap must be at least ~0.05 normalized (28px ÷ 560px chart).
  // closedSuspendedPct × 0.10 grows the gap proportionally when both are large,
  // preventing label collision when both nodes are visually thick.
  if (nodeById['status:Closed'] && nodeById['status:Suspended']) {
    const closedSuspendedPct = totalValue > 0
      ? (getVal('status:Closed') + getVal('status:Suspended')) / totalValue
      : 0;
    const closedSuspendedGap = Math.max(0.05, closedSuspendedPct * 0.10);
    extraGapAfter['status:Closed'] = Math.max(
      extraGapAfter['status:Closed'] || 0,
      closedSuspendedGap,
    );
  }

  // Sum all gaps between nodes (BASE_PAD_FRAC + any extra) then subtract from 1
  // to find how much normalized Y space is left for actual node bars.
  // Floor at 0.2 so the bars never collapse entirely on degenerate inputs.
  const totalGapFrac = relevantNodes
    .slice(0, -1)
    .reduce((sum, id) => sum + BASE_PAD_FRAC + (extraGapAfter[id] || 0), 0);
  const usable = Math.max(0.2, 1 - TOP_BUFFER - BOTTOM_BUFFER - totalGapFrac);

  let cumulative = TOP_BUFFER;
  const bounds = {};
  relevantNodes.forEach((id, index) => {
    const pct = totalValue > 0 ? (getVal(id) / totalValue) : (1 / relevantNodes.length);
    const height = pct * usable;
    bounds[id] = { top: cumulative, center: cumulative + height / 2, bottom: cumulative + height };
    const isLast = index === relevantNodes.length - 1;
    const gapAfter = isLast ? 0 : (BASE_PAD_FRAC + (extraGapAfter[id] || 0));
    cumulative += height + gapAfter;
  });
  return bounds;
}

// Computes normalized Y-center positions for reason nodes, grouped by parent status.
// Each group is ideally centered at its parent status node's Y; a forward pass
// pushes groups down when they collide, and a backward pass shifts everything up
// if the last group would overflow the bottom of the chart.
function computeReasonNodeY(reasonNodes, statusBounds) {
  if (!reasonNodes.length) return {};

  const byParent = {};
  reasonNodes.forEach((node) => {
    // Reason node IDs are "reason:Closed:SomeLabel" — split on ':' to extract the status name.
    const parentId = `status:${node.id.split(':')[1]}`;
    if (!byParent[parentId]) byParent[parentId] = [];
    byParent[parentId].push(node);
  });

  // Build groups in status order so layout order matches the status column.
  const groups = STATUS_NODE_IDS
    .filter((id) => byParent[id])
    .map((parentId) => ({ parentId, nodes: byParent[parentId] }));

  if (!groups.length) return {};

  // 0.06 × 560px ≈ 34px — enough vertical space for a two-line reason label.
  const MIN_NODE_HEIGHT = 0.06;
  const NODE_PAD = 0.02; // normalized gap between sibling reason nodes within the same parent
  const GROUP_PAD = 0.04; // extra gap between Closed reason group and Suspended reason group
  const EDGE = 0.02; // keep nodes away from the top/bottom chart edges

  const groupData = groups.map(({ parentId, nodes }) => {
    const bounds = statusBounds[parentId];
    const parentCenter = bounds?.center ?? 0.5;
    const parentBandHeight = bounds ? (bounds.bottom - bounds.top) : 0;
    const totalCount = nodes.reduce((sum, n) => sum + (n.count || 0), 0);

    // Each node height is at least MIN_NODE_HEIGHT, then proportional above that.
    const nodeHeights = nodes.map((node) => {
      const pct = totalCount > 0 ? node.count / totalCount : 1 / nodes.length;
      return Math.max(pct * parentBandHeight, MIN_NODE_HEIGHT);
    });

    const totalHeight = nodeHeights.reduce((sum, h) => sum + h, 0)
      + Math.max(0, nodes.length - 1) * NODE_PAD;

    return {
      nodes, parentCenter, nodeHeights, totalHeight,
    };
  });

  // Forward pass: center each group at parent Y, push down if it overlaps previous.
  const tops = [];
  let prevBottom = -Infinity;
  groupData.forEach((g) => {
    const idealTop = g.parentCenter - g.totalHeight / 2;
    const minTop = prevBottom === -Infinity ? idealTop : prevBottom + GROUP_PAD;
    const top = Math.max(idealTop, minTop);
    tops.push(top);
    prevBottom = top + g.totalHeight;
  });

  // Backward pass: if last group overflows the bottom edge, shift everything up.
  const lastBottom = tops[tops.length - 1] + groupData[groupData.length - 1].totalHeight;
  if (lastBottom > 1 - EDGE) {
    const shift = lastBottom - (1 - EDGE);
    for (let i = 0; i < tops.length; i += 1) {
      tops[i] -= shift;
    }
  }

  // Clamp first group at top edge after any upward shift.
  if (tops[0] < EDGE) {
    const shift = EDGE - tops[0];
    for (let i = 0; i < tops.length; i += 1) {
      tops[i] += shift;
    }
  }

  // Assign final Y centers to each node within its group.
  const positions = {};
  groupData.forEach((g, gi) => {
    let cumulative = tops[gi];
    g.nodes.forEach((node, ni) => {
      positions[node.id] = cumulative + g.nodeHeights[ni] / 2;
      cumulative += g.nodeHeights[ni] + NODE_PAD;
    });
  });

  return positions;
}

const nodeColorById = {
  goals: colors.ttahubGrayBlue,
  'status:Not Started': colors.ttahubOrangeMedium,
  'status:In Progress': colors.ttahubSteelBlue,
  'status:Closed': colors.ttahubSankeyGreen,
  'status:Suspended': colors.ttahubSankeyRed,
};

const statusBorderColorById = {
  'status:Not Started': '#E29F4C',
  'status:In Progress': '#336B90',
  'status:Closed': colors.ttahubSankeyGreenDark,
  'status:Suspended': colors.ttahubSankeyRedDark,
};

const patternIdByNodeId = {
  goals: 'ttahub-sankey-pattern-goals',
  'status:Not Started': 'ttahub-sankey-pattern-not-started',
  'status:In Progress': 'ttahub-sankey-pattern-in-progress',
  'status:Closed': 'ttahub-sankey-pattern-closed',
  'status:Suspended': 'ttahub-sankey-pattern-suspended',
};

// Formats a percentage string for display inside a node label.
// The Goals node always shows 100% (it represents all goals); other nodes use
// the pre-computed percentage value rounded to two decimal places.
const formatPercent = (id, percentage, count) => {
  if (id === 'goals') {
    return count > 0 ? '100%' : '0%';
  }

  return `${Number(percentage || 0).toFixed(2)}%`;
};

// Builds the HTML string used for Plotly's node annotation (Goals node only).
const formatNodeLabel = (node) => `<b>${node.count} (${formatPercent(node.id, node.percentage, node.count)})</b><br>${node.label}`;

// Returns an inflated rendered value for a Sankey link so small goal counts
// (1–MAX_INFLATED_LINK_VALUE) appear as visible bands rather than near-invisible slivers.
// Values above MAX_INFLATED_LINK_VALUE are returned unchanged.
function getInflatedLinkValue(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return numericValue;
  }

  if (numericValue >= 1 && numericValue <= MAX_INFLATED_LINK_VALUE) {
    // Linear scale: multiply the raw count by LOW_VALUE_SCALE_MULTIPLIER.
    const scaledValue = Number((numericValue * LOW_VALUE_SCALE_MULTIPLIER).toFixed(2));
    // The scaled value of MAX_INFLATED_LINK_VALUE — used as the upper end of the progressive floor.
    const maxScaledLowValue = MAX_INFLATED_LINK_VALUE * LOW_VALUE_SCALE_MULTIPLIER;
    // 0 when value=1, 1 when value=MAX_INFLATED_LINK_VALUE; subtracting 1 normalizes so
    // the smallest possible value maps to ratio 0.
    const interpolationRatio = (numericValue - 1) / Math.max(1, MAX_INFLATED_LINK_VALUE - 1);
    // Apply a concave curve (exponent < 1) so the floor ramps up faster at the low end,
    // giving value=1 a meaningful minimum without over-inflating value=10.
    const curvedRatio = interpolationRatio ** LOW_VALUE_CURVE_EXPONENT;
    // Interpolate from MIN_RENDER_LINK_VALUE to maxScaledLowValue using the curved ratio,
    // guaranteeing even a count of 1 renders above the minimum visible threshold.
    const progressiveMinimum = Number((
      MIN_RENDER_LINK_VALUE
      + curvedRatio * (maxScaledLowValue - MIN_RENDER_LINK_VALUE)
    ).toFixed(2));

    return Math.max(progressiveMinimum, scaledValue);
  }

  return numericValue;
}

// Returns the SVG pattern definitions for every node and link type.
// Each entry describes a tiling rectangle (width × height px) filled with the node's
// base color, optionally overlaid with a semi-transparent stripe path for texture.
// Tile sizes are chosen so stripes are dense enough to read but not overwhelming:
//   8×8px for most statuses, 10×10px for Closed to accommodate the wider diagonal period.
// Strip paths use SVG path syntax in the tile's local coordinate space:
//   Goals       — two horizontal lines at y=1 and y=5
//   In Progress — grid lines at y=0,4 and x=0,4
//   Closed      — 45° diagonals tiling across the 10×10 cell
//   Suspended   — vertical lines at x=1 and x=5
const createPatternConfig = () => ([
  {
    id: patternIdByNodeId.goals,
    width: 8,
    height: 8,
    baseColor: colors.ttahubGrayBlue,
    stripePath: 'M0 1 H8 M0 5 H8', // two horizontal stripes per tile
    stripeColor: 'rgba(255, 255, 255, 0.45)',
  },
  {
    id: patternIdByNodeId['status:Not Started'],
    width: 8,
    height: 8,
    baseColor: colors.ttahubOrangeMedium,
    // no stripe — solid fill only
  },
  {
    id: patternIdByNodeId['status:In Progress'],
    width: 8,
    height: 8,
    baseColor: colors.ttahubSteelBlue,
    stripePath: 'M0 0 H8 M0 4 H8 M0 0 V8 M4 0 V8', // grid: horizontal at 0,4 + vertical at 0,4
    stripeColor: 'rgba(255, 255, 255, 0.35)',
  },
  {
    id: patternIdByNodeId['status:Closed'],
    width: 10,
    height: 10,
    baseColor: colors.ttahubSankeyGreen,
    stripePath: 'M-2 2 L2 -2 M0 10 L10 0 M8 12 L12 8', // 45° diagonals tiling seamlessly
    stripeColor: 'rgba(255, 255, 255, 0.45)',
  },
  {
    id: patternIdByNodeId['status:Suspended'],
    width: 8,
    height: 8,
    baseColor: colors.ttahubSankeyRed,
    stripePath: 'M1 0 V8 M5 0 V8', // two vertical stripes per tile
    stripeColor: 'rgba(255, 255, 255, 0.5)',
  },
]);

// Registers each pattern from createPatternConfig() in the SVG's <defs> block,
// creating <defs> if it doesn't exist yet. Idempotent — skips any pattern already
// present by ID so repeated calls (one per Plotly render pass) are safe.
// patternUnits="userSpaceOnUse" tiles patterns relative to the current user
// coordinate system rather than the element's bounding box, keeping tile scale
// consistent regardless of how large or small an individual node is.
export function ensureSankeyPatterns(svg) {
  if (!svg) {
    return;
  }

  const namespace = 'http://www.w3.org/2000/svg';
  let defs = svg.querySelector('defs');

  if (!defs) {
    defs = document.createElementNS(namespace, 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  createPatternConfig().forEach((patternConfig) => {
    const existing = defs.querySelector(`#${patternConfig.id}`);
    if (existing) {
      return;
    }

    const pattern = document.createElementNS(namespace, 'pattern');
    pattern.setAttribute('id', patternConfig.id);
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('width', `${patternConfig.width}`);
    pattern.setAttribute('height', `${patternConfig.height}`);

    // Solid base fill occupies the full tile rectangle.
    const baseRect = document.createElementNS(namespace, 'rect');
    baseRect.setAttribute('x', '0');
    baseRect.setAttribute('y', '0');
    baseRect.setAttribute('width', `${patternConfig.width}`);
    baseRect.setAttribute('height', `${patternConfig.height}`);
    baseRect.setAttribute('fill', patternConfig.baseColor);
    pattern.appendChild(baseRect);

    if (patternConfig.stripePath) {
      // Stripe overlay uses stroke only (fill: none) so the base color shows through.
      const stripe = document.createElementNS(namespace, 'path');
      stripe.setAttribute('d', patternConfig.stripePath);
      stripe.setAttribute('stroke', patternConfig.stripeColor);
      stripe.setAttribute('stroke-width', '1');
      stripe.setAttribute('fill', 'none');
      pattern.appendChild(stripe);
    }

    defs.appendChild(pattern);
  });
}

// Returns the primary visible shape element inside a g.sankey-node group.
// Prefers .node-rect (Plotly's stable class) for reliability; falls back to the
// first rect or path that is not one of our custom ttahub-border-overlay elements.
export function getBaseNodeShape(group) {
  if (!group) {
    return null;
  }

  const preferred = group.querySelector('.node-rect');
  if (preferred) {
    return preferred;
  }

  return Array.from(group.querySelectorAll('rect, path')).find((el) => !el.classList.contains('ttahub-border-overlay')) || null;
}

// Paints a 12px dark-blue stripe on the left edge and a 12px medium-blue stripe on
// the right edge of the Goals node to visually frame it. Idempotent — updates
// existing border rects on subsequent render passes rather than duplicating them.
// 12px matches the border thickness used on status and reason nodes.
export function applyGoalsLeftBorder(svg) {
  if (!svg) {
    return;
  }

  const goalsNodeGroup = svg.querySelector('g.sankey-node');
  if (!goalsNodeGroup) {
    return;
  }

  const goalsRect = getBaseNodeShape(goalsNodeGroup);
  if (!goalsRect) {
    return;
  }

  const bbox = goalsRect.getBBox();
  const height = bbox.height || parseFloat(goalsRect.getAttribute('height') || '0');
  const width = bbox.width || parseFloat(goalsRect.getAttribute('width') || '0');
  if (!height || !width) {
    return;
  }

  const namespace = 'http://www.w3.org/2000/svg';

  const existingLeft = goalsNodeGroup.querySelector('#ttahub-goals-left-border');
  const leftBorder = existingLeft || document.createElementNS(namespace, 'rect');
  leftBorder.setAttribute('id', 'ttahub-goals-left-border');
  leftBorder.setAttribute('x', '0');
  leftBorder.setAttribute('y', '0');
  leftBorder.setAttribute('width', '12'); // 12px border width, matching status node borders
  leftBorder.setAttribute('height', `${height}`);
  leftBorder.setAttribute('class', 'ttahub-border-overlay');
  leftBorder.setAttribute('style', `fill: ${colors.ttahubSankeyDarkBlue}; fill-opacity: 1; stroke: none; pointer-events: none;`);
  if (!existingLeft) {
    goalsNodeGroup.appendChild(leftBorder);
  } else {
    existingLeft.setAttribute('height', `${height}`);
  }

  const existingRight = goalsNodeGroup.querySelector('#ttahub-goals-right-border');
  const rightBorder = existingRight || document.createElementNS(namespace, 'rect');
  rightBorder.setAttribute('id', 'ttahub-goals-right-border');
  rightBorder.setAttribute('x', `${width - 12}`); // positioned flush with the right edge
  rightBorder.setAttribute('y', '0');
  rightBorder.setAttribute('width', '12');
  rightBorder.setAttribute('height', `${height}`);
  rightBorder.setAttribute('class', 'ttahub-border-overlay');
  rightBorder.setAttribute('style', `fill: ${colors.ttahubSankeyMediumBlue}; fill-opacity: 1; stroke: none; pointer-events: none;`);
  if (!existingRight) {
    goalsNodeGroup.appendChild(rightBorder);
  } else {
    existingRight.setAttribute('x', `${width - 12}`);
    existingRight.setAttribute('height', `${height}`);
  }
}

// Paints a 12px right-edge stripe on each status node using the darker shade of
// the status color, providing the same visual framing as the Goals node borders.
// slice(1, 1+statusNodeCount) skips index 0 (Goals node) and stops before reason nodes.
export function applyStatusRightBorders(svg, chartData) {
  if (!svg || !chartData) {
    return;
  }

  const nodeGroups = Array.from(svg.querySelectorAll('g.sankey-node'));
  const namespace = 'http://www.w3.org/2000/svg';

  // Index 0 is Goals; indices 1…statusNodeCount are status nodes; beyond that are reason nodes.
  nodeGroups.slice(1, 1 + chartData.statusNodeCount).forEach((group, i) => {
    // Prefer the pre-computed dark accent color; fall back to the node's fill color.
    const color = chartData.statusBorderColors?.[i] ?? chartData.nodeColors[i + 1];
    if (!color) {
      return;
    }

    const nodeRect = getBaseNodeShape(group);
    if (!nodeRect) {
      return;
    }

    const bbox = nodeRect.getBBox();
    const height = bbox.height || parseFloat(nodeRect.getAttribute('height') || '0');
    const width = bbox.width || parseFloat(nodeRect.getAttribute('width') || '0');
    if (!height || !width) {
      return;
    }

    const borderId = `ttahub-status-right-border-${i + 1}`;
    const existing = group.querySelector(`#${borderId}`);
    const border = existing || document.createElementNS(namespace, 'rect');
    border.setAttribute('id', borderId);
    border.setAttribute('class', 'ttahub-border-overlay');
    border.setAttribute('x', `${width - 12}`);
    border.setAttribute('y', '0');
    border.setAttribute('width', '12');
    border.setAttribute('height', `${height}`);
    border.setAttribute('style', `fill: ${color}; fill-opacity: 1; stroke: none; pointer-events: none;`);

    if (!existing) {
      group.appendChild(border);
    } else {
      existing.setAttribute('x', `${width - 12}`);
      existing.setAttribute('height', `${height}`);
    }
  });
}

// Paints a 12px right-edge terminal stripe on each reason node using the parent
// status's dark accent color (green-dark for Closed reasons, red-dark for Suspended).
// reasonStartIndex = 1 + statusNodeCount skips the Goals node and all status nodes.
export function applyReasonNodeBorders(svg, chartData) {
  if (!svg || !chartData) {
    return;
  }

  const nodeGroups = Array.from(svg.querySelectorAll('g.sankey-node'));
  const namespace = 'http://www.w3.org/2000/svg';
  // Reason nodes start after Goals (index 0) and all status nodes.
  const reasonStartIndex = 1 + chartData.statusNodeCount;

  nodeGroups.slice(reasonStartIndex).forEach((group, i) => {
    const borderColor = chartData.reasonNodeBorderColors[i];
    if (!borderColor) {
      return;
    }

    const nodeRect = getBaseNodeShape(group);
    if (!nodeRect) {
      return;
    }

    const bbox = nodeRect.getBBox();
    const height = bbox.height || parseFloat(nodeRect.getAttribute('height') || '0');
    const width = bbox.width || parseFloat(nodeRect.getAttribute('width') || '0');
    if (!height || !width) {
      return;
    }

    const rightBorderId = `ttahub-reason-right-border-${i}`;
    const existingRight = group.querySelector(`#${rightBorderId}`);
    const rightBorder = existingRight || document.createElementNS(namespace, 'rect');
    rightBorder.setAttribute('id', rightBorderId);
    rightBorder.setAttribute('class', 'ttahub-border-overlay');
    rightBorder.setAttribute('x', `${width - 12}`);
    rightBorder.setAttribute('y', '0');
    rightBorder.setAttribute('width', '12');
    rightBorder.setAttribute('height', `${height}`);
    rightBorder.setAttribute('style', `fill: ${borderColor}; fill-opacity: 1; stroke: none; pointer-events: none;`);
    if (!existingRight) {
      group.appendChild(rightBorder);
    } else {
      existingRight.setAttribute('x', `${width - 12}`);
      existingRight.setAttribute('height', `${height}`);
    }
  });
}

// Sets a pattern fill on an SVG element by writing it to both the fill attribute
// and the style string. Both must be set because Plotly's inline styles can override
// the standalone attribute; stroke is cleared to remove Plotly's default 1px border.
// Early-returns if the element is already correctly filled to avoid redundant DOM writes.
export function applyPatternFill(element, patternId) {
  if (!element || !patternId) {
    return;
  }

  const fill = `url(#${patternId})`;
  const existingStyle = element.getAttribute('style') || '';
  if (
    element.getAttribute('fill') === fill
    && existingStyle.includes(`fill: ${fill}`)
    && existingStyle.includes('stroke: none')
  ) {
    return;
  }

  element.setAttribute('fill', fill);
  // Strip any existing fill/stroke declarations from the style string before
  // appending ours, so we never accumulate duplicate properties.
  const cleanedStyle = existingStyle
    .replace(/fill:\s*[^;]+;?/gi, '')
    .replace(/stroke:\s*[^;]+;?/gi, '')
    .trim();
  const mergedStyle = `${cleanedStyle}${cleanedStyle ? ';' : ''}fill: ${fill}; stroke: none;`;
  element.setAttribute('style', mergedStyle);
}

// Creates a two-line SVG <text> element with a bold count/percent line (yLine1)
// and a plain label line (yLine2), positioned at the given pixel coordinates.
// font-size="14" stays legible at narrow widths while fitting within status bar heights.
export function makeLabelText(namespace, nodeData, x, yLine1, yLine2) {
  const text = document.createElementNS(namespace, 'text');
  text.setAttribute('class', 'ttahub-status-label');
  text.setAttribute('pointer-events', 'none');

  const line1 = document.createElementNS(namespace, 'tspan');
  line1.setAttribute('x', `${x}`);
  line1.setAttribute('y', `${yLine1}`);
  line1.setAttribute('font-family', 'Source Sans Pro, Arial, sans-serif');
  line1.setAttribute('font-size', '14');
  line1.setAttribute('font-weight', 'bold');
  line1.setAttribute('fill', colors.baseDarkest);
  line1.textContent = `${nodeData.count} (${formatPercent(nodeData.id, nodeData.percentage, nodeData.count)})`;

  const line2 = document.createElementNS(namespace, 'tspan');
  line2.setAttribute('x', `${x}`);
  line2.setAttribute('y', `${yLine2}`);
  line2.setAttribute('font-family', 'Source Sans Pro, Arial, sans-serif');
  line2.setAttribute('font-size', '14');
  line2.setAttribute('fill', colors.baseDarkest);
  line2.textContent = nodeData.label;

  text.appendChild(line1);
  text.appendChild(line2);
  return text;
}

// Nudges every tspan's y-coordinate in a label element by deltaY pixels.
// Used by the collision-avoidance loop in applyStatusLabels to push overlapping
// labels apart one pixel at a time.
export function shiftLabelY(labelElement, deltaY) {
  if (!labelElement || !deltaY) {
    return;
  }

  const tspans = Array.from(labelElement.querySelectorAll('tspan'));
  tspans.forEach((tspan) => {
    const currentY = parseFloat(tspan.getAttribute('y') || '0');
    tspan.setAttribute('y', `${currentY + deltaY}`);
  });
}

// Renders the Goals node's count and label as white centered text inside the node rect.
// The label is removed and re-created on every call because Plotly can re-render
// the node group, which would leave stale text elements behind.
export function applyGoalsLabel(svg, chartData) {
  if (!svg || !chartData?.goalsNodeData) {
    return;
  }

  const goalsNodeGroup = svg.querySelector('g.sankey-node');
  if (!goalsNodeGroup) {
    return;
  }

  const goalsRect = getBaseNodeShape(goalsNodeGroup);
  if (!goalsRect) {
    return;
  }

  const bbox = goalsRect.getBBox();
  if (!bbox.width || !bbox.height) {
    return;
  }

  const namespace = 'http://www.w3.org/2000/svg';
  const existing = goalsNodeGroup.querySelector('.ttahub-goals-label');
  if (existing) {
    existing.remove();
  }

  const centerX = bbox.x + (bbox.width / 2);
  const centerY = bbox.y + (bbox.height / 2);
  // 16px gap between lines: 14px font-size + 2px leading keeps lines comfortably separated.
  const lineGap = 16;

  const text = document.createElementNS(namespace, 'text');
  text.setAttribute('class', 'ttahub-goals-label');
  text.setAttribute('pointer-events', 'none');
  text.setAttribute('text-anchor', 'middle');

  const line1 = document.createElementNS(namespace, 'tspan');
  line1.setAttribute('x', `${centerX}`);
  line1.setAttribute('y', `${centerY - (lineGap / 2)}`);
  line1.setAttribute('font-family', 'Source Sans Pro, Arial, sans-serif');
  line1.setAttribute('font-size', '14');
  line1.setAttribute('font-weight', 'bold');
  line1.setAttribute('fill', 'white');
  line1.textContent = `${chartData.goalsNodeData.count} (${formatPercent('goals', chartData.goalsNodeData.percentage, chartData.goalsNodeData.count)})`;

  const line2 = document.createElementNS(namespace, 'tspan');
  line2.setAttribute('x', `${centerX}`);
  line2.setAttribute('y', `${centerY + (lineGap / 2)}`);
  line2.setAttribute('font-family', 'Source Sans Pro, Arial, sans-serif');
  line2.setAttribute('font-size', '14');
  line2.setAttribute('fill', 'white');
  line2.textContent = chartData.goalsNodeData.label;

  text.appendChild(line1);
  text.appendChild(line2);
  goalsNodeGroup.appendChild(text);
}

// Positions count/label text to the right of every non-goals node.
// Statuses that have reason sub-nodes get their label placed above or below the bar
// (to avoid overlapping the reason column). Other statuses get their label centered
// or above their bar. A pixel-space collision-avoidance loop prevents labels from
// overlapping when adjacent nodes are close together.
export function applyStatusLabels(svg, chartData) {
  if (!svg || !chartData) {
    return;
  }

  const namespace = 'http://www.w3.org/2000/svg';
  const nodeGroups = Array.from(svg.querySelectorAll('g.sankey-node'));
  // 16px gap between the two label lines (14px font-size + 2px leading).
  const STATUS_REASON_LABEL_LINE_GAP = 16;
  // 12px clearance between the node edge and the nearest label line.
  const STATUS_REASON_LABEL_CLEARANCE = 12;
  // 6px minimum vertical breathing room between successive labels in viewport space.
  const STATUS_REASON_LABEL_MIN_GAP = 6;
  // If a label's top is within 5px of the viewport top it is moved below the bar instead.
  const STATUS_REASON_LABEL_TOP_PADDING = 5;
  let previousReasonStatusLabelBottomPx = null;

  nodeGroups.slice(1).forEach((group, i) => {
    const nodeData = chartData.allNonGoalsNodes[i];
    if (!nodeData) {
      return;
    }

    // Always clear any stale label on this group.
    const existing = group.querySelector('.ttahub-status-label');
    if (existing) {
      existing.remove();
    }

    // Default: label to the right, vertically centred on the bar.
    const nodeRect = getBaseNodeShape(group);
    if (!nodeRect) {
      return;
    }
    const bbox = nodeRect.getBBox();
    if (!bbox.width || !bbox.height) {
      return;
    }
    const GAP = 10;
    const hasReasons = chartData.statusIdsWithReasons?.has(nodeData.id);
    if (hasReasons) {
      const labelX = bbox.x + bbox.width + GAP;
      const aboveLabel = makeLabelText(
        namespace, nodeData,
        labelX,
        bbox.y - STATUS_REASON_LABEL_CLEARANCE - STATUS_REASON_LABEL_LINE_GAP,
        bbox.y - STATUS_REASON_LABEL_CLEARANCE,
      );
      group.appendChild(aboveLabel);

      const aboveRect = aboveLabel.getBoundingClientRect();
      const overlapsPreviousLabel = previousReasonStatusLabelBottomPx !== null
        && aboveRect.top < previousReasonStatusLabelBottomPx + STATUS_REASON_LABEL_MIN_GAP;
      const placeBelow = aboveRect.top < STATUS_REASON_LABEL_TOP_PADDING || overlapsPreviousLabel;

      let label = aboveLabel;
      if (placeBelow) {
        aboveLabel.remove();
        label = makeLabelText(
          namespace, nodeData,
          labelX,
          bbox.y + bbox.height + STATUS_REASON_LABEL_CLEARANCE,
          bbox.y + bbox.height + STATUS_REASON_LABEL_CLEARANCE + STATUS_REASON_LABEL_LINE_GAP,
        );
        group.appendChild(label);
      }

      if (previousReasonStatusLabelBottomPx !== null) {
        // Compare in viewport (getBoundingClientRect) space because node groups have
        // CSS transform="translate()" which makes SVG coordinate comparisons unreliable.
        let rect = label.getBoundingClientRect();
        let guard = 0;
        // Nudge the label down 1px at a time until it clears the previous label.
        // guard < 60 caps the loop at 60 iterations (60px max shift) to prevent
        // an infinite loop if the labels can never be separated.
        while (
          rect.top < previousReasonStatusLabelBottomPx + STATUS_REASON_LABEL_MIN_GAP
          && guard < 60
        ) {
          shiftLabelY(label, 1);
          rect = label.getBoundingClientRect();
          guard += 1;
        }
      }

      previousReasonStatusLabelBottomPx = label.getBoundingClientRect().bottom;
      return;
    }
    if (CENTER_ALIGNED_STATUS_LABEL_IDS.has(nodeData.id)) {
      // Keep primary status labels centered vertically on their node.
      const LINE_GAP = 16;
      const centerY = bbox.y + (bbox.height / 2);
      group.appendChild(makeLabelText(
        namespace, nodeData,
        bbox.x + bbox.width + GAP,
        centerY - (LINE_GAP / 2),
        centerY + (LINE_GAP / 2),
      ));
      return;
    }

    const isReasonNode = REASON_NODE_PREFIXES.some((prefix) => nodeData.id.startsWith(prefix));
    if (isReasonNode) {
      // Keep reason labels centered on their target bars so they align with
      // the visual endpoint of status→reason links.
      const LINE_GAP = 16;
      const centerY = bbox.y + (bbox.height / 2);
      group.appendChild(makeLabelText(
        namespace, nodeData,
        bbox.x + bbox.width + GAP,
        centerY - (LINE_GAP / 2),
        centerY + (LINE_GAP / 2),
      ));
      return;
    }

    // For statuses without reason nodes, place the label above the node top edge.
    // labelBaseY is the baseline of the lower label line; the upper line sits 16px above.
    const labelBaseY = bbox.y - GAP;
    group.appendChild(makeLabelText(
      namespace, nodeData,
      bbox.x + bbox.width + GAP,
      labelBaseY - 16, // upper line: 16px above the lower line
      labelBaseY,
    ));
  });
}

// Extracts key source/target y-coordinates from a Plotly Sankey link path string
// so we can reshape the path without losing the layout geometry.
// Supports two formats:
//   16 numbers — Plotly's curved S-path: M sx sy1  C cx1 sy1 cx2 ty1 tx ty1
//                                         L tx ty2  C cx2 ty2 cx1 sy2 sx sy2
//   8 numbers  — our straight rectangle:  M sx ty1  L tx ty1  L tx ty2  L sx ty2
// Returns null for any path that doesn't match either format (links we don't touch).
export function parsePathPoints(d) {
  const nums = d.replace(/[MCLZz]/g, ' ').trim().split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  if (nums.length === 16) {
    // Plotly/gentle-curve format: M(0,1) C(2,3,4,5,6,7) L(8,9) C(10,11,12,13,14,15)
    return {
      sx: nums[0], // source node right-edge x
      sy1: nums[1], // source top y
      cx1: nums[2], // first cubic control point x
      cx2: nums[4], // second cubic control point x
      tx: nums[6], // target node left-edge x
      ty1: nums[7], // target top y
      ty2: nums[9], // target bottom y
      sy2: nums[15], // source bottom y
    };
  }
  if (nums.length === 8) {
    // Straight rectangle format: M(0,1) L(2,3) L(4,5) L(6,7)
    return {
      sx: nums[0], sy1: nums[1], tx: nums[2], ty1: nums[3], ty2: nums[5], sy2: nums[7],
    };
  }
  return null;
}

// Replaces Plotly's default Sankey link paths with custom shapes that:
//   1. Keep Not Started and In Progress as flat horizontal rectangles (no arc).
//   2. Shift Closed/Suspended curves down so they depart from below the horizontal bands.
//   3. Extend the Goals node body rect to cover the new curved-link departure area.
//   4. Extend all paths OVERLAP px into source/target nodes to hide anti-aliasing seams.
export function applyCustomLinkPaths(svg, chartData) {
  if (!svg || !chartData) return;

  const linkShapes = Array.from(
    svg.querySelectorAll('.sankey-link, .sankey-links path, path.sankey-link'),
  );

  // Parse all paths, filtering out any that don't match the expected formats.
  const parsedLinks = linkShapes
    .map((shape, index) => {
      const currentD = shape.getAttribute('d') || '';
      const originalD = shape.getAttribute('data-ttahub-original-d') || '';
      const customD = shape.getAttribute('data-ttahub-custom-d') || '';

      let baseD = currentD;

      // If the current path is our previously customized path, restore the
      // original before recomputing so transforms do not compound.
      if (customD && originalD && currentD === customD) {
        baseD = originalD;
        shape.setAttribute('d', originalD);
      } else if (!originalD || (customD && currentD !== customD)) {
        // Plotly emitted a fresh path (new render/update). Treat it as the new baseline.
        baseD = currentD;
        shape.setAttribute('data-ttahub-original-d', currentD);
        shape.removeAttribute('data-ttahub-custom-d');
      }

      return {
        shape,
        index,
        pts: parsePathPoints(baseD),
      };
    })
    .filter(({ pts }) => pts !== null);

  if (!parsedLinks.length) return;

  const linkTargets = chartData.linkTargets || [];
  const linkSources = chartData.linkSources || [];

  // Primary mapping: use chartData link ordering for deterministic status-link matching.
  let goalsToStatusLinks = parsedLinks.filter(({ index }) => (
    linkSources[index] === 'goals' && STATUS_NODE_IDS.includes(linkTargets[index])
  ));

  // Fallback for unexpected ordering mismatches: infer by source X geometry.
  if (!goalsToStatusLinks.length) {
    const goalsNodeGroup = svg.querySelector('g.sankey-node');
    const goalsNodeRect = goalsNodeGroup ? getBaseNodeShape(goalsNodeGroup) : null;
    if (goalsNodeRect) {
      const goalsRightEdge = goalsNodeRect.getBBox().x + goalsNodeRect.getBBox().width;
      // Allow a small tolerance for sub-pixel rendering differences.
      goalsToStatusLinks = parsedLinks.filter(({ pts }) => Math.abs(pts.sx - goalsRightEdge) < 2);
    } else {
      // Last resort: midpoint heuristic if goals node can't be found in the DOM.
      const sxValues = parsedLinks.map(({ pts }) => pts.sx);
      const sxMid = (Math.min(...sxValues) + Math.max(...sxValues)) / 2;
      goalsToStatusLinks = parsedLinks.filter(({ pts }) => pts.sx <= sxMid);
    }
  }

  if (!goalsToStatusLinks.length) return;

  const goalsToStatusShapes = new Set(goalsToStatusLinks.map(({ shape }) => shape));

  // 3px — extends each path into the adjacent node rect so the seam between the
  // link fill and the node fill is hidden under the node's opaque pattern overlay.
  // Nodes sit above links in Plotly's SVG stacking order, so the overlap is invisible.
  const OVERLAP = 3;
  // 1px downward extension on the curved link's source bottom edge closes the
  // shared y-boundary gap with the In Progress band directly above it.
  const SEAM = 1;

  // Pre-pass: find three values needed for the Goals-side link shift and body extension:
  //   maxStraightTy2 — bottom y of the lowest straight band (In Progress), in global px
  //   minCurvedSy1   — top y of the highest curved link (Closed/Suspended) before shifting
  //   maxCurvedSy2   — bottom y of the lowest curved link before shifting
  // When Plotly stacks curved links above the horizontal bands at the Goals node,
  // minCurvedSy1 < maxStraightTy2, so we shift ALL curved links down uniformly.
  // The shift is applied only at the Goals side; the Status side is unchanged.
  let maxStraightTy2 = -Infinity;
  let minCurvedSy1 = Infinity;
  let maxCurvedSy2 = -Infinity; // tracks shifted curved link bottom to size the body extension
  parsedLinks.forEach(({ shape, pts, index }) => {
    if (!goalsToStatusShapes.has(shape)) return;
    if (STRAIGHT_GOALS_LINK_STATUS_IDS.has(linkTargets[index])) {
      if (pts.ty2 > maxStraightTy2) maxStraightTy2 = pts.ty2;
    } else {
      if (pts.sy1 < minCurvedSy1) minCurvedSy1 = pts.sy1;
      if (pts.sy2 != null && pts.sy2 > maxCurvedSy2) maxCurvedSy2 = pts.sy2;
    }
  });

  // Pre-pass: collect the right-edge x of each status node that has reason links.
  // The source x (sx) of a status→reason link IS that status node's right edge in SVG px.
  // Used below to extend the Goals→Closed/Suspended band across the full status node body
  // so the status node appears as a solid terminal endpoint rather than a pass-through.
  const statusRightEdges = {};
  parsedLinks.forEach(({ pts, index }) => {
    const src = linkSources[index];
    const tgt = linkTargets[index];
    if (src?.startsWith('status:') && tgt?.startsWith('reason:')) {
      if (statusRightEdges[src] == null || pts.sx > statusRightEdges[src]) {
        statusRightEdges[src] = pts.sx;
      }
    }
  });
  // Shift = how far the top of the first curved link sits above the bottom of the last
  // straight band. Clamped to 0 when curved links already sit below the straight bands.
  const curvedLinkGoalsShift = (maxStraightTy2 > -Infinity && minCurvedSy1 < Infinity)
    ? Math.max(0, maxStraightTy2 - minCurvedSy1)
    : 0;

  parsedLinks.forEach(({ shape, pts, index }) => {
    const {
      sx, sy1, cx1: parsedCx1, cx2: parsedCx2, tx, ty1, ty2, sy2,
    } = pts;
    const isGoalsToStatus = goalsToStatusShapes.has(shape);
    const isGoalsToStraightStatus = isGoalsToStatus
      && STRAIGHT_GOALS_LINK_STATUS_IDS.has(linkTargets[index]);
    const isStatusToReason = !isGoalsToStatus
      && linkSources[index]?.startsWith('status:')
      && linkTargets[index]?.startsWith('reason:');

    if (isGoalsToStraightStatus) {
      // Keep these status bands fully horizontal so they do not arc upward
      // or slope between source and target. Use a clean rectangle — no interior
      // collinear points and no diagonal bottom seam — to avoid anti-aliasing
      // artifacts. The Goals right border covers the Goals-side overlap area, so
      // the SEAM extension is not needed here.
      const customPath = [
        `M ${sx - OVERLAP} ${ty1}`,
        `L ${tx + OVERLAP} ${ty1}`,
        `L ${tx + OVERLAP} ${ty2}`,
        `L ${sx - OVERLAP} ${ty2}`,
        'Z',
      ].join(' ');
      shape.setAttribute('d', customPath);
      shape.setAttribute('data-ttahub-custom-d', customPath);
    } else if (isGoalsToStatus) {
      // Preserve Plotly's smooth S-curve (departs and arrives horizontally at each
      // node) but extend 3px into the source/target nodes to close anti-aliasing seams.
      // The SEAM (+1) on the source bottom edge closes the gap between adjacent link
      // bands that share a y-boundary at the Goals node.
      // Apply curvedLinkGoalsShift so the curve departs from below the last horizontal
      // band (In Progress) when Plotly's stacking would otherwise overlap it.
      //
      // If this status has reason links, extend the path all the way to the status
      // node's right edge. The status node (same pattern/color as this link) is rendered
      // on top, so the extended band visually fills the entire status node body and the
      // node appears as a solid terminal endpoint rather than a pass-through block.
      const statusRightEdge = statusRightEdges[linkTargets[index]];
      const destRight = statusRightEdge != null ? statusRightEdge : tx + OVERLAP;
      const adjustedSy1 = sy1 + curvedLinkGoalsShift;
      const adjustedSy2 = sy2 + curvedLinkGoalsShift;
      const cx1 = parsedCx1 ?? (sx + (tx - sx) * 0.5);
      const cx2 = parsedCx2 ?? (sx + (tx - sx) * 0.5);
      const customPath = [
        `M ${sx - OVERLAP} ${adjustedSy1}`,
        `L ${sx} ${adjustedSy1}`,
        `C ${cx1} ${adjustedSy1} ${cx2} ${ty1} ${tx} ${ty1}`,
        `L ${destRight} ${ty1}`,
        `L ${destRight} ${ty2}`,
        `L ${tx} ${ty2}`,
        `C ${cx2} ${ty2} ${cx1} ${adjustedSy2 + SEAM} ${sx} ${adjustedSy2 + SEAM}`,
        `L ${sx - OVERLAP} ${sy2 + SEAM}`,
        'Z',
      ].join(' ');
      shape.setAttribute('d', customPath);
      shape.setAttribute('data-ttahub-custom-d', customPath);
    } else if (isStatusToReason) {
      // Apply the same OVERLAP extension so links emerge cleanly from the status node
      // with no rectangular stub artifact. No SEAM here — status→reason links share no
      // y-boundary with adjacent bands at the source side.
      const cx1 = parsedCx1 ?? (sx + (tx - sx) * 0.5);
      const cx2 = parsedCx2 ?? (sx + (tx - sx) * 0.5);
      const customPath = [
        `M ${sx - OVERLAP} ${sy1}`,
        `L ${sx} ${sy1}`,
        `C ${cx1} ${sy1} ${cx2} ${ty1} ${tx} ${ty1}`,
        `L ${tx + OVERLAP} ${ty1}`,
        `L ${tx + OVERLAP} ${ty2}`,
        `L ${tx} ${ty2}`,
        `C ${cx2} ${ty2} ${cx1} ${sy2} ${sx} ${sy2}`,
        `L ${sx - OVERLAP} ${sy2}`,
        'Z',
      ].join(' ');
      shape.setAttribute('d', customPath);
      shape.setAttribute('data-ttahub-custom-d', customPath);
    }
  });

  // When curved links (Closed/Suspended) are shifted down to avoid overlapping
  // the horizontal bands, their departure point falls below the Goals node's
  // rendered bottom edge. Extend the Goals node visually so the links appear to
  // emerge from within the node rather than hanging below it.
  if (curvedLinkGoalsShift > 0) {
    const goalsGroup = svg.querySelector('g.sankey-node');
    const goalsRect = goalsGroup ? getBaseNodeShape(goalsGroup) : null;
    if (goalsRect && goalsGroup) {
      const bbox = goalsRect.getBBox();
      const namespace = 'http://www.w3.org/2000/svg';

      // Parse the group translate so we can convert global→local coords.
      const transformStr = goalsGroup.getAttribute('transform') || '';
      const transformMatch = transformStr.match(/translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/);
      const goalsGroupY = transformMatch ? parseFloat(transformMatch[2]) : 0;

      // Compute how tall the extension rect needs to be in group-local pixels.
      //
      // The shifted curved link bottoms land at (maxCurvedSy2 + curvedLinkGoalsShift)
      // in global space.  Convert to local by subtracting goalsGroupY and bbox.y.
      // The bodyExt starts EXT_OVERLAP px above the Goals rect bottom (1px overlap seam)
      // so the net height formula is:
      //   globalBottom - (goalsGroupY + bbox.y + bbox.height) + EXT_OVERLAP + EXT_SAFETY
      //
      // EXT_OVERLAP (1px) — overlaps the Goals rect so there's no gap at the junction.
      // EXT_SAFETY (2px) — absorbs sub-pixel rounding differences between Plotly's
      //                    floating-point path coordinates and integer getBBox values.
      const EXT_OVERLAP = 1;
      const EXT_SAFETY = 2;
      const neededExtHeight = maxCurvedSy2 > -Infinity
        ? Math.max(
          curvedLinkGoalsShift + EXT_OVERLAP, // minimum: shift + seam overlap
          // Convert shifted curved-link global bottom to local height needed.
          (maxCurvedSy2 + curvedLinkGoalsShift) - goalsGroupY - bbox.y - bbox.height
            + EXT_OVERLAP + EXT_SAFETY,
        )
        : curvedLinkGoalsShift + EXT_OVERLAP;

      // Body extension: a rect that continues the Goals pattern fill below the node
      // so the shifted curved links appear to emerge from within the node body.
      const bodyExt = document.createElementNS(namespace, 'rect');
      bodyExt.setAttribute('class', 'ttahub-goals-ext');
      bodyExt.setAttribute('x', `${bbox.x}`);
      bodyExt.setAttribute('y', `${bbox.y + bbox.height - EXT_OVERLAP}`); // 1px overlap
      bodyExt.setAttribute('width', `${bbox.width}`);
      bodyExt.setAttribute('height', `${neededExtHeight}`);
      bodyExt.setAttribute('fill', `url(#${patternIdByNodeId.goals})`);
      bodyExt.setAttribute('style', 'pointer-events: none;');
      goalsGroup.appendChild(bodyExt);

      // Stretch the left and right border stripes to cover the full extended height.
      // New border height = original height + extension below the Goals rect bottom.
      // (neededExtHeight - EXT_OVERLAP) gives the net extra pixels below the rect.
      [
        goalsGroup.querySelector('#ttahub-goals-left-border'),
        goalsGroup.querySelector('#ttahub-goals-right-border'),
      ].forEach((border) => {
        if (!border) return;
        const currentH = parseFloat(border.getAttribute('height') || '0');
        border.setAttribute('height', `${currentH + neededExtHeight - EXT_OVERLAP}`);
        // Re-append to bring borders above the bodyExt in SVG paint order.
        goalsGroup.appendChild(border);
      });
    }
  }
}

// Main entry point called on every Plotly render pass. Rebuilds all custom SVG
// overlays (patterns, borders, labels, link paths) in a fixed order:
//   1. Ensure base patterns exist in <defs>.
//   2. Apply phase-aligned pattern fills to node shapes.
//   3. Paint border stripes on Goals, status, and reason nodes.
//   4. Render text labels for Goals and all non-goals nodes.
//   5. Replace Plotly link paths with our custom shapes.
//   6. Apply pattern fills and remove clip-paths from link shapes.
// Order matters: borders must be appended after pattern fills so they paint on top.
export function applySankeyPatterns(container, chartData) {
  if (!container || !chartData) {
    return;
  }

  const svg = container.querySelector('svg.main-svg');
  if (!svg) {
    return;
  }

  ensureSankeyPatterns(svg);

  // Build a lookup from pattern ID → tile dimensions for offset calculations.
  const patternDims = {};
  createPatternConfig().forEach(({ id, width, height }) => {
    patternDims[id] = { width, height };
  });

  const defs = svg.querySelector('defs');

  // Returns a pattern ID whose tiles are phase-aligned with the global coordinate
  // system for a node shape inside a group with translate(gx, gy).
  //
  // Problem: patternUnits="userSpaceOnUse" tiles from the current local origin.
  // Node groups have transform="translate(gx,gy)", so their local (0,0) is at
  // global (gx,gy). Link paths use global coords. At the same global y, a node
  // rect at local y=0 shows tile phase 0 while the adjacent link shows phase gy%h,
  // making the pattern "restart" visibly at every node/link boundary.
  //
  // Fix: clone the base pattern with patternTransform="translate(ox,oy)" that
  // shifts the tile origin by (ox,oy) to counteract the group's translate.
  //
  // Offset formula:
  //   ox = ((-gx % w) + w) % w   — negates gx, wraps into [0, w)
  //   oy = ((-gy % h) + h) % h   — negates gy, wraps into [0, h)
  // Adding +w/+h before the second mod ensures a positive result when gx/gy are
  // not exact multiples of the tile size (JS % can return negative values).
  function getAlignedPatternId(basePatternId, gx, gy) {
    if (!basePatternId || !defs) return basePatternId;
    const dims = patternDims[basePatternId];
    if (!dims) return basePatternId;
    const { width: w, height: h } = dims;
    const ox = ((-Math.round(gx) % w) + w) % w;
    const oy = ((-Math.round(gy) % h) + h) % h;
    // If offsets are zero the base pattern already tiles correctly; no clone needed.
    if (ox === 0 && oy === 0) return basePatternId;
    const offsetId = `${basePatternId}-ox${ox}-oy${oy}`;
    if (!defs.querySelector(`#${offsetId}`)) {
      const base = defs.querySelector(`#${basePatternId}`);
      if (!base) return basePatternId;
      const clone = base.cloneNode(true);
      clone.setAttribute('id', offsetId);
      // patternTransform shifts the tile coordinate system, not the pattern element itself.
      clone.setAttribute('patternTransform', `translate(${ox}, ${oy})`);
      defs.appendChild(clone);
    }
    return offsetId;
  }

  // Extracts the x and y values from a transform="translate(x,y)" attribute string.
  function parseTranslate(transformStr) {
    if (!transformStr) return { gx: 0, gy: 0 };
    const m = transformStr.match(/translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/);
    return m ? { gx: parseFloat(m[1]), gy: parseFloat(m[2]) } : { gx: 0, gy: 0 };
  }

  // Plotly can keep node groups alive across React updates; rebuild all custom overlays
  // from scratch each pass so stale dimensions from a prior render never persist.
  svg.querySelectorAll('.ttahub-border-overlay, .ttahub-status-label, .ttahub-goals-label, .ttahub-goals-ext').forEach((el) => el.remove());

  // Apply a phase-aligned pattern to each node shape, using the group's translate
  // to compute the correct tile offset so node and link patterns tile seamlessly.
  const nodeShapes = Array.from(svg.querySelectorAll('g.sankey-node rect, g.sankey-node path'))
    .filter((el) => !el.classList.contains('ttahub-border-overlay'));
  nodeShapes.forEach((shape, index) => {
    const basePatternId = chartData.nodePatternIds[index];
    const group = shape.closest('g.sankey-node');
    const { gx, gy } = parseTranslate(group ? group.getAttribute('transform') : '');
    const alignedId = getAlignedPatternId(basePatternId, gx, gy);
    applyPatternFill(shape, alignedId);
  });

  applyGoalsLeftBorder(svg);
  applyStatusRightBorders(svg, chartData);
  applyGoalsLabel(svg, chartData);
  applyReasonNodeBorders(svg, chartData);
  applyStatusLabels(svg, chartData);

  applyCustomLinkPaths(svg, chartData);

  const linkShapes = svg.querySelectorAll('.sankey-link, .sankey-links path, path.sankey-link');
  linkShapes.forEach((shape, index) => {
    // Remove Plotly's clip-path so the 3px node-overlap extension applied in
    // applyCustomLinkPaths can render past the node boundary. Nodes are above
    // links in Plotly's SVG layer order, so the overlapping portion is hidden.
    // Plotly may set clip-path as either an attribute or inside the style string.
    shape.removeAttribute('clip-path');
    const existingStyle = shape.getAttribute('style') || '';
    if (existingStyle.includes('clip-path')) {
      shape.setAttribute('style', existingStyle.replace(/clip-path\s*:[^;]+;?\s*/gi, ''));
    }
    const patternId = chartData.linkPatternIds[index];
    applyPatternFill(shape, patternId);
  });
}

// Runs applySankeyPatterns immediately and then twice more on successive animation
// frames. The double rAF ensures our overlays are applied after Plotly's own
// post-render hooks settle any final DOM mutations (Plotly sometimes writes the
// SVG in two passes — once on mount and once after layout stabilizes).
function schedulePatternApply(container, chartData) {
  applySankeyPatterns(container, chartData);
  window.requestAnimationFrame(() => {
    applySankeyPatterns(container, chartData);
    window.requestAnimationFrame(() => applySankeyPatterns(container, chartData));
  });
}

// Maps a node ID to its fill color. Goal reason nodes (reason:Closed:* and
// reason:Suspended:*) inherit their parent status color rather than being listed
// individually in nodeColorById. Falls back to baseMedium for any unknown ID.
export function getNodeColor(node) {
  if (nodeColorById[node.id]) {
    return nodeColorById[node.id];
  }

  if (node.id.startsWith('reason:Closed:')) {
    return colors.ttahubSankeyGreen;
  }

  if (node.id.startsWith('reason:Suspended:')) {
    return colors.ttahubSankeyRed;
  }

  return colors.baseMedium;
}

// Renders a three-column Sankey diagram: Goals → Status → Reason.
// Plotly draws the base chart; post-render hooks (schedulePatternApply) replace
// default fills with custom SVG patterns and reshape link paths for visual accuracy.
// In narrow mode (< NARROW_THRESHOLD px) all layout values are scaled down
// proportionally so the chart fits without column overlap.
function GoalStatusReasonSankey({ sankey, className }) {
  const chartRef = useRef(null);
  const [PlotComponent, setPlotComponent] = useState(null);

  useEffect(() => {
    let isMounted = true;

    if (process.env.NODE_ENV === 'test') {
      return () => {
        isMounted = false;
      };
    }

    getPlotComponent().then((LoadedPlotComponent) => {
      if (isMounted) {
        setPlotComponent(() => LoadedPlotComponent);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Track container width via window resize — same pattern as BarGraph.js.
  // We use window resize (not ResizeObserver) because it is synchronous and
  // reliably fires in all environments.
  const [containerWidth, setContainerWidth] = useState(null);
  useEffect(() => {
    const updateWidth = () => {
      if (chartRef.current) {
        setContainerWidth(chartRef.current.offsetWidth);
      }
    };
    window.addEventListener('resize', updateWidth);
    updateWidth(); // Measure immediately on mount
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const isNarrow = containerWidth != null && containerWidth < NARROW_THRESHOLD;

  // Within narrow mode, round to 50-px buckets so the key only changes when
  // the width shifts meaningfully (limits remount frequency during drag).
  // At full size the bucket is fixed at 0 so expanding back to any full-screen
  // width produces the same key — no unnecessary remount, just autosize.
  // The `isNarrow` flag is always included so Plotly remounts when crossing
  // the threshold in either direction (config.responsive changes between modes).
  const widthBucket = isNarrow ? Math.round(containerWidth / 50) * 50 : 0;

  const chartRenderKey = useMemo(() => {
    const nodes = sankey?.nodes || [];
    const links = sankey?.links || [];
    return JSON.stringify({
      nodes: nodes.map((n) => [n.id, n.count, n.percentage]),
      links: links.map((l) => [l.source, l.target, l.value]),
      narrow: isNarrow,
      w: widthBucket,
    });
  }, [sankey, isNarrow, widthBucket]);

  const chartData = useMemo(() => {
    const allNodes = sankey?.nodes || [];
    const links = (sankey?.links || []).reduce((acc, link) => {
      const source = link?.source;
      const target = link?.target;
      const numericValue = Number(link?.value);

      if (!source || !target || !Number.isFinite(numericValue) || numericValue <= 0) {
        return acc;
      }

      const key = `${source}=>${target}`;
      const existing = acc.get(key);
      if (existing) {
        existing.value += numericValue;
      } else {
        acc.set(key, { source, target, value: numericValue });
      }

      return acc;
    }, new Map());

    if (!allNodes.length) {
      return null;
    }

    const nodeById = allNodes.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {});

    if (!nodeById.goals) {
      return null;
    }

    const statusNodes = STATUS_NODE_IDS
      .filter((id) => nodeById[id])
      .map((id) => nodeById[id]);

    const normalizedLinks = Array.from(links.values());
    const rawStatusToReasonLinks = normalizedLinks.filter((link) => (
      link.source.startsWith('status:')
      && link.target.startsWith('reason:')
    ));
    const linkedReasonNodeIds = new Set(rawStatusToReasonLinks.map((link) => link.target));

    const closedReasonNodes = allNodes.filter((node) => (
      node.id.startsWith('reason:Closed:') && linkedReasonNodeIds.has(node.id)
    ));
    const suspendedReasonNodes = allNodes.filter((node) => (
      node.id.startsWith('reason:Suspended:') && linkedReasonNodeIds.has(node.id)
    ));
    const reasonNodes = [...closedReasonNodes, ...suspendedReasonNodes];
    const maxReasonGroupSize = Math.max(closedReasonNodes.length, suspendedReasonNodes.length);

    const nodes = [nodeById.goals, ...statusNodes, ...reasonNodes];

    /* istanbul ignore next */
    if (!nodes.length) {
      return null;
    }

    const nodeIndexById = nodes.reduce((acc, node, index) => {
      acc[node.id] = index;
      return acc;
    }, {});

    const goalsToStatusLinks = normalizedLinks.filter((link) => (
      link.source === 'goals'
      && STATUS_NODE_IDS.includes(link.target)
      && typeof nodeIndexById[link.target] !== 'undefined'
    ));

    const statusToReasonLinks = rawStatusToReasonLinks.filter((link) => (
      typeof nodeIndexById[link.source] !== 'undefined'
      && typeof nodeIndexById[link.target] !== 'undefined'
    ));

    // Pre-compute inflated values so computeStatusNodeYBounds can size gaps to
    // match what Plotly actually renders (Plotly uses renderedValue, not count).
    const statusInflatedValues = {};
    goalsToStatusLinks.forEach((link) => {
      statusInflatedValues[link.target] = getInflatedLinkValue(link.value);
    });
    const statusYBounds = computeStatusNodeYBounds(nodeById, statusInflatedValues);
    const reasonYPositions = computeReasonNodeY(reasonNodes, statusYBounds);

    // Keep source-side stacking aligned with destination Y so goals->status
    // links depart the goals node in the same top-to-bottom order.
    const sortedGoalsToStatusLinks = [...goalsToStatusLinks].sort((a, b) => {
      const aY = statusYBounds[a.target]?.center ?? Number.POSITIVE_INFINITY;
      const bY = statusYBounds[b.target]?.center ?? Number.POSITIVE_INFINITY;
      if (aY !== bY) {
        return aY - bY;
      }
      return a.target.localeCompare(b.target);
    });

    const visibleLinks = [...sortedGoalsToStatusLinks, ...statusToReasonLinks];

    const nodeX = nodes.map((node) => {
      if (node.id === 'goals') return 0.1;
      if (node.id.startsWith('status:')) return 0.46;
      // Push reason columns right as the densest reason group grows, so
      // status labels and reason nodes stay visually separated.
      const reasonColumnX = Math.min(0.985, 0.94 + Math.max(0, maxReasonGroupSize - 1) * 0.025);
      return reasonColumnX;
    });

    const nodeY = nodes.map((node) => {
      if (node.id === 'goals') return GOALS_NODE_Y;
      if (node.id.startsWith('status:')) return statusYBounds[node.id]?.center ?? 0.5;
      return reasonYPositions[node.id] ?? 0.5;
    });

    const goalsNode = nodeById.goals;
    const goalsAnnotationText = formatNodeLabel(goalsNode);
    const allNonGoalsNodes = [...statusNodes, ...reasonNodes];
    const statusIdsWithReasons = new Set(statusToReasonLinks.map((link) => link.source));

    // Maps each status-with-reasons to the index in the Plotly nodeGroups array
    // (g.sankey-node elements) of its first reason node.
    // nodeGroups order: [goals, ...statusNodes, ...closedReasons, ...suspendedReasons]
    const reasonGroupsByStatus = {};
    let reasonOffset = 0;
    [
      ['status:Closed', closedReasonNodes],
      ['status:Suspended', suspendedReasonNodes],
    ].forEach(([statusId, group]) => {
      if (group.length > 0) {
        reasonGroupsByStatus[statusId] = 1 + statusNodes.length + reasonOffset;
        reasonOffset += group.length;
      }
    });

    // Pass 1: inflate Goals→Status link values normally.
    const goalsToStatusRenderedMap = new Map();
    visibleLinks.forEach((link) => {
      if (link.source === 'goals' && link.target.startsWith('status:')) {
        goalsToStatusRenderedMap.set(link.target, getInflatedLinkValue(link.value));
      }
    });

    // Accumulate weighted reason link totals per status for proportional scaling.
    // Using the same low-value inflation curve here helps separate tiny reason
    // counts (for example 1 vs 5) while still conserving each status total.
    const statusToReasonWeightedTotals = new Map();
    const reasonLinkWeightedValueByIndex = new Map();
    visibleLinks.forEach((link) => {
      if (link.source.startsWith('status:') && link.target.startsWith('reason:')) {
        const weightedReasonValue = getInflatedLinkValue(link.value);
        reasonLinkWeightedValueByIndex.set(link, weightedReasonValue);
        statusToReasonWeightedTotals.set(
          link.source,
          (statusToReasonWeightedTotals.get(link.source) || 0) + weightedReasonValue,
        );
      }
    });

    // Pass 2: Status→Reason links are scaled proportionally from the status's inflated
    // incoming value, ensuring sum(reason rendered) === Goals→Status rendered value.
    // This prevents the status node from appearing taller than its incoming link.
    const renderedValue = visibleLinks.map((link) => {
      if (link.source.startsWith('status:') && link.target.startsWith('reason:')) {
        const statusTotal = statusToReasonWeightedTotals.get(link.source) || 0;
        const statusRendered = goalsToStatusRenderedMap.get(link.source);
        if (statusTotal > 0 && statusRendered != null) {
          const weightedReasonValue = reasonLinkWeightedValueByIndex.get(link) || 0;
          return Math.max(1, (weightedReasonValue / statusTotal) * statusRendered);
        }
      }
      return getInflatedLinkValue(link.value);
    });

    return {
      labels: nodes.map(() => ''),
      goalsAnnotationText,
      goalsNodeData: goalsNode,
      statusNodesData: statusNodes,
      allNonGoalsNodes,
      statusNodeCount: statusNodes.length,
      statusIdsWithReasons,
      reasonGroupsByStatus,
      statusNodeGroupIndexById: statusNodes.reduce((acc, node, idx) => {
        acc[node.id] = idx + 1;
        return acc;
      }, {}),
      nodeColors: nodes.map(getNodeColor),
      statusBorderColors: statusNodes.map((node) => statusBorderColorById[node.id] || null),
      nodePatternIds: nodes.map((node) => {
        if (patternIdByNodeId[node.id]) return patternIdByNodeId[node.id];
        // Reason nodes inherit their parent status pattern.
        const parentId = `status:${node.id.split(':')[1]}`;
        return patternIdByNodeId[parentId] || null;
      }),
      nodeX,
      nodeY,
      linkSources: visibleLinks.map((link) => link.source),
      linkTargets: visibleLinks.map((link) => link.target),
      source: visibleLinks.map((link) => nodeIndexById[link.source]),
      target: visibleLinks.map((link) => nodeIndexById[link.target]),
      value: visibleLinks.map((link) => link.value),
      renderedValue,
      linkColors: visibleLinks.map(
        (link) => getNodeColor(nodeById[link.target]) || colors.baseMedium,
      ),
      linkPatternIds: visibleLinks.map((link) => {
        if (patternIdByNodeId[link.target]) return patternIdByNodeId[link.target];
        // status→reason links: use the source status pattern.
        return patternIdByNodeId[link.source] || null;
      }),
      maxReasonGroupSize,
      rightMargin: Math.min(560, 380 + Math.max(0, maxReasonGroupSize - 1) * 36),
      reasonNodeBorderColors: reasonNodes.map((node) => {
        if (node.id.startsWith('reason:Closed:')) return colors.ttahubSankeyGreenDark;
        if (node.id.startsWith('reason:Suspended:')) return colors.ttahubSankeyRedDark;
        /* istanbul ignore next */
        return null;
      }),
    };
  }, [sankey]);

  const applyPatterns = useCallback(() => {
    schedulePatternApply(chartRef.current, chartData);
  }, [chartData]);

  useEffect(() => {
    if (containerWidth && chartData) {
      schedulePatternApply(chartRef.current, chartData);
    }
  }, [containerWidth, chartData]);

  if (!chartData) {
    return <p className="usa-prose margin-top-2">No goal status data found.</p>;
  }

  if (!PlotComponent) {
    return null;
  }

  // --- Narrow mode: proportionally scaled layout values ---
  // Only computed (and only used) when isNarrow is true.  At full size every
  // prop reverts to its original value so the chart looks identical to before.
  //
  // Right margin: scale proportionally to NARROW_THRESHOLD, floor at 200px.
  // Thickness: derived geometrically so Goals and Status columns never overlap.
  // Pad and font: proportionally smaller so labels stay readable.
  //
  // All of these feed into chartRenderKey via widthBucket, forcing Plotly to
  // remount when the bucket changes — the only reliable way to update
  // node.thickness (in-place prop updates don't honour it for Sankey traces).
  const baseRightMargin = chartData.rightMargin; // 380–560px depending on reason node count
  // Scale the right margin proportionally to the current container width; floor at 200px
  // so there is always room for reason-node labels even at the narrowest breakpoint.
  const scaledRightMargin = isNarrow
    ? Math.max(200, Math.min(baseRightMargin,
      Math.round((baseRightMargin * containerWidth) / NARROW_THRESHOLD)))
    : baseRightMargin;
  // Pixel width available for the two node columns (Goals + Status).
  // Left margin and right margin are both subtracted; floor at 50px to avoid degenerate layouts.
  const plotAreaWidth = isNarrow
    ? Math.max(50, containerWidth - SANKEY_LEFT_MARGIN - scaledRightMargin)
    : null;
  // Maximum node thickness that keeps Goals and Status columns from overlapping.
  // Derived from: thickness < COLUMN_GAP_FRACTION × plotAreaWidth, then scaled by THICKNESS_SAFETY.
  const maxThickness = plotAreaWidth != null
    ? Math.floor(COLUMN_GAP_FRACTION * plotAreaWidth * THICKNESS_SAFETY)
    : SANKEY_NODE_THICKNESS;
  // Clamp to [20, SANKEY_NODE_THICKNESS] so nodes never become invisible or exceed full-size.
  const scaledThickness = isNarrow
    ? Math.min(SANKEY_NODE_THICKNESS, Math.max(20, maxThickness))
    : SANKEY_NODE_THICKNESS;
  // Scale pad proportionally to plotAreaWidth relative to a 500px reference; floor at 10px.
  const scaledPad = isNarrow && plotAreaWidth != null
    ? Math.max(10, Math.round(SANKEY_NODE_PAD * Math.min(1, plotAreaWidth / 500)))
    : SANKEY_NODE_PAD;
  // Scale font proportionally to container width relative to a 900px reference; floor at 9pt.
  const scaledFontSize = isNarrow
    ? Math.max(9, Math.round(SANKEY_FONT_SIZE * Math.min(1, containerWidth / 900)))
    : SANKEY_FONT_SIZE;

  return (
    <div className={`ttahub-goal-sankey ${className}`} data-testid="goal-status-reason-sankey" ref={chartRef}>
      <PlotComponent
        key={chartRenderKey}
        data={[
          {
            type: 'sankey',
            arrangement: 'fixed',
            node: {
              label: chartData.labels,
              color: chartData.nodeColors,
              x: chartData.nodeX,
              y: chartData.nodeY,
              pad: scaledPad,
              thickness: scaledThickness,
              line: {
                color: chartData.nodeColors,
                width: 0,
              },
              hoverinfo: 'none',
            },
            link: {
              source: chartData.source,
              target: chartData.target,
              value: chartData.renderedValue,
              color: chartData.linkColors,
              hoverinfo: 'none',
              line: {
                color: 'transparent',
                width: 0,
              },
            },
          },
        ]}
        layout={{
          autosize: !isNarrow,
          width: isNarrow ? containerWidth : undefined,
          margin: {
            t: 0,
            r: scaledRightMargin,
            l: SANKEY_LEFT_MARGIN,
            b: 8,
          },
          font: {
            family: 'Source Sans Pro, Arial, sans-serif',
            size: scaledFontSize,
            color: colors.baseDarkest,
          },
          annotations: [],
          hovermode: false,
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
        }}
        style={{ width: '100%', height: `${SANKEY_CHART_HEIGHT}px` }}
        config={{
          displayModeBar: false,
          // At full size, let Plotly respond to container changes normally.
          // In narrow mode, disable responsive so Plotly doesn't override our
          // explicit layout.width with its own auto-resize measurement.
          responsive: !isNarrow,
        }}
        onInitialized={applyPatterns}
        onUpdate={applyPatterns}
        onAfterPlot={applyPatterns}
        onRelayout={applyPatterns}
        onClick={applyPatterns}
        onHover={applyPatterns}
        onUnhover={applyPatterns}
      />
    </div>
  );
}

GoalStatusReasonSankey.propTypes = {
  className: PropTypes.string,
  sankey: PropTypes.shape({
    nodes: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string,
      label: PropTypes.string,
      count: PropTypes.number,
      percentage: PropTypes.number,
    })),
    links: PropTypes.arrayOf(PropTypes.shape({
      source: PropTypes.string,
      target: PropTypes.string,
      value: PropTypes.number,
    })),
  }),
};

GoalStatusReasonSankey.defaultProps = {
  className: '',
  sankey: {
    nodes: [],
    links: [],
  },
};

export default GoalStatusReasonSankey;
