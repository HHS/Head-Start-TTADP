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
import pickClosestLinkByTargetCenter from './goalStatusReasonSankeyUtils';

let plotComponentPromise;

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

const TOP_ALIGNED_STATUS_LABEL_IDS = new Set([
  'status:Not Started',
  'status:In Progress',
]);

const REASON_NODE_PREFIXES = [
  'reason:Closed:',
  'reason:Suspended:',
];

const FIXED_STATUS_GAP_AFTER = {
  'status:In Progress': 0.05,
  'status:Closed': 0.04,
};

const TRAILING_STATUS_IDS = ['status:Closed', 'status:Suspended'];
const FIXED_GAP_BEFORE_TRAILING_STATUS = 0.08;

const SANKEY_CHART_HEIGHT = 560;
const SANKEY_NODE_THICKNESS = 180;
const SANKEY_NODE_PAD = 40;
const SANKEY_FONT_SIZE = 16;
const SANKEY_LEFT_MARGIN = 16;

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

// Returns { [statusId]: { top, center, bottom } } in normalized Y coords.
function computeStatusNodeYBounds(nodeById) {
  const relevantNodes = STATUS_NODE_IDS.filter((id) => nodeById[id]);
  const totalCount = relevantNodes.reduce((sum, id) => sum + (nodeById[id]?.count || 0), 0);

  const dominantStatusPct = totalCount > 0
    ? Math.max(...relevantNodes.map((id) => (nodeById[id]?.count || 0) / totalCount))
    : 0;
  // Add extra headroom when one status dominates so thick top links don't
  // sit directly on the chart edge (for example large Not Started shares).
  const dominantStatusHeadroom = dominantStatusPct > 0.4
    ? Math.min(0.08, (dominantStatusPct - 0.4) * 0.4)
    : 0;
  const TOP_BUFFER = 0.1 + dominantStatusHeadroom;
  const BOTTOM_BUFFER = 0.04;
  // Keep this in sync with node.pad so status-to-status spacing is visibly
  // adjustable even when node centers are manually controlled.
  const BASE_PAD_FRAC = Math.max(0.09, SANKEY_NODE_PAD / 420);
  const extraGapAfter = {
    'status:Not Started': 0.03,
    'status:In Progress': FIXED_STATUS_GAP_AFTER['status:In Progress'],
    'status:Closed': FIXED_STATUS_GAP_AFTER['status:Closed'],
  };

  // Keep clear space before trailing Closed/Suspended statuses so the
  // status labels rendered above those nodes always have room.
  const trailingStatuses = TRAILING_STATUS_IDS.filter((id) => relevantNodes.includes(id));
  if (trailingStatuses.length) {
    const firstTrailingIndex = relevantNodes.indexOf(trailingStatuses[0]);
    if (firstTrailingIndex > 0) {
      const prevStatusId = relevantNodes[firstTrailingIndex - 1];
      extraGapAfter[prevStatusId] = Math.max(
        extraGapAfter[prevStatusId] || 0,
        FIXED_GAP_BEFORE_TRAILING_STATUS,
      );
    }
  }

  const totalGapFrac = relevantNodes
    .slice(0, -1)
    .reduce((sum, id) => sum + BASE_PAD_FRAC + (extraGapAfter[id] || 0), 0);
  const usable = Math.max(0.2, 1 - TOP_BUFFER - BOTTOM_BUFFER - totalGapFrac);

  let cumulative = TOP_BUFFER;
  const bounds = {};
  relevantNodes.forEach((id, index) => {
    const pct = totalCount > 0 ? (nodeById[id].count / totalCount) : (1 / relevantNodes.length);
    const height = pct * usable;
    bounds[id] = { top: cumulative, center: cumulative + height / 2, bottom: cumulative + height };
    const isLast = index === relevantNodes.length - 1;
    const gapAfter = isLast ? 0 : (BASE_PAD_FRAC + (extraGapAfter[id] || 0));
    cumulative += height + gapAfter;
  });
  return bounds;
}

// Positions reason nodes grouped by parent, centered at the parent's Y.
// Each node gets a minimum height floor so labels never overlap.
// A forward pass pushes groups down on collision; a backward pass shifts
// everything up if the last group would overflow the bottom edge.
function computeReasonNodeY(reasonNodes, statusBounds) {
  if (!reasonNodes.length) return {};

  const byParent = {};
  reasonNodes.forEach((node) => {
    const parentId = `status:${node.id.split(':')[1]}`;
    if (!byParent[parentId]) byParent[parentId] = [];
    byParent[parentId].push(node);
  });

  // Build groups in status order so layout order matches the status column.
  const groups = STATUS_NODE_IDS
    .filter((id) => byParent[id])
    .map((parentId) => ({ parentId, nodes: byParent[parentId] }));

  if (!groups.length) return {};

  // ~34px on a 560px chart — enough for a 2-line label.
  const MIN_NODE_HEIGHT = 0.06;
  const NODE_PAD = 0.03; // gap between sibling reason nodes
  const GROUP_PAD = 0.06; // extra gap between different parent groups
  const EDGE = 0.04; // keep away from top/bottom chart edges

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
  'status:Closed': colors.ttahubTeal,
  'status:Suspended': colors.ttahubMagentaMedium,
};

const statusBorderColorById = {
  'status:Not Started': colors.ttahubSankeyOrange,
  'status:In Progress': colors.ttahubSankeyMediumBlue,
  'status:Closed': colors.ttahubTealDark,
  'status:Suspended': colors.ttahubSankeyMagenta,
};

const patternIdByNodeId = {
  goals: 'ttahub-sankey-pattern-goals',
  'status:Not Started': 'ttahub-sankey-pattern-not-started',
  'status:In Progress': 'ttahub-sankey-pattern-in-progress',
  'status:Closed': 'ttahub-sankey-pattern-closed',
  'status:Suspended': 'ttahub-sankey-pattern-suspended',
};

const formatPercent = (id, percentage, count) => {
  if (id === 'goals') {
    return count > 0 ? '100%' : '0%';
  }

  return `${Number(percentage || 0).toFixed(2)}%`;
};

const formatNodeLabel = (node) => `<b>${node.count} (${formatPercent(node.id, node.percentage, node.count)})</b><br>${node.label}`;

const createPatternConfig = () => ([
  {
    id: patternIdByNodeId.goals,
    width: 8,
    height: 8,
    baseColor: colors.ttahubGrayBlue,
    stripePath: '',
    stripeColor: '',
  },
  {
    id: patternIdByNodeId['status:Not Started'],
    width: 8,
    height: 8,
    baseColor: colors.ttahubOrangeMedium,
    stripePath: '',
    stripeColor: '',
  },
  {
    id: patternIdByNodeId['status:In Progress'],
    width: 8,
    height: 8,
    baseColor: colors.ttahubSteelBlue,
    stripePath: '',
    stripeColor: '',
  },
  {
    id: patternIdByNodeId['status:Closed'],
    width: 10,
    height: 10,
    baseColor: colors.ttahubTeal,
    stripePath: '',
    stripeColor: '',
  },
  {
    id: patternIdByNodeId['status:Suspended'],
    width: 8,
    height: 8,
    baseColor: colors.ttahubMagentaMedium,
    stripePath: '',
    stripeColor: '',
  },
]);

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

    const baseRect = document.createElementNS(namespace, 'rect');
    baseRect.setAttribute('x', '0');
    baseRect.setAttribute('y', '0');
    baseRect.setAttribute('width', `${patternConfig.width}`);
    baseRect.setAttribute('height', `${patternConfig.height}`);
    baseRect.setAttribute('fill', patternConfig.baseColor);
    pattern.appendChild(baseRect);

    if (patternConfig.stripePath) {
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
  leftBorder.setAttribute('width', '12');
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
  rightBorder.setAttribute('x', `${width - 12}`);
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

export function applyStatusRightBorders(svg, chartData) {
  if (!svg || !chartData) {
    return;
  }

  const nodeGroups = Array.from(svg.querySelectorAll('g.sankey-node'));
  const namespace = 'http://www.w3.org/2000/svg';

  nodeGroups.slice(1, 1 + chartData.statusNodeCount).forEach((group, i) => {
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

export function applyReasonNodeBorders(svg, chartData) {
  if (!svg || !chartData) {
    return;
  }

  const nodeGroups = Array.from(svg.querySelectorAll('g.sankey-node'));
  const namespace = 'http://www.w3.org/2000/svg';
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

    const leftBorderId = `ttahub-reason-left-border-${i}`;
    const existingLeft = group.querySelector(`#${leftBorderId}`);
    const leftBorder = existingLeft || document.createElementNS(namespace, 'rect');
    leftBorder.setAttribute('id', leftBorderId);
    leftBorder.setAttribute('class', 'ttahub-border-overlay');
    leftBorder.setAttribute('x', '0');
    leftBorder.setAttribute('y', '0');
    leftBorder.setAttribute('width', '12');
    leftBorder.setAttribute('height', `${height}`);
    leftBorder.setAttribute('style', `fill: ${borderColor}; fill-opacity: 1; stroke: none; pointer-events: none;`);
    if (!existingLeft) {
      group.appendChild(leftBorder);
    } else {
      existingLeft.setAttribute('height', `${height}`);
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
  const cleanedStyle = existingStyle
    .replace(/fill:\s*[^;]+;?/gi, '')
    .replace(/stroke:\s*[^;]+;?/gi, '')
    .trim();
  const mergedStyle = `${cleanedStyle}${cleanedStyle ? ';' : ''}fill: ${fill}; stroke: none;`;
  element.setAttribute('style', mergedStyle);
}

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

export function applyStatusLabels(svg, chartData) {
  if (!svg || !chartData) {
    return;
  }

  const namespace = 'http://www.w3.org/2000/svg';
  const nodeGroups = Array.from(svg.querySelectorAll('g.sankey-node'));
  const STATUS_REASON_LABEL_LINE_GAP = 16;
  const STATUS_REASON_LABEL_CLEARANCE = 12;
  const STATUS_REASON_LABEL_LEFT_SHIFT = 34;
  const STATUS_REASON_LABEL_MIN_GAP = 6;
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
      // Keep two-line labels above the outgoing flow bundle for readability.
      const labelBaseY = bbox.y - STATUS_REASON_LABEL_CLEARANCE;
      const label = makeLabelText(
        namespace, nodeData,
        bbox.x + bbox.width + GAP - (
          chartData.leftAlignAllStatusLabels ? 0 : STATUS_REASON_LABEL_LEFT_SHIFT
        ),
        labelBaseY - STATUS_REASON_LABEL_LINE_GAP,
        labelBaseY,
      );
      group.appendChild(label);

      if (previousReasonStatusLabelBottomPx !== null) {
        // Compare in viewport space because node groups are transformed.
        let rect = label.getBoundingClientRect();
        let guard = 0;
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
    if (TOP_ALIGNED_STATUS_LABEL_IDS.has(nodeData.id)) {
      // Keep these labels aligned with the node's top edge for easier scanability.
      const TOP_PADDING = 14;
      const LINE_GAP = 16;
      group.appendChild(makeLabelText(
        namespace, nodeData,
        bbox.x + bbox.width + GAP,
        bbox.y + TOP_PADDING,
        bbox.y + TOP_PADDING + LINE_GAP,
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

    // Place label above the node top edge for statuses that do not branch.
    const labelBaseY = bbox.y - GAP;
    group.appendChild(makeLabelText(
      namespace, nodeData,
      bbox.x + bbox.width + GAP,
      labelBaseY - 16,
      labelBaseY,
    ));
  });
}

export function parsePathPoints(d) {
  const nums = d.replace(/[MCLZz]/g, ' ').trim().split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  if (nums.length === 16) {
    // Plotly/gentle-curve format: M(0,1) C(2,3,4,5,6,7) L(8,9) C(10,11,12,13,14,15)
    return {
      sx: nums[0], sy1: nums[1], tx: nums[6], ty1: nums[7], ty2: nums[9], sy2: nums[15],
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

export function applyCustomLinkPaths(svg, chartData) {
  if (!svg || !chartData) return;

  const linkShapes = Array.from(
    svg.querySelectorAll('.sankey-link, .sankey-links path, path.sankey-link'),
  );

  // Parse all paths, filtering out unparseable ones.
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

  const statusNodeGroups = Array.from(svg.querySelectorAll('g.sankey-node'));
  const findParsedLinkForStatus = (statusId) => {
    const dataLinkIndex = linkTargets.findIndex((target, idx) => (
      target === statusId && linkSources[idx] === 'goals'
    ));
    if (dataLinkIndex === -1) {
      return null;
    }

    return parsedLinks.find(({ index }) => index === dataLinkIndex) || null;
  };

  const findShapeForStatus = (statusId) => {
    const parsedByData = findParsedLinkForStatus(statusId);
    if (parsedByData?.shape) {
      return parsedByData.shape;
    }

    const groupIndex = chartData.statusNodeGroupIndexById?.[statusId];
    if (typeof groupIndex !== 'number') {
      return null;
    }

    const statusGroup = statusNodeGroups[groupIndex];
    const statusRect = getBaseNodeShape(statusGroup);
    const bbox = statusRect?.getBBox();
    const targetCenterY = bbox ? (bbox.y + bbox.height / 2) : NaN;
    const closest = pickClosestLinkByTargetCenter(goalsToStatusLinks, targetCenterY);
    return closest?.shape || null;
  };

  let notStartedShape = findShapeForStatus('status:Not Started');

  // Fallback: keep old behavior only if the status-group mapping cannot be resolved.
  if (!notStartedShape && chartData.notStartedLinkIndex !== -1) {
    const topmost = goalsToStatusLinks.reduce((best, cur) => {
      const curTop = Math.min(cur.pts.sy1, cur.pts.sy2);
      const bestTop = Math.min(best.pts.sy1, best.pts.sy2);
      return curTop < bestTop ? cur : best;
    });
    notStartedShape = topmost.shape;
  }

  const goalsToStatusShapes = new Set(goalsToStatusLinks.map(({ shape }) => shape));

  parsedLinks.forEach(({ shape, pts }) => {
    const {
      sx, sy1, tx, ty1, ty2, sy2,
    } = pts;
    const isGoalsToStatus = goalsToStatusShapes.has(shape);
    if (!isGoalsToStatus) return; // status→reason: leave Plotly's default curves untouched

    const isNotStarted = shape === notStartedShape;

    // Gradual curve: extends horizontally from source before bending downward.
    // Use the same path style for all goals→status links so each status link
    // remains a single continuous band from source to target.
    const TOP_SAFE_INSET = 1;
    const MIN_TOP_Y = 2;
    const adjustedSy1 = isNotStarted ? Math.max(sy1 + TOP_SAFE_INSET, MIN_TOP_Y) : sy1;
    const adjustedTy1 = isNotStarted ? Math.max(ty1 + TOP_SAFE_INSET, MIN_TOP_Y) : ty1;
    const cx1 = sx + (tx - sx) * 0.75; // hold source Y for 75% of X travel
    const cx2 = tx - (tx - sx) * 0.25; // enter target Y in the last 25%
    const customPath = `M ${sx} ${adjustedSy1} C ${cx1} ${adjustedSy1} ${cx2} ${adjustedTy1} ${tx} ${adjustedTy1} L ${tx} ${ty2} C ${cx2} ${ty2} ${cx1} ${sy2} ${sx} ${sy2} Z`;
    shape.setAttribute('d', customPath);
    shape.setAttribute('data-ttahub-custom-d', customPath);
  });
}

export function applySankeyPatterns(container, chartData) {
  if (!container || !chartData) {
    return;
  }

  const svg = container.querySelector('svg.main-svg');
  if (!svg) {
    return;
  }

  ensureSankeyPatterns(svg);

  // Plotly can keep node groups alive across react updates. Rebuild custom
  // overlays from scratch each pass so stale dimensions never stick.
  svg.querySelectorAll('.ttahub-border-overlay, .ttahub-status-label').forEach((el) => el.remove());

  const nodeShapes = Array.from(svg.querySelectorAll('g.sankey-node rect, g.sankey-node path'))
    .filter((el) => !el.classList.contains('ttahub-border-overlay'));
  nodeShapes.forEach((shape, index) => {
    const patternId = chartData.nodePatternIds[index];
    applyPatternFill(shape, patternId);
  });

  applyGoalsLeftBorder(svg);
  applyStatusRightBorders(svg, chartData);
  applyReasonNodeBorders(svg, chartData);
  applyStatusLabels(svg, chartData);

  applyCustomLinkPaths(svg, chartData);

  const linkShapes = svg.querySelectorAll('.sankey-link, .sankey-links path, path.sankey-link');
  linkShapes.forEach((shape, index) => {
    const patternId = chartData.linkPatternIds[index];
    applyPatternFill(shape, patternId);
  });
}

function schedulePatternApply(container, chartData) {
  applySankeyPatterns(container, chartData);
  window.requestAnimationFrame(() => {
    applySankeyPatterns(container, chartData);
    window.requestAnimationFrame(() => applySankeyPatterns(container, chartData));
  });
}

export function getNodeColor(node) {
  if (nodeColorById[node.id]) {
    return nodeColorById[node.id];
  }

  if (node.id.startsWith('reason:Closed:')) {
    return colors.success;
  }

  if (node.id.startsWith('reason:Suspended:')) {
    return colors.errorDark;
  }

  return colors.baseMedium;
}

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
    const links = sankey?.links || [];

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

    const closedReasonNodes = allNodes.filter((n) => n.id.startsWith('reason:Closed:'));
    const suspendedReasonNodes = allNodes.filter((n) => n.id.startsWith('reason:Suspended:'));
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

    const goalsToStatusLinks = links.filter((link) => (
      link.source === 'goals'
      && STATUS_NODE_IDS.includes(link.target)
      && typeof nodeIndexById[link.target] !== 'undefined'
    ));

    const statusToReasonLinks = links.filter((link) => (
      link.source.startsWith('status:')
      && link.target.startsWith('reason:')
      && typeof nodeIndexById[link.source] !== 'undefined'
      && typeof nodeIndexById[link.target] !== 'undefined'
    ));

    const visibleLinks = [...goalsToStatusLinks, ...statusToReasonLinks];

    const statusYBounds = computeStatusNodeYBounds(nodeById);
    const reasonYPositions = computeReasonNodeY(reasonNodes, statusYBounds);

    const nodeX = nodes.map((node) => {
      if (node.id === 'goals') return 0.1;
      if (node.id.startsWith('status:')) return 0.46;
      // Push reason columns right as the densest reason group grows, so
      // status labels and reason nodes stay visually separated.
      const reasonColumnX = Math.min(0.985, 0.94 + Math.max(0, maxReasonGroupSize - 1) * 0.025);
      return reasonColumnX;
    });

    const nodeY = nodes.map((node) => {
      if (node.id === 'goals') return 0.5;
      if (node.id.startsWith('status:')) return statusYBounds[node.id]?.center ?? 0.5;
      return reasonYPositions[node.id] ?? 0.5;
    });

    const goalsNode = nodeById.goals;
    const goalsAnnotationText = formatNodeLabel(goalsNode);
    const allNonGoalsNodes = [...statusNodes, ...reasonNodes];
    const statusIdsWithReasons = new Set(
      reasonNodes.map((n) => `status:${n.id.split(':')[1]}`),
    );

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

    return {
      labels: nodes.map(() => ''),
      goalsAnnotationText,
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
      linkColors: visibleLinks.map(
        (link) => getNodeColor(nodeById[link.target]) || colors.baseMedium,
      ),
      linkPatternIds: visibleLinks.map((link) => {
        if (patternIdByNodeId[link.target]) return patternIdByNodeId[link.target];
        // status→reason links: use the source status pattern.
        return patternIdByNodeId[link.source] || null;
      }),
      maxReasonGroupSize,
      leftAlignAllStatusLabels: maxReasonGroupSize <= 2,
      rightMargin: Math.min(560, 380 + Math.max(0, maxReasonGroupSize - 1) * 36),
      notStartedLinkIndex: visibleLinks.findIndex((l) => l.target === 'status:Not Started'),
      reasonNodeBorderColors: reasonNodes.map((node) => {
        if (node.id.startsWith('reason:Closed:')) return colors.ttahubTealDark;
        if (node.id.startsWith('reason:Suspended:')) return colors.ttahubSankeyMagenta;
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
  const baseRightMargin = chartData.rightMargin; // 380–560px depending on reason count
  const scaledRightMargin = isNarrow
    ? Math.max(200, Math.min(baseRightMargin,
      Math.round((baseRightMargin * containerWidth) / NARROW_THRESHOLD)))
    : baseRightMargin;
  const plotAreaWidth = isNarrow
    ? Math.max(50, containerWidth - SANKEY_LEFT_MARGIN - scaledRightMargin)
    : null;
  const maxThickness = plotAreaWidth != null
    ? Math.floor(COLUMN_GAP_FRACTION * plotAreaWidth * THICKNESS_SAFETY)
    : SANKEY_NODE_THICKNESS;
  const scaledThickness = isNarrow
    ? Math.min(SANKEY_NODE_THICKNESS, Math.max(20, maxThickness))
    : SANKEY_NODE_THICKNESS;
  const scaledPad = isNarrow && plotAreaWidth != null
    ? Math.max(10, Math.round(SANKEY_NODE_PAD * Math.min(1, plotAreaWidth / 500)))
    : SANKEY_NODE_PAD;
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
                color: 'transparent',
                width: 0,
              },
              hoverinfo: 'none',
            },
            link: {
              source: chartData.source,
              target: chartData.target,
              value: chartData.value,
              color: chartData.linkColors,
              hoverinfo: 'none',
            },
          },
        ]}
        layout={{
          autosize: !isNarrow,
          width: isNarrow ? containerWidth : undefined,
          margin: {
            t: 8,
            r: scaledRightMargin,
            l: SANKEY_LEFT_MARGIN,
            b: 8,
          },
          font: {
            family: 'Source Sans Pro, Arial, sans-serif',
            size: scaledFontSize,
            color: colors.baseDarkest,
          },
          annotations: [
            {
              x: 0.1,
              y: 0.5,
              xref: 'paper',
              yref: 'paper',
              text: chartData.goalsAnnotationText,
              showarrow: false,
              xanchor: 'center',
              yanchor: 'middle',
              font: {
                family: 'Source Sans Pro, Arial, sans-serif',
                size: scaledFontSize,
                color: 'white',
              },
            },
          ],
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
