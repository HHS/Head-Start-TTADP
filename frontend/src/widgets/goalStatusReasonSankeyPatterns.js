import colors from '../colors';

const GOALS_NODE_COLOR = colors.ttahubBlue;
const NOT_STARTED_NODE_COLOR = colors.ttahubSankeyOrange;
const NOT_STARTED_LINK_COLOR = colors.ttahubOrangeMedium;
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

const createPatternConfig = () => [
  {
    id: patternIdByStatusKey.goals,
    statusKey: 'goals',
    width: 22,
    height: 22,
    baseColor: colors.ttahubGrayBlue,
    stripePath: 'M0 5 H22 M0 16 H22',
    stripeColor: 'rgba(255, 255, 255, 0.45)',
  },
  {
    id: patternIdByStatusKey['not started'],
    statusKey: 'not started',
    width: 8,
    height: 8,
    baseColor: NOT_STARTED_LINK_COLOR,
  },
  {
    id: patternIdByStatusKey['in progress'],
    statusKey: 'in progress',
    width: 22,
    height: 22,
    baseColor: IN_PROGRESS_NODE_COLOR,
    stripePath: 'M0 0 H22 M0 11 H22 M0 0 V22 M11 0 V22',
    stripeColor: 'rgba(255, 255, 255, 0.35)',
  },
  {
    id: patternIdByStatusKey.closed,
    statusKey: 'closed',
    width: 10,
    height: 10,
    baseColor: CLOSED_NODE_COLOR,
    stripePath: 'M-2 2 L2 -2 M0 10 L10 0 M8 12 L12 8',
    stripeColor: 'rgba(255, 255, 255, 0.45)',
  },
  {
    id: patternIdByStatusKey.suspended,
    statusKey: 'suspended',
    width: 8,
    height: 8,
    baseColor: SUSPENDED_NODE_COLOR,
    stripePath: 'M1 0 V8 M5 0 V8',
    stripeColor: 'rgba(255, 255, 255, 0.5)',
  },
];

const patternConfigByStatusKey = createPatternConfig().reduce((acc, config) => {
  acc[config.statusKey] = config;
  return acc;
}, {});

const getPatternConfigByStatusKey = (statusKey = '') => patternConfigByStatusKey[statusKey] || null;

export {
  nodeColorByStatusKey,
  patternIdByStatusKey,
  createPatternConfig,
  getPatternConfigByStatusKey,
};
