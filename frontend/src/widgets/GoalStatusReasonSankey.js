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
    width: 8,
    height: 8,
    baseColor: colors.ttahubGrayBlue,
    stripePath: 'M0 1 H8 M0 5 H8',
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
    width: 8,
    height: 8,
    baseColor: IN_PROGRESS_NODE_COLOR,
    stripePath: 'M0 0 H8 M0 4 H8 M0 0 V8 M4 0 V8',
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
    .trim();
  element.setAttribute('style', `${cleanedStyle}${cleanedStyle ? ';' : ''}fill: ${fill}; stroke: none;`);
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

const applySankeyNodeLabelPlacement = (container) => {
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

  const goalsStartRectX = Number(goalsStartRect?.getAttribute('x'));
  const goalsStartRectWidth = Number(goalsStartRect?.getAttribute('width'));

  nodeGroups.forEach((nodeGroup, index) => {
    const nodeRect = nodeGroup.querySelector('rect.node-rect, rect');
    const label = nodeGroup.querySelector('text.node-label, text');

    if (!nodeRect || !label) {
      return;
    }

    const rectX = Number(nodeRect.getAttribute('x'));
    const rectWidth = Number(nodeRect.getAttribute('width'));

    if (!Number.isFinite(rectX) || !Number.isFinite(rectWidth)) {
      return;
    }

    if (index === GOALS_NODE_INDEX) {
      const goalsNodeLeftX = rectX;
      const goalsLinkStartX = Number.isFinite(goalsStartRectX) && Number.isFinite(goalsStartRectWidth)
        ? goalsStartRectX + goalsStartRectWidth
        : goalsNodeLeftX;
      const goalsLabelX = goalsLinkStartX + (goalsNodeLeftX - goalsLinkStartX) / 2;
      label.setAttribute('x', `${goalsLabelX}`);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', 'white');

      const goalsTspans = label.querySelectorAll('tspan');
      goalsTspans.forEach((tspan) => {
        tspan.setAttribute('x', `${goalsLabelX}`);
        tspan.setAttribute('fill', 'white');
      });

      // Keep the label as the top-most node child so it draws above the node/link paint.
      nodeGroup.appendChild(label);
      return;
    }

    const labelX = rectX + rectWidth + LABEL_OFFSET_X;
    label.setAttribute('x', `${labelX}`);
    label.setAttribute('text-anchor', 'start');

    const tspans = label.querySelectorAll('tspan');
    tspans.forEach((tspan) => {
      tspan.setAttribute('x', `${labelX}`);
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

  return `${formattedCount} (${percentLabel}%)<br>${textLabel}`;
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
      value: visibleLinks.map((link) => link.value),
      linkColors: visibleLinks.map((link) => getNodeColorById(link.target)),
      linkPatternIds: visibleLinks.map((link) => getPatternIdByNodeId(link.target)),
    };
  }, [sankey]);

  const applyPatterns = useCallback(() => {
    applySankeyLinkPatterns(chartRef.current, chartData?.linkPatternIds || []);
    applySankeyNodeLabelPlacement(chartRef.current);
  }, [chartData]);

  useEffect(() => {
    if (!chartData) {
      return undefined;
    }

    const rafId = window.requestAnimationFrame(() => {
      applySankeyLinkPatterns(chartRef.current, chartData.linkPatternIds || []);
      applySankeyNodeLabelPlacement(chartRef.current);
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
