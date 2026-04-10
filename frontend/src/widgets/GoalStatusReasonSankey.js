import React, {
  useMemo,
  useCallback,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js/lib/core';
import Sankey from 'plotly.js/lib/sankey';
import colors from '../colors';

Plotly.register([Sankey]);

const Plot = createPlotlyComponent(Plotly);

const STATUS_NODE_IDS = [
  'status:Not Started',
  'status:In Progress',
  'status:Closed',
  'status:Suspended',
];

// Returns { [statusId]: { top, center, bottom } } in normalized Y coords.
function computeStatusNodeYBounds(nodeById, maxReasonGroupSize = 1) {
  const relevantNodes = STATUS_NODE_IDS.filter((id) => nodeById[id]);
  const totalCount = relevantNodes.reduce((sum, id) => sum + (nodeById[id]?.count || 0), 0);

  const BUFFER = 0.04;
  // BASE_PAD_FRAC estimates the Y fraction consumed per gap by Plotly's
  // node pad pixels (~30px / 470px chart).
  const BASE_PAD_FRAC = 0.064;
  // As reason groups grow, add extra vertical room between status bands so
  // dense reason links are less likely to overlap neighboring labels.
  const densityGapBoost = Math.min(0.05, Math.max(0, maxReasonGroupSize - 1) * 0.015);
  const EXTRA_GAP_AFTER = {
    'status:Not Started': 0.03,
    'status:In Progress': 0.012 + densityGapBoost,
    'status:Closed': 0.012 + densityGapBoost,
  };
  const totalGapFrac = relevantNodes
    .slice(0, -1)
    .reduce((sum, id) => sum + BASE_PAD_FRAC + (EXTRA_GAP_AFTER[id] || 0), 0);
  const usable = 1 - 2 * BUFFER - totalGapFrac;

  let cumulative = BUFFER;
  const bounds = {};
  relevantNodes.forEach((id, index) => {
    const pct = totalCount > 0 ? (nodeById[id].count / totalCount) : (1 / relevantNodes.length);
    const height = pct * usable;
    bounds[id] = { top: cumulative, center: cumulative + height / 2, bottom: cumulative + height };
    const isLast = index === relevantNodes.length - 1;
    const gapAfter = isLast ? 0 : (BASE_PAD_FRAC + (EXTRA_GAP_AFTER[id] || 0));
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

  // ~42px on a 700px chart — enough for a 2-line label.
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
  goals: colors.ttahubBlue,
  'status:Not Started': colors.ttahubOrange,
  'status:In Progress': colors.ttahubMediumBlue,
  'status:Closed': colors.success,
  'status:Suspended': colors.errorDark,
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
    baseColor: colors.ttahubBlue,
    stripePath: 'M0 1 H8 M0 5 H8',
    stripeColor: 'rgba(255, 255, 255, 0.45)',
  },
  {
    id: patternIdByNodeId['status:Not Started'],
    width: 8,
    height: 8,
    baseColor: colors.ttahubOrange,
    stripePath: '',
    stripeColor: '',
  },
  {
    id: patternIdByNodeId['status:In Progress'],
    width: 8,
    height: 8,
    baseColor: colors.ttahubMediumBlue,
    stripePath: 'M0 0 H8 M0 4 H8 M0 0 V8 M4 0 V8',
    stripeColor: 'rgba(255, 255, 255, 0.35)',
  },
  {
    id: patternIdByNodeId['status:Closed'],
    width: 10,
    height: 10,
    baseColor: colors.success,
    stripePath: 'M-2 2 L2 -2 M0 10 L10 0 M8 12 L12 8',
    stripeColor: 'rgba(255, 255, 255, 0.45)',
  },
  {
    id: patternIdByNodeId['status:Suspended'],
    width: 8,
    height: 8,
    baseColor: colors.errorDark,
    stripePath: 'M1 0 V8 M5 0 V8',
    stripeColor: 'rgba(255, 255, 255, 0.5)',
  },
]);

function ensureSankeyPatterns(svg) {
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

function getBaseNodeShape(group) {
  if (!group) {
    return null;
  }

  const preferred = group.querySelector('.node-rect');
  if (preferred) {
    return preferred;
  }

  return Array.from(group.querySelectorAll('rect, path')).find((el) => !el.classList.contains('ttahub-border-overlay')) || null;
}

function applyGoalsLeftBorder(svg) {
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
  leftBorder.setAttribute('width', '24');
  leftBorder.setAttribute('height', `${height}`);
  leftBorder.setAttribute('class', 'ttahub-border-overlay');
  leftBorder.setAttribute('style', `fill: ${colors.ttahubBlue}; fill-opacity: 1; stroke: none; pointer-events: none;`);
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
  rightBorder.setAttribute('style', `fill: ${colors.ttahubMediumBlue}; fill-opacity: 1; stroke: none; pointer-events: none;`);
  if (!existingRight) {
    goalsNodeGroup.appendChild(rightBorder);
  } else {
    existingRight.setAttribute('x', `${width - 12}`);
    existingRight.setAttribute('height', `${height}`);
  }
}

function applyStatusRightBorders(svg, chartData) {
  if (!svg || !chartData) {
    return;
  }

  const nodeGroups = Array.from(svg.querySelectorAll('g.sankey-node'));
  const namespace = 'http://www.w3.org/2000/svg';

  nodeGroups.slice(1, 1 + chartData.statusNodeCount).forEach((group, i) => {
    const color = chartData.nodeColors[i + 1];
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

function applyReasonNodeBorders(svg, chartData) {
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

function applyPatternFill(element, patternId) {
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

function makeLabelText(namespace, nodeData, x, yLine1, yLine2) {
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

function applyStatusLabels(svg, chartData) {
  if (!svg || !chartData) {
    return;
  }

  const namespace = 'http://www.w3.org/2000/svg';
  const nodeGroups = Array.from(svg.querySelectorAll('g.sankey-node'));

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
      // Place label above the flow line in the flat stretch before the reason fork.
      // Find the reason node x so we can position the label partway along the line.
      const firstReasonIdx = chartData.reasonGroupsByStatus?.[nodeData.id];
      let labelX = bbox.x + bbox.width + GAP;
      if (firstReasonIdx !== undefined) {
        const reasonGroup = nodeGroups[firstReasonIdx];
        if (reasonGroup) {
          const reasonRect = getBaseNodeShape(reasonGroup);
          if (reasonRect) {
            const rbox = reasonRect.getBBox();
            // Position ~30% of the way from status bar to reason node.
            labelX = bbox.x + bbox.width + (rbox.x - bbox.x - bbox.width) * 0.3;
          }
        }
      }
      // Keep two-line labels just above the outgoing flow line.
      const LABEL_DOWN_SHIFT = 4;
      const labelBaseY = bbox.y - GAP + LABEL_DOWN_SHIFT;
      group.appendChild(makeLabelText(
        namespace, nodeData,
        labelX,
        labelBaseY - 16,
        labelBaseY,
      ));
      return;
    }
    // Place label above the node top edge — matches the design for thin nodes
    // like Not Started where a vertically-centered side label would be cramped.
    const labelBaseY = bbox.y - GAP;
    group.appendChild(makeLabelText(
      namespace, nodeData,
      bbox.x + bbox.width + GAP,
      labelBaseY - 16,
      labelBaseY,
    ));
  });
}

function parsePathPoints(d) {
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

function applyCustomLinkPaths(svg, chartData) {
  if (!svg || !chartData) return;

  const linkShapes = Array.from(
    svg.querySelectorAll('.sankey-link, .sankey-links path, path.sankey-link'),
  );

  // Parse all paths, filtering out unparseable ones.
  const parsedLinks = linkShapes
    .map((shape) => ({ shape, pts: parsePathPoints(shape.getAttribute('d') || '') }))
    .filter(({ pts }) => pts !== null);

  if (!parsedLinks.length) return;

  // Identify goals→status links by matching their source X to the goals node's right edge.
  // This is explicit and not dependent on the relative ordering of link columns.
  const goalsNodeGroup = svg.querySelector('g.sankey-node');
  const goalsNodeRect = goalsNodeGroup ? getBaseNodeShape(goalsNodeGroup) : null;
  let goalsToStatusLinks;
  if (goalsNodeRect) {
    const goalsRightEdge = goalsNodeRect.getBBox().x + goalsNodeRect.getBBox().width;
    // Allow a small tolerance for sub-pixel rendering differences.
    goalsToStatusLinks = parsedLinks.filter(({ pts }) => Math.abs(pts.sx - goalsRightEdge) < 2);
  } else {
    // Fallback: use midpoint heuristic if goals node can't be found in the DOM.
    const sxValues = parsedLinks.map(({ pts }) => pts.sx);
    const sxMid = (Math.min(...sxValues) + Math.max(...sxValues)) / 2;
    goalsToStatusLinks = parsedLinks.filter(({ pts }) => pts.sx <= sxMid);
  }

  if (!goalsToStatusLinks.length) return;

  // The "Not Started" link exits from the very top of the goals node, making it
  // the topmost goals→status link (smallest top Y coordinate).
  const topmost = goalsToStatusLinks.reduce((best, cur) => {
    const curTop = Math.min(cur.pts.sy1, cur.pts.sy2);
    const bestTop = Math.min(best.pts.sy1, best.pts.sy2);
    return curTop < bestTop ? cur : best;
  });

  // Only treat topmost as the flat "Not Started" link when Not Started is in the data.
  const hasNotStarted = chartData.notStartedLinkIndex !== -1;

  const goalsToStatusShapes = new Set(goalsToStatusLinks.map(({ shape }) => shape));

  parsedLinks.forEach(({ shape, pts }) => {
    const {
      sx, sy1, tx, ty1, ty2, sy2,
    } = pts;
    const isGoalsToStatus = goalsToStatusShapes.has(shape);
    if (!isGoalsToStatus) return; // status→reason: leave Plotly's default curves untouched

    const isNotStarted = hasNotStarted && shape === topmost.shape;

    if (isNotStarted) {
      // Straight horizontal rectangle — no curve
      shape.setAttribute('d', `M ${sx} ${sy1} L ${tx} ${ty1} L ${tx} ${ty2} L ${sx} ${sy2} Z`);
    } else {
      // Gradual curve: extends horizontally from source before bending downward
      const cx1 = sx + (tx - sx) * 0.75; // hold source Y for 75% of X travel
      const cx2 = tx - (tx - sx) * 0.25; // enter target Y in the last 25%
      shape.setAttribute(
        'd',
        `M ${sx} ${sy1} C ${cx1} ${sy1} ${cx2} ${ty1} ${tx} ${ty1} L ${tx} ${ty2} C ${cx2} ${ty2} ${cx1} ${sy2} ${sx} ${sy2} Z`,
      );
    }
  });
}

function applySankeyPatterns(container, chartData) {
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

function getNodeColor(node) {
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

  const chartRenderKey = useMemo(() => {
    const nodes = sankey?.nodes || [];
    const links = sankey?.links || [];
    return JSON.stringify({
      nodes: nodes.map((n) => [n.id, n.count, n.percentage]),
      links: links.map((l) => [l.source, l.target, l.value]),
    });
  }, [sankey]);

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

    const statusYBounds = computeStatusNodeYBounds(nodeById, maxReasonGroupSize);
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
      nodeColors: nodes.map(getNodeColor),
      nodePatternIds: nodes.map((node) => {
        if (patternIdByNodeId[node.id]) return patternIdByNodeId[node.id];
        // Reason nodes inherit their parent status pattern.
        const parentId = `status:${node.id.split(':')[1]}`;
        return patternIdByNodeId[parentId] || null;
      }),
      nodeX,
      nodeY,
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
      rightMargin: Math.min(560, 380 + Math.max(0, maxReasonGroupSize - 1) * 36),
      notStartedLinkIndex: visibleLinks.findIndex((l) => l.target === 'status:Not Started'),
      reasonNodeBorderColors: reasonNodes.map((node) => {
        if (node.id.startsWith('reason:Closed:')) return colors.success;
        if (node.id.startsWith('reason:Suspended:')) return colors.errorDark;
        return null;
      }),
    };
  }, [sankey]);

  const applyPatterns = useCallback(() => {
    schedulePatternApply(chartRef.current, chartData);
  }, [chartData]);

  if (!chartData) {
    return <p className="usa-prose margin-top-2">No goal status data found.</p>;
  }

  return (
    <div className={`ttahub-goal-sankey ${className}`} data-testid="goal-status-reason-sankey" ref={chartRef}>
      <Plot
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
              pad: 30,
              thickness: 220,
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
          autosize: true,
          margin: {
            t: 8,
            r: chartData.rightMargin,
            l: 16,
            b: 8,
          },
          font: {
            family: 'Source Sans Pro, Arial, sans-serif',
            size: 16,
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
                size: 16,
                color: 'white',
              },
            },
          ],
          hovermode: false,
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
        }}
        style={{ width: '100%', height: '700px' }}
        config={{
          displayModeBar: false,
          responsive: true,
        }}
        onInitialized={applyPatterns}
        onUpdate={applyPatterns}
        onAfterPlot={applyPatterns}
        onRelayout={applyPatterns}
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
