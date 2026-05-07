import PropTypes from 'prop-types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import colors from '../colors';

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

const GOALS_START_ID = 'goals_start';
const GOALS_START_LABEL = 'Goals Start';
const MIN_CHART_HEIGHT = 420;
const BASE_NODE_COUNT = 8;
const HEIGHT_PER_EXTRA_NODE = 28;
const NODE_PAD = 14;
const LABEL_OFFSET_X = 10;
const STATUS_LABEL_OFFSET_X = 24;
const SANKEY_LABEL_FONT_SIZE = 16;
const SANKEY_LABEL_FONT_FAMILY = 'Source Sans Pro, sans-serif';
const SANKEY_LABEL_TEXT_COLOR = '#000000';
const SANKEY_GOALS_LABEL_TEXT_COLOR = '#ffffff';
const SANKEY_GOALS_LABEL_STROKE_COLOR = 'rgba(0, 0, 0, 0.75)';
const SANKEY_GOALS_LABEL_STROKE_WIDTH = 1.75;
const SANKEY_GOALS_OVERLAY_LABEL_CLASS = 'ttahub-goals-link-label';
// Link width.
const SANKEY_MIN_VISUAL_LINK_VALUE = 10;
// Reason width.
const SANKEY_MIN_VISUAL_REASON_LINK_VALUE = 10;
const GOALS_START_NODE_INDEX = 0;
const GOALS_NODE_INDEX = 1;
const STATUS_ORDER = ['not started', 'in progress', 'closed', 'suspended'];
const GOALS_NODE_COLOR = colors.ttahubBlue;
const NOT_STARTED_NODE_COLOR = colors.ttahubSankeyOrange;
const IN_PROGRESS_NODE_COLOR = colors.ttahubSankeyMediumBlue;
const CLOSED_NODE_COLOR = colors.successDarkest;
const SUSPENDED_NODE_COLOR = colors.ttahubSankeyMagenta;

const nodeColorByStatusKey = {
  goals: GOALS_NODE_COLOR,
  'not started': NOT_STARTED_NODE_COLOR,
  'in progress': IN_PROGRESS_NODE_COLOR,
  closed: CLOSED_NODE_COLOR,
  suspended: SUSPENDED_NODE_COLOR,
};

const patternIdByStatusKey = {
  goals: 'ttahub-sankey-pattern-goals',
  'not started': 'ttahub-sankey-pattern-not-started',
  'in progress': 'ttahub-sankey-pattern-in-progress',
  closed: 'ttahub-sankey-pattern-closed',
  suspended: 'ttahub-sankey-pattern-suspended',
};

const getStatusKeyFromNodeId = (nodeId = '') => {
  if (typeof nodeId !== 'string' || !nodeId) {
    return null;
  }

  if (nodeId === GOALS_START_ID || nodeId === 'goals') {
    return 'goals';
  }

  if (nodeId.startsWith('status:')) {
    return nodeId.replace('status:', '').trim().toLowerCase();
  }

  if (nodeId.startsWith('reason:')) {
    return (nodeId.split(':')[1] || '').trim().toLowerCase();
  }

  return null;
};

const getNodeColorById = (nodeId = '') => {
  const statusKey = getStatusKeyFromNodeId(nodeId);
  return nodeColorByStatusKey[statusKey] || colors.baseMedium;
};

const getPatternIdByNodeId = (nodeId = '') => {
  const statusKey = getStatusKeyFromNodeId(nodeId);
  return patternIdByStatusKey[statusKey] || null;
};

const createPatternConfig = () => ([
  {
    id: patternIdByStatusKey.goals,
    width: 22,
    height: 22,
    baseColor: colors.ttahubGrayBlue,
    stripePath: 'M0 5 H22 M0 16 H22',
    stripeColor: 'rgba(255, 255, 255, 0.45)',
  },
  {
    id: patternIdByStatusKey['not started'],
    width: 8,
    height: 8,
    baseColor: NOT_STARTED_NODE_COLOR,
  },
  {
    id: patternIdByStatusKey['in progress'],
    width: 22,
    height: 22,
    baseColor: IN_PROGRESS_NODE_COLOR,
    stripePath: 'M0 0 H22 M0 11 H22 M0 0 V22 M11 0 V22',
    stripeColor: 'rgba(255, 255, 255, 0.35)',
  },
  {
    id: patternIdByStatusKey.closed,
    width: 10,
    height: 10,
    baseColor: CLOSED_NODE_COLOR,
    stripePath: 'M-2 2 L2 -2 M0 10 L10 0 M8 12 L12 8',
    stripeColor: 'rgba(255, 255, 255, 0.45)',
  },
  {
    id: patternIdByStatusKey.suspended,
    width: 8,
    height: 8,
    baseColor: SUSPENDED_NODE_COLOR,
    stripePath: 'M1 0 V8 M5 0 V8',
    stripeColor: 'rgba(255, 255, 255, 0.5)',
  },
]);

const ensureSankeyPatterns = (svg) => {
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
    if (defs.querySelector(`#${patternConfig.id}`)) {
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
};

const applyPatternFill = (element, patternId) => {
  if (!element || !patternId) {
    return;
  }

  const fill = `url(#${patternId})`;
  const existingStyle = element.getAttribute('style') || '';
  element.setAttribute('fill', fill);

  const cleanedStyle = existingStyle
    .replace(/fill:\s*[^;]+;?/gi, '')
    .replace(/stroke:\s*[^;]+;?/gi, '')
    .replace(/shape-rendering:\s*[^;]+;?/gi, '')
    .trim();
  element.setAttribute(
    'style',
    `${cleanedStyle}${cleanedStyle ? ';' : ''}fill: ${fill}; stroke: none; shape-rendering: geometricPrecision;`
  );
  element.setAttribute('shape-rendering', 'geometricPrecision');
};

const applySankeyLinkPatterns = (container, linkPatternIds = []) => {
  if (!container || !linkPatternIds.length) {
    return;
  }

  const svg = container.querySelector('svg.main-svg');
  if (!svg) {
    return;
  }

  ensureSankeyPatterns(svg);
  const linkShapes = svg.querySelectorAll('.sankey-link, .sankey-links path, path.sankey-link');
  linkShapes.forEach((shape, index) => {
    applyPatternFill(shape, linkPatternIds[index]);
  });
};

const applySankeyNodeLabelPlacement = (
  container,
  goalsLabelTopLine = ''
) => {
  if (!container) {
    return;
  }

  const svg = container.querySelector('svg.main-svg');
  if (!svg) {
    return;
  }

  const nodeGroups = svg.querySelectorAll('g.sankey-node');
  const goalsStartGroup = nodeGroups[GOALS_START_NODE_INDEX];
  const goalsStartRect = goalsStartGroup?.querySelector('rect.node-rect, rect');
  const linkShapes = svg.querySelectorAll('.sankey-link, .sankey-links path, path.sankey-link');
  const goalsStartLinkShape = linkShapes[0];

  const goalsStartRectX = Number(goalsStartRect?.getAttribute('x'));
  const goalsStartRectWidth = Number(goalsStartRect?.getAttribute('width'));
  const goalsStartRectY = Number(goalsStartRect?.getAttribute('y'));
  const goalsStartRectHeight = Number(goalsStartRect?.getAttribute('height'));

  nodeGroups.forEach((nodeGroup, index) => {
    const nodeRect = nodeGroup.querySelector('rect.node-rect, rect');
    const label = nodeGroup.querySelector('text.node-label, text');

    if (!nodeRect || !label) {
      return;
    }

    const rectX = Number(nodeRect.getAttribute('x'));
    const rectWidth = Number(nodeRect.getAttribute('width'));
    const rectY = Number(nodeRect.getAttribute('y'));
    const rectHeight = Number(nodeRect.getAttribute('height'));

    if (!Number.isFinite(rectX) || !Number.isFinite(rectWidth)) {
      return;
    }

    if (index === GOALS_NODE_INDEX) {
      // Hide Plotly's native goals-node label and draw a dedicated overlay label
      // in SVG coordinates so it reliably stays on the goals_start->goals link.
      label.setAttribute('opacity', '0');

      const goalsNodeLeftX = rectX;
      const goalsLinkStartX = Number.isFinite(goalsStartRectX) && Number.isFinite(goalsStartRectWidth)
        ? goalsStartRectX + goalsStartRectWidth
        : goalsNodeLeftX;
      let goalsLabelX = goalsLinkStartX + (goalsNodeLeftX - goalsLinkStartX) / 2;
      const goalsStartCenterY = Number.isFinite(goalsStartRectY) && Number.isFinite(goalsStartRectHeight)
        ? goalsStartRectY + goalsStartRectHeight / 2
        : Number.NaN;
      const goalsNodeCenterY = Number.isFinite(rectY) && Number.isFinite(rectHeight)
        ? rectY + rectHeight / 2
        : Number.NaN;
      let goalsLabelCenterY = Number.isFinite(goalsStartCenterY) && Number.isFinite(goalsNodeCenterY)
        ? (goalsStartCenterY + goalsNodeCenterY) / 2
        : (Number.isFinite(goalsNodeCenterY) ? goalsNodeCenterY : goalsStartCenterY);

      if (goalsStartLinkShape && typeof goalsStartLinkShape.getBBox === 'function') {
        try {
          const linkBox = goalsStartLinkShape.getBBox();
          goalsLabelX = linkBox.x + linkBox.width / 2;
          goalsLabelCenterY = linkBox.y + linkBox.height / 2;
        } catch (e) {
          // Fall back to node-derived midpoint when SVG path metrics are unavailable.
        }
      }

      const goalsTspans = label.querySelectorAll('tspan');
      const fallbackLineOne = (goalsTspans[0]?.textContent || '').trim();
      const overlayLineOne = goalsLabelTopLine || fallbackLineOne;
      const overlayLineTwo = 'Goals';
      let overlayLabel = svg.querySelector(`text.${SANKEY_GOALS_OVERLAY_LABEL_CLASS}`);
      if (!overlayLabel) {
        overlayLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        overlayLabel.classList.add(SANKEY_GOALS_OVERLAY_LABEL_CLASS);
        svg.appendChild(overlayLabel);
      }

      overlayLabel.setAttribute('x', `${goalsLabelX}`);
      overlayLabel.setAttribute('text-anchor', 'middle');
      overlayLabel.setAttribute('font-size', `${SANKEY_LABEL_FONT_SIZE}`);
      overlayLabel.setAttribute('font-family', SANKEY_LABEL_FONT_FAMILY);
      overlayLabel.setAttribute('fill', SANKEY_GOALS_LABEL_TEXT_COLOR);
      overlayLabel.setAttribute('stroke', SANKEY_GOALS_LABEL_STROKE_COLOR);
      overlayLabel.setAttribute('stroke-width', `${SANKEY_GOALS_LABEL_STROKE_WIDTH}`);
      overlayLabel.setAttribute('paint-order', 'stroke');
      overlayLabel.textContent = '';

      if (Number.isFinite(goalsLabelCenterY)) {
        const firstLineY = goalsLabelCenterY - 6;
        const secondLineY = firstLineY + SANKEY_LABEL_FONT_SIZE + 4;

        const overlayTspanOne = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        overlayTspanOne.setAttribute('x', `${goalsLabelX}`);
        overlayTspanOne.setAttribute('y', `${firstLineY}`);
        overlayTspanOne.setAttribute('font-weight', '700');
        overlayTspanOne.textContent = overlayLineOne;
        overlayLabel.appendChild(overlayTspanOne);

        if (overlayLineTwo) {
          const overlayTspanTwo = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          overlayTspanTwo.setAttribute('x', `${goalsLabelX}`);
          overlayTspanTwo.setAttribute('y', `${secondLineY}`);
          overlayTspanTwo.setAttribute('font-weight', '700');
          overlayTspanTwo.textContent = overlayLineTwo;
          overlayLabel.appendChild(overlayTspanTwo);
        }
      }

      // Keep overlay label on top of all sankey paint.
      svg.appendChild(overlayLabel);
      return;
    }

    const tspans = label.querySelectorAll('tspan');
    const labelType = (tspans[1]?.textContent || '').trim().toLowerCase();
    const isStatusLabel = STATUS_ORDER.includes(labelType);
    const horizontalOffset = isStatusLabel ? STATUS_LABEL_OFFSET_X : LABEL_OFFSET_X;
    const labelX = rectX + rectWidth + horizontalOffset;
    label.setAttribute('x', `${labelX}`);
    label.setAttribute('text-anchor', 'start');
    label.setAttribute('font-size', `${SANKEY_LABEL_FONT_SIZE}`);
    label.setAttribute('font-family', SANKEY_LABEL_FONT_FAMILY);
    label.setAttribute('fill', SANKEY_LABEL_TEXT_COLOR);

    tspans.forEach((tspan) => {
      tspan.setAttribute('x', `${labelX}`);
      tspan.setAttribute('font-size', `${SANKEY_LABEL_FONT_SIZE}`);
      tspan.setAttribute('font-family', SANKEY_LABEL_FONT_FAMILY);
      tspan.setAttribute('fill', SANKEY_LABEL_TEXT_COLOR);
    });

  });
};

const statusOrderIndex = STATUS_ORDER.reduce((acc, status, index) => {
  acc[status] = index;
  return acc;
}, {});

const getStatusSortIndex = (nodeId = '') => {
  if (typeof nodeId !== 'string' || !nodeId.startsWith('status:')) {
    return Number.POSITIVE_INFINITY;
  }

  const normalizedStatus = nodeId.replace('status:', '').trim().toLowerCase();
  return typeof statusOrderIndex[normalizedStatus] === 'number'
    ? statusOrderIndex[normalizedStatus]
    : Number.POSITIVE_INFINITY;
};

const getDistributedY = (index, total) => {
  if (total <= 1) {
    return 0.5;
  }

  const margin = 0.08;
  const span = 1 - margin * 2;
  return Number((margin + (span * index) / (total - 1)).toFixed(4));
};

const getPercentLabel = (node, totalGoalsValue) => {
  if (node?.id === GOALS_START_ID) {
    return null;
  }

  if (node?.id === 'goals') {
    return totalGoalsValue > 0 ? '100.00' : '0.00';
  }

  const nodePercent = Number(node?.percentage);
  if (Number.isFinite(nodePercent)) {
    return nodePercent.toFixed(2);
  }

  const nodeCount = Number(node?.count);
  if (totalGoalsValue > 0 && Number.isFinite(nodeCount)) {
    return ((nodeCount / totalGoalsValue) * 100).toFixed(2);
  }

  return '0.00';
};

const getNodeLabel = (node, totalGoalsValue) => {
  if (node?.id === GOALS_START_ID) {
    return '';
  }

  const count = Number(node?.count);
  const formattedCount = Number.isFinite(count) ? count : 0;
  const percentLabel = getPercentLabel(node, totalGoalsValue);
  const textLabel = node?.label || node?.id || '';

  return `<b>${formattedCount} (${percentLabel}%)</b><br>${textLabel}`;
};

const getGoalsTopLineFromLabel = (label = '') => {
  if (typeof label !== 'string' || !label) {
    return '';
  }

  const noHtml = label
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
  return (noHtml.split('\n')[0] || '').trim();
};

const getMinimumVisualValueForLink = (link) => {
  if (typeof link?.target === 'string' && link.target.startsWith('reason:')) {
    return SANKEY_MIN_VISUAL_REASON_LINK_VALUE;
  }

  return SANKEY_MIN_VISUAL_LINK_VALUE;
};

const isReasonLink = (link) => typeof link?.target === 'string' && link.target.startsWith('reason:');

const getVisualLinkValues = (links = []) => {
  if (!links.length) {
    return [];
  }

  const linksBySource = links.reduce((acc, link, index) => {
    const sourceKey = link?.source || `unknown-${index}`;
    if (!acc[sourceKey]) {
      acc[sourceKey] = [];
    }
    acc[sourceKey].push({ link, index });
    return acc;
  }, {});

  const visualValues = new Array(links.length).fill(0);

  Object.values(linksBySource).forEach((entries) => {
    const originalTotal = entries.reduce((sum, entry) => sum + Number(entry.link.value || 0), 0);
    if (originalTotal <= 0) {
      entries.forEach(({ index }) => {
        visualValues[index] = 0;
      });
      return;
    }

    const floors = entries.map(({ link }) => {
      const baseMin = getMinimumVisualValueForLink(link);

      // Keep non-reason floors feasible to reduce abrupt transitions, but allow
      // reason links to honor their dedicated minimum directly.
      if (isReasonLink(link)) {
        return baseMin;
      }

      return Math.min(baseMin, originalTotal / entries.length);
    });

    const raised = entries.map(({ link }, idx) => Math.max(Number(link.value || 0), floors[idx]));
    const raisedTotal = raised.reduce((sum, value) => sum + value, 0);

    if (raisedTotal <= originalTotal) {
      entries.forEach(({ index }, idx) => {
        visualValues[index] = raised[idx];
      });
      return;
    }

    const floorTotal = floors.reduce((sum, value) => sum + value, 0);
    const stretchTotal = raised.reduce((sum, value, idx) => sum + (value - floors[idx]), 0);
    const remainingAboveFloor = Math.max(0, originalTotal - floorTotal);
    const scale = stretchTotal > 0 ? remainingAboveFloor / stretchTotal : 0;

    entries.forEach(({ index }, idx) => {
      visualValues[index] = floors[idx] + (raised[idx] - floors[idx]) * scale;
    });
  });

  return visualValues;
};

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

  const chartData = useMemo(() => {
    const inputNodes = sankey?.nodes || [];
    const inputLinks = sankey?.links || [];

    if (!inputNodes.length) {
      return null;
    }

    const goalsNode = inputNodes.find((node) => node?.id === 'goals');
    if (!goalsNode) {
      return null;
    }

    const totalGoalsValue = Number.isFinite(Number(goalsNode?.count))
      ? Number(goalsNode.count)
      : 0;

    const otherNodes = inputNodes
      .map((node, originalIndex) => ({ node, originalIndex }))
      .filter(({ node }) => node?.id !== 'goals')
      .sort((a, b) => {
        const aStatusIndex = getStatusSortIndex(a.node?.id);
        const bStatusIndex = getStatusSortIndex(b.node?.id);

        if (aStatusIndex !== bStatusIndex) {
          return aStatusIndex - bStatusIndex;
        }

        return a.originalIndex - b.originalIndex;
      })
      .map(({ node }) => node);
    const chartNodes = [
      { id: GOALS_START_ID, label: GOALS_START_LABEL },
      goalsNode,
      ...otherNodes,
    ];

    const nodeIndexById = chartNodes.reduce((acc, node, index) => {
      acc[node.id] = index;
      return acc;
    }, {});

    const syntheticStartLink = {
      source: GOALS_START_ID,
      target: 'goals',
      value: totalGoalsValue,
    };

    const visibleLinks = [syntheticStartLink]
      .concat(inputLinks)
      .map((link) => ({
        source: link?.source,
        target: link?.target,
        value: Number(link?.value),
      }))
      .filter(
        (link) =>
          link.source &&
          link.target &&
          Number.isFinite(link.value) &&
          link.value > 0 &&
          typeof nodeIndexById[link.source] !== 'undefined' &&
          typeof nodeIndexById[link.target] !== 'undefined'
      )
      .sort((a, b) => {
        const isSyntheticLink = (link) => link.source === GOALS_START_ID && link.target === 'goals';

        if (isSyntheticLink(a) && !isSyntheticLink(b)) return -1;
        if (!isSyntheticLink(a) && isSyntheticLink(b)) return 1;

        const sourceOrder = nodeIndexById[a.source] - nodeIndexById[b.source];
        if (sourceOrder !== 0) {
          return sourceOrder;
        }

        const targetOrder = nodeIndexById[a.target] - nodeIndexById[b.target];
        if (targetOrder !== 0) {
          return targetOrder;
        }

        return 0;
      });

    if (!visibleLinks.length) {
      return null;
    }

    const statusNodeIds = chartNodes
      .filter((node) => typeof node?.id === 'string' && node.id.startsWith('status:'))
      .map((node) => node.id);

    const nonStatusNodeIds = chartNodes
      .filter((node) => {
        if (typeof node?.id !== 'string') {
          return false;
        }

        if (node.id === GOALS_START_ID || node.id === 'goals') {
          return false;
        }

        return !node.id.startsWith('status:');
      })
      .map((node) => node.id);

    const nodePositionById = chartNodes.reduce((acc, node) => {
      if (node.id === GOALS_START_ID) {
        acc[node.id] = { x: 0.01, y: 0.5 };
        return acc;
      }

      if (node.id === 'goals') {
        acc[node.id] = { x: 0.2, y: 0.5 };
        return acc;
      }

      const statusIndex = statusNodeIds.indexOf(node.id);
      if (statusIndex >= 0) {
        acc[node.id] = { x: 0.45, y: getDistributedY(statusIndex, statusNodeIds.length) };
        return acc;
      }

      const nonStatusIndex = nonStatusNodeIds.indexOf(node.id);
      acc[node.id] = { x: 0.78, y: getDistributedY(nonStatusIndex, nonStatusNodeIds.length) };
      return acc;
    }, {});

    return {
      labels: chartNodes.map((node) => getNodeLabel(node, totalGoalsValue)),
      nodeColors: chartNodes.map((node) => {
        if (node?.id === GOALS_START_ID || node?.id === 'goals') {
          return GOALS_NODE_COLOR;
        }

        return getNodeColorById(node?.id);
      }),
      x: chartNodes.map((node) => nodePositionById[node.id]?.x ?? 0.78),
      y: chartNodes.map((node) => nodePositionById[node.id]?.y ?? 0.5),
      source: visibleLinks.map((link) => nodeIndexById[link.source]),
      target: visibleLinks.map((link) => nodeIndexById[link.target]),
      // Plotly Sankey sizes the flow by value; this preserves each source total
      // while lifting tiny links for readability.
      value: getVisualLinkValues(visibleLinks),
      linkColors: visibleLinks.map((link) => getNodeColorById(link.target)),
      linkPatternIds: visibleLinks.map((link) => getPatternIdByNodeId(link.target)),
    };
  }, [sankey]);

  const applyPatterns = useCallback(() => {
    const goalsLabelTopLine = getGoalsTopLineFromLabel(chartData?.labels?.[GOALS_NODE_INDEX]);
    applySankeyLinkPatterns(chartRef.current, chartData?.linkPatternIds || []);
    applySankeyNodeLabelPlacement(
      chartRef.current,
      goalsLabelTopLine
    );
  }, [chartData]);

  useEffect(() => {
    if (!chartData) {
      return undefined;
    }

    const rafId = window.requestAnimationFrame(() => {
      const goalsLabelTopLine = getGoalsTopLineFromLabel(chartData?.labels?.[GOALS_NODE_INDEX]);
      applySankeyLinkPatterns(chartRef.current, chartData.linkPatternIds || []);
      applySankeyNodeLabelPlacement(
        chartRef.current,
        goalsLabelTopLine
      );
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [chartData]);

  if (!chartData) {
    return <p className="usa-prose margin-top-2">No goal status data found.</p>;
  }

  if (!PlotComponent) {
    return null;
  }

  const baseHeight =
    MIN_CHART_HEIGHT +
    Math.max(0, chartData.labels.length - BASE_NODE_COUNT) * HEIGHT_PER_EXTRA_NODE;
  const chartHeight = baseHeight;

  return (
    <div
      className={`ttahub-goal-sankey ${className}`}
      data-testid="goal-status-reason-sankey"
      ref={chartRef}
      style={{ minHeight: `${chartHeight}px` }}
    >
      <PlotComponent
        data={[
          {
            type: 'sankey',
            arrangement: 'snap',
            node: {
              label: chartData.labels,
              color: chartData.nodeColors,
              x: chartData.x,
              y: chartData.y,
              pad: NODE_PAD,
              textfont: {
                family: SANKEY_LABEL_FONT_FAMILY,
                size: SANKEY_LABEL_FONT_SIZE,
                color: SANKEY_LABEL_TEXT_COLOR,
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
          height: chartHeight,
          hovermode: false,
          margin: {
            t: 0,
            r: 16,
            l: 16,
            b: 8,
          },
        }}
        style={{ width: '100%', height: `${chartHeight}px` }}
        config={{
          displayModeBar: false,
          responsive: true,
          staticPlot: true,
        }}
        onInitialized={applyPatterns}
        onUpdate={applyPatterns}
        onAfterPlot={applyPatterns}
      />
    </div>
  );
}

GoalStatusReasonSankey.propTypes = {
  className: PropTypes.string,
  sankey: PropTypes.shape({
    nodes: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string,
        count: PropTypes.number,
        percentage: PropTypes.number,
      })
    ),
    links: PropTypes.arrayOf(
      PropTypes.shape({
        source: PropTypes.string,
        target: PropTypes.string,
        value: PropTypes.number,
      })
    ),
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
