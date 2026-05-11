import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import GoalStatusReasonSankey, {
  applyPatternFill,
  applySankeyLinkPatterns,
  applySankeyNodeLabelPlacement,
  createPatternConfig,
  ensureSankeyPatterns,
  getDistributedY,
  getGoalsTopLineFromLabel,
  getMinimumVisualValueForLink,
  getNodeColorById,
  getNodeLabel,
  getPatternIdByNodeId,
  getPercentLabel,
  getStatusKeyFromNodeId,
  getStatusSortIndex,
  getVisualLinkValues,
  isReasonLink,
} from '../GoalStatusReasonSankey';
import pickClosestLinkByTargetCenter from '../goalStatusReasonSankeyUtils';

// ─── SVG DOM helpers ──────────────────────────────────────────────────────────

const svgNS = 'http://www.w3.org/2000/svg';
const makeSvgEl = (tag) => document.createElementNS(svgNS, tag);

const makeSankeyNodeGroup = (x, y, w, h, tspanTexts = []) => {
  const g = makeSvgEl('g');
  g.classList.add('sankey-node');

  const rect = makeSvgEl('rect');
  if (x !== undefined) rect.setAttribute('x', String(x));
  if (y !== undefined) rect.setAttribute('y', String(y));
  if (w !== undefined) rect.setAttribute('width', String(w));
  if (h !== undefined) rect.setAttribute('height', String(h));
  g.appendChild(rect);

  const text = makeSvgEl('text');
  text.classList.add('node-label');
  tspanTexts.forEach((content) => {
    const tspan = makeSvgEl('tspan');
    tspan.textContent = content;
    tspan.setAttribute('x', '0');
    tspan.setAttribute('y', '50');
    text.appendChild(tspan);
  });
  g.appendChild(text);

  return g;
};

const buildSankeyContainer = (nodeGroups = [], linkShapes = []) => {
  const container = document.createElement('div');
  const svg = makeSvgEl('svg');
  svg.classList.add('main-svg');
  linkShapes.forEach((s) => svg.appendChild(s));
  nodeGroups.forEach((g) => svg.appendChild(g));
  container.appendChild(svg);
  return container;
};

// ─── Component integration tests ─────────────────────────────────────────────

describe('GoalStatusReasonSankey', () => {
  it('shows empty-state text when sankey data is missing', () => {
    render(<GoalStatusReasonSankey sankey={{ nodes: [], links: [] }} />);
    expect(screen.getByText('No goal status data found.')).toBeInTheDocument();
  });

  it('shows empty-state text when goals node is missing', () => {
    const sankey = {
      nodes: [{ id: 'status:In Progress', label: 'In Progress', count: 3, percentage: 60 }],
      links: [],
    };
    render(<GoalStatusReasonSankey sankey={sankey} />);
    expect(screen.getByText('No goal status data found.')).toBeInTheDocument();
  });

  it('shows empty-state text when there are no valid visible links', () => {
    const sankey = {
      nodes: [
        { id: 'goals', label: 'Goals', count: 0, percentage: 0 },
        { id: 'status:Not Started', label: 'Not Started', count: 5, percentage: 100 },
      ],
      links: [{ source: 'goals', target: 'status:Not Started', value: 0 }],
    };
    render(<GoalStatusReasonSankey sankey={sankey} />);
    expect(screen.getByText('No goal status data found.')).toBeInTheDocument();
  });

  it('renders no fallback text for valid sankey data in test mode', () => {
    const sankey = {
      nodes: [
        { id: 'goals', label: 'Goals', count: 5, percentage: 100 },
        { id: 'status:Not Started', label: 'Not Started', count: 5, percentage: 100 },
      ],
      links: [{ source: 'goals', target: 'status:Not Started', value: 5 }],
    };
    const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
    expect(screen.queryByText('No goal status data found.')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('handles full sankey data with multiple status and reason nodes', () => {
    const sankey = {
      nodes: [
        { id: 'goals', label: 'Goals', count: 10, percentage: 100 },
        { id: 'status:Not Started', label: 'Not started', count: 4, percentage: 40 },
        { id: 'status:In Progress', label: 'In progress', count: 3, percentage: 30 },
        { id: 'status:Closed', label: 'Closed', count: 2, percentage: 20 },
        { id: 'status:Suspended', label: 'Suspended', count: 1, percentage: 10 },
        { id: 'reason:Closed:TTA complete', label: 'TTA complete', count: 2, percentage: 20 },
        { id: 'reason:Suspended:Key staff', label: 'Key staff', count: 1, percentage: 10 },
      ],
      links: [
        { source: 'goals', target: 'status:Not Started', value: 4 },
        { source: 'goals', target: 'status:In Progress', value: 3 },
        { source: 'goals', target: 'status:Closed', value: 2 },
        { source: 'goals', target: 'status:Suspended', value: 1 },
        { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 2 },
        { source: 'status:Suspended', target: 'reason:Suspended:Key staff', value: 1 },
      ],
    };
    const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
    expect(screen.queryByText('No goal status data found.')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('handles two reason nodes from the same source so link sort comparator runs', () => {
    const sankey = {
      nodes: [
        { id: 'goals', label: 'Goals', count: 5, percentage: 100 },
        { id: 'status:Closed', label: 'Closed', count: 5, percentage: 100 },
        { id: 'reason:Closed:TTA complete', label: 'TTA complete', count: 3, percentage: 60 },
        { id: 'reason:Closed:Unknown', label: 'Unknown', count: 2, percentage: 40 },
      ],
      links: [
        { source: 'goals', target: 'status:Closed', value: 5 },
        { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 3 },
        { source: 'status:Closed', target: 'reason:Closed:Unknown', value: 2 },
      ],
    };
    const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
    expect(screen.queryByText('No goal status data found.')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows empty-state when links reference nodes not in the nodes list', () => {
    const sankey = {
      nodes: [{ id: 'goals', label: 'Goals', count: 5, percentage: 100 }],
      links: [{ source: 'goals', target: 'status:Not Started', value: 5 }],
    };
    const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('accepts custom className prop', () => {
    const sankey = {
      nodes: [{ id: 'goals', count: 0 }],
      links: [],
    };
    render(<GoalStatusReasonSankey sankey={sankey} className="my-custom-class" />);
    expect(screen.getByText('No goal status data found.')).toBeInTheDocument();
  });
});

// ─── getStatusKeyFromNodeId ───────────────────────────────────────────────────

describe('getStatusKeyFromNodeId', () => {
  it('returns null for non-string input', () => {
    expect(getStatusKeyFromNodeId(null)).toBeNull();
    expect(getStatusKeyFromNodeId(undefined)).toBeNull();
    expect(getStatusKeyFromNodeId(42)).toBeNull();
    expect(getStatusKeyFromNodeId({})).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getStatusKeyFromNodeId('')).toBeNull();
  });

  it('returns "goals" for goals_start and goals', () => {
    expect(getStatusKeyFromNodeId('goals_start')).toBe('goals');
    expect(getStatusKeyFromNodeId('goals')).toBe('goals');
  });

  it('returns lowercased status for status: prefix', () => {
    expect(getStatusKeyFromNodeId('status:Not Started')).toBe('not started');
    expect(getStatusKeyFromNodeId('status:In Progress')).toBe('in progress');
    expect(getStatusKeyFromNodeId('status:Closed')).toBe('closed');
  });

  it('returns the status portion for reason: prefix', () => {
    expect(getStatusKeyFromNodeId('reason:Suspended:Key staff turnover')).toBe('suspended');
    expect(getStatusKeyFromNodeId('reason:Closed:TTA complete')).toBe('closed');
  });

  it('returns null for unrecognized node id format', () => {
    expect(getStatusKeyFromNodeId('unknown-node')).toBeNull();
    expect(getStatusKeyFromNodeId('something-else')).toBeNull();
  });
});

// ─── getNodeColorById ─────────────────────────────────────────────────────────

describe('getNodeColorById', () => {
  it('returns goals color for goals_start and goals', () => {
    const goalsColor = getNodeColorById('goals_start');
    expect(goalsColor).toBeTruthy();
    expect(getNodeColorById('goals')).toBe(goalsColor);
  });

  it('returns distinct colors for each status', () => {
    const notStarted = getNodeColorById('status:Not Started');
    const inProgress = getNodeColorById('status:In Progress');
    const closed = getNodeColorById('status:Closed');
    const suspended = getNodeColorById('status:Suspended');
    expect(notStarted).toBeTruthy();
    expect(inProgress).toBeTruthy();
    expect(closed).toBeTruthy();
    expect(suspended).toBeTruthy();
    expect(new Set([notStarted, inProgress, closed, suspended]).size).toBe(4);
  });

  it('returns a fallback color for unknown node ids', () => {
    const fallback = getNodeColorById('unknown-node');
    expect(fallback).toBeTruthy();
    expect(fallback).not.toBe(getNodeColorById('goals'));
  });
});

// ─── getPatternIdByNodeId ─────────────────────────────────────────────────────

describe('getPatternIdByNodeId', () => {
  it('returns a pattern id for known node types', () => {
    expect(getPatternIdByNodeId('goals')).toMatch(/ttahub-sankey-pattern/);
    expect(getPatternIdByNodeId('status:Not Started')).toMatch(/ttahub-sankey-pattern/);
    expect(getPatternIdByNodeId('reason:Suspended:key staff')).toMatch(/ttahub-sankey-pattern/);
  });

  it('returns null for unrecognized node ids', () => {
    expect(getPatternIdByNodeId('completely-unknown')).toBeNull();
  });
});

// ─── createPatternConfig ──────────────────────────────────────────────────────

describe('createPatternConfig', () => {
  it('returns an array of 5 pattern configs', () => {
    const configs = createPatternConfig();
    expect(Array.isArray(configs)).toBe(true);
    expect(configs).toHaveLength(5);
  });

  it('each config has required shape fields', () => {
    createPatternConfig().forEach((cfg) => {
      expect(cfg.id).toBeTruthy();
      expect(typeof cfg.width).toBe('number');
      expect(typeof cfg.height).toBe('number');
      expect(cfg.baseColor).toBeTruthy();
    });
  });

  it('some configs have stripePath and some do not', () => {
    const configs = createPatternConfig();
    const withStripe = configs.filter((c) => !!c.stripePath);
    const withoutStripe = configs.filter((c) => !c.stripePath);
    expect(withStripe.length).toBeGreaterThan(0);
    expect(withoutStripe.length).toBeGreaterThan(0);
  });
});

// ─── getStatusSortIndex ───────────────────────────────────────────────────────

describe('getStatusSortIndex', () => {
  it('returns 0 for "not started"', () => {
    expect(getStatusSortIndex('status:not started')).toBe(0);
  });

  it('returns 1 for "in progress"', () => {
    expect(getStatusSortIndex('status:in progress')).toBe(1);
  });

  it('returns 2 for "closed"', () => {
    expect(getStatusSortIndex('status:closed')).toBe(2);
  });

  it('returns 3 for "suspended"', () => {
    expect(getStatusSortIndex('status:suspended')).toBe(3);
  });

  it('returns Infinity for non-status node ids', () => {
    expect(getStatusSortIndex('goals')).toBe(Number.POSITIVE_INFINITY);
    expect(getStatusSortIndex('reason:Closed:TTA')).toBe(Number.POSITIVE_INFINITY);
    expect(getStatusSortIndex('')).toBe(Number.POSITIVE_INFINITY);
    expect(getStatusSortIndex(undefined)).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns Infinity for unknown status name', () => {
    expect(getStatusSortIndex('status:unknown-status')).toBe(Number.POSITIVE_INFINITY);
  });
});

// ─── getDistributedY ─────────────────────────────────────────────────────────

describe('getDistributedY', () => {
  it('returns 0.5 when total is 1 or less', () => {
    expect(getDistributedY(0, 1)).toBe(0.5);
    expect(getDistributedY(0, 0)).toBe(0.5);
    expect(getDistributedY(0, -1)).toBe(0.5);
  });

  it('distributes positions evenly across the valid range', () => {
    const first = getDistributedY(0, 2);
    const last = getDistributedY(1, 2);
    // N=2: dynamic margin is max(0.08, 0.5/2) = 0.25, so range is [0.25, 0.75].
    // This keeps equal-flow nodes far enough from the chart edges to prevent clipping.
    expect(first).toBeCloseTo(0.25, 2);
    expect(last).toBeCloseTo(0.75, 2);
  });

  it('returns values within [0, 1] for arbitrary indices', () => {
    for (let i = 0; i < 5; i += 1) {
      const y = getDistributedY(i, 5);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });
});

// ─── getPercentLabel ─────────────────────────────────────────────────────────

describe('getPercentLabel', () => {
  it('returns null for goals_start node', () => {
    expect(getPercentLabel({ id: 'goals_start' }, 100)).toBeNull();
  });

  it('returns "100.00" for goals node when total > 0', () => {
    expect(getPercentLabel({ id: 'goals' }, 100)).toBe('100.00');
  });

  it('returns "0.00" for goals node when total is 0', () => {
    expect(getPercentLabel({ id: 'goals' }, 0)).toBe('0.00');
  });

  it('returns the percentage as a string when percentage is finite', () => {
    expect(getPercentLabel({ id: 'status:Not Started', percentage: 60 }, 100)).toBe('60.00');
    expect(getPercentLabel({ id: 'status:Not Started', percentage: 0 }, 100)).toBe('0.00');
  });

  it('computes percentage from count when percentage is not finite', () => {
    expect(
      getPercentLabel({ id: 'status:Not Started', percentage: undefined, count: 10 }, 100)
    ).toBe('10.00');
  });

  it('returns "0.00" when percentage is not finite and totalGoalsValue is 0', () => {
    expect(getPercentLabel({ id: 'status:Not Started', percentage: undefined, count: 10 }, 0)).toBe(
      '0.00'
    );
  });

  it('returns "0.00" when percentage and count are both non-finite', () => {
    expect(getPercentLabel({ id: 'status:Not Started' }, 100)).toBe('0.00');
  });
});

// ─── getNodeLabel ─────────────────────────────────────────────────────────────

describe('getNodeLabel', () => {
  it('returns empty string for goals_start node', () => {
    expect(getNodeLabel({ id: 'goals_start' }, 100)).toBe('');
  });

  it('returns a formatted label with count and percent for other nodes', () => {
    const label = getNodeLabel({ id: 'goals', label: 'Goals', count: 5 }, 5);
    expect(label).toContain('5');
    expect(label).toContain('Goals');
    expect(label).toContain('%');
  });

  it('handles missing count gracefully', () => {
    const label = getNodeLabel({ id: 'status:Not Started', label: 'Not started' }, 10);
    expect(label).toContain('0');
  });
});

// ─── getGoalsTopLineFromLabel ─────────────────────────────────────────────────

describe('getGoalsTopLineFromLabel', () => {
  it('returns empty string for null or undefined', () => {
    expect(getGoalsTopLineFromLabel(null)).toBe('');
    expect(getGoalsTopLineFromLabel(undefined)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(getGoalsTopLineFromLabel('')).toBe('');
  });

  it('returns empty string for non-string input', () => {
    expect(getGoalsTopLineFromLabel(42)).toBe('');
    expect(getGoalsTopLineFromLabel({})).toBe('');
  });

  it('strips HTML tags and returns first line', () => {
    const html = '<b>10 (100.00%)</b><br>Goals';
    expect(getGoalsTopLineFromLabel(html)).toBe('10 (100.00%)');
  });

  it('handles self-closing br tags', () => {
    const html = '<b>5 (50%)</b><br />Goals';
    expect(getGoalsTopLineFromLabel(html)).toBe('5 (50%)');
  });

  it('returns plain text as-is', () => {
    expect(getGoalsTopLineFromLabel('Simple text')).toBe('Simple text');
  });
});

// ─── getMinimumVisualValueForLink ─────────────────────────────────────────────

describe('getMinimumVisualValueForLink', () => {
  it('returns the reason-link minimum for reason: target links', () => {
    const reasonLink = { source: 'status:Closed', target: 'reason:Closed:TTA' };
    const standardLink = { source: 'goals', target: 'status:Not Started' };
    const reasonMin = getMinimumVisualValueForLink(reasonLink);
    const standardMin = getMinimumVisualValueForLink(standardLink);
    expect(typeof reasonMin).toBe('number');
    expect(typeof standardMin).toBe('number');
    expect(reasonMin).toBeGreaterThan(0);
    expect(standardMin).toBeGreaterThan(0);
  });

  it('returns a larger or equal minimum for reason links vs non-reason links', () => {
    const reasonMin = getMinimumVisualValueForLink({ target: 'reason:Closed:X' });
    const standardMin = getMinimumVisualValueForLink({ target: 'status:Closed' });
    expect(reasonMin).toBeGreaterThanOrEqual(standardMin);
  });
});

// ─── isReasonLink ────────────────────────────────────────────────────────────

describe('isReasonLink', () => {
  it('returns true for links targeting reason: nodes', () => {
    expect(isReasonLink({ target: 'reason:Closed:TTA complete' })).toBe(true);
    expect(isReasonLink({ target: 'reason:Suspended:Key staff' })).toBe(true);
  });

  it('returns false for links targeting status: or goals nodes', () => {
    expect(isReasonLink({ target: 'status:Not Started' })).toBe(false);
    expect(isReasonLink({ target: 'goals' })).toBe(false);
    expect(isReasonLink({ target: 'goals_start' })).toBe(false);
  });

  it('returns false for null/undefined link', () => {
    expect(isReasonLink(null)).toBe(false);
    expect(isReasonLink(undefined)).toBe(false);
    expect(isReasonLink({ target: null })).toBe(false);
  });
});

// ─── getVisualLinkValues ──────────────────────────────────────────────────────

describe('getVisualLinkValues', () => {
  it('returns empty array for empty links', () => {
    expect(getVisualLinkValues([])).toEqual([]);
    expect(getVisualLinkValues()).toEqual([]);
  });

  it('returns zeros when all link values in a source group are zero', () => {
    const links = [{ source: 'goals', target: 'status:Not Started', value: 0 }];
    expect(getVisualLinkValues(links)).toEqual([0]);
  });

  it('lifts link values to the minimum when originals are small', () => {
    const links = [
      { source: 'goals', target: 'status:Not Started', value: 50 },
      { source: 'goals', target: 'status:In Progress', value: 50 },
    ];
    const result = getVisualLinkValues(links);
    expect(result).toHaveLength(2);
    result.forEach((v) => expect(v).toBeGreaterThan(0));
  });

  it('applies scale when raised total exceeds original for reason links', () => {
    // Two reason links with very small values — floors will exceed original total.
    const links = [
      { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 1 },
      { source: 'status:Closed', target: 'reason:Closed:Unknown', value: 1 },
    ];
    const result = getVisualLinkValues(links);
    expect(result).toHaveLength(2);
    result.forEach((v) => expect(v).toBeGreaterThan(0));
  });

  it('scales proportionally when raised total > original and stretchTotal > 0', () => {
    // One reason link with value > floor to create stretchTotal > 0.
    const links = [
      { source: 'status:Closed', target: 'reason:Closed:TTA', value: 20 },
      { source: 'status:Closed', target: 'reason:Closed:Other', value: 1 },
    ];
    const result = getVisualLinkValues(links);
    expect(result).toHaveLength(2);
    // First link had value > floor so it gets some stretch budget.
    expect(result[0]).toBeGreaterThan(result[1]);
  });

  it('groups links by source when source is missing uses fallback key', () => {
    const links = [{ target: 'status:Not Started', value: 5 }]; // no source
    const result = getVisualLinkValues(links);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeGreaterThan(0);
  });

  it('handles mix of reason and non-reason links from the same source', () => {
    const links = [
      { source: 'status:Closed', target: 'reason:Closed:TTA', value: 3 },
      { source: 'goals', target: 'status:Closed', value: 3 },
    ];
    const result = getVisualLinkValues(links);
    expect(result).toHaveLength(2);
    result.forEach((v) => expect(typeof v).toBe('number'));
  });

  it('inflates goals→status link to accommodate minimum-width reason bands', () => {
    // When a status has few goals (e.g. 2 suspended out of 100) its reason links
    // would each inflate to their minimum (10), giving outflow of 20 but inflow of
    // only ~10. The fix raises the goals→status floor to the reason minimum total so
    // the status node is always balanced and reason links stay at full minimum width.
    const links = [
      { source: 'goals_start', target: 'goals', value: 100 },
      { source: 'goals', target: 'status:Not Started', value: 80 },
      { source: 'goals', target: 'status:In Progress', value: 18 },
      { source: 'goals', target: 'status:Suspended', value: 2 },
      { source: 'status:Suspended', target: 'reason:Suspended:Key staff', value: 1 },
      { source: 'status:Suspended', target: 'reason:Suspended:Other', value: 1 },
    ];
    const result = getVisualLinkValues(links);
    const suspendedInflow = result[3];
    const reason1 = result[4];
    const reason2 = result[5];
    // goals→status link is inflated to accommodate 2 × minimum reason bands.
    expect(suspendedInflow).toBeGreaterThanOrEqual(20);
    // Reason links are at full minimum width.
    expect(reason1).toBeCloseTo(10, 0);
    expect(reason2).toBeCloseTo(10, 0);
    // Flow is conserved: reason total equals the status inflow.
    expect(reason1 + reason2).toBeCloseTo(suspendedInflow, 5);
  });
});

// ─── ensureSankeyPatterns ─────────────────────────────────────────────────────

describe('ensureSankeyPatterns', () => {
  it('does not throw when svg is null', () => {
    expect(() => ensureSankeyPatterns(null)).not.toThrow();
  });

  it('creates a defs element when the svg has none', () => {
    const svg = makeSvgEl('svg');
    ensureSankeyPatterns(svg);
    expect(svg.querySelector('defs')).toBeTruthy();
  });

  it('adds all pattern elements to defs', () => {
    const svg = makeSvgEl('svg');
    ensureSankeyPatterns(svg);
    const patterns = svg.querySelectorAll('defs pattern');
    expect(patterns.length).toBeGreaterThan(0);
  });

  it('uses existing defs element rather than creating a new one', () => {
    const svg = makeSvgEl('svg');
    const existingDefs = makeSvgEl('defs');
    svg.appendChild(existingDefs);
    ensureSankeyPatterns(svg);
    expect(svg.querySelectorAll('defs')).toHaveLength(1);
  });

  it('does not duplicate patterns when called twice', () => {
    const svg = makeSvgEl('svg');
    ensureSankeyPatterns(svg);
    const firstCount = svg.querySelectorAll('defs pattern').length;
    ensureSankeyPatterns(svg);
    expect(svg.querySelectorAll('defs pattern').length).toBe(firstCount);
  });

  it('creates stripe path elements for patterns that have stripePath', () => {
    const svg = makeSvgEl('svg');
    ensureSankeyPatterns(svg);
    // At least one pattern should have a path child (stripe).
    const patternPaths = svg.querySelectorAll('defs pattern path');
    expect(patternPaths.length).toBeGreaterThan(0);
  });
});

// ─── applyPatternFill ─────────────────────────────────────────────────────────

describe('applyPatternFill', () => {
  it('does not throw when element is null', () => {
    expect(() => applyPatternFill(null, 'pattern-id')).not.toThrow();
  });

  it('does not throw when patternId is null', () => {
    const rect = makeSvgEl('rect');
    expect(() => applyPatternFill(rect, null)).not.toThrow();
  });

  it('sets fill attribute to url reference', () => {
    const rect = makeSvgEl('rect');
    applyPatternFill(rect, 'ttahub-sankey-pattern-goals');
    expect(rect.getAttribute('fill')).toBe('url(#ttahub-sankey-pattern-goals)');
  });

  it('sets style attribute with fill and shape-rendering', () => {
    const rect = makeSvgEl('rect');
    applyPatternFill(rect, 'ttahub-sankey-pattern-closed');
    const style = rect.getAttribute('style');
    expect(style).toContain('fill:');
    expect(style).toContain('shape-rendering: geometricPrecision');
  });

  it('removes existing fill and stroke from style before applying new fill', () => {
    const rect = makeSvgEl('rect');
    rect.setAttribute('style', 'fill: red; stroke: blue; color: green;');
    applyPatternFill(rect, 'ttahub-sankey-pattern-closed');
    const style = rect.getAttribute('style');
    expect(style).not.toContain('fill: red');
    expect(style).not.toContain('stroke: blue');
    expect(style).toContain('color: green');
  });
});

// ─── applySankeyLinkPatterns ──────────────────────────────────────────────────

describe('applySankeyLinkPatterns', () => {
  it('does not throw when container is null', () => {
    expect(() => applySankeyLinkPatterns(null, ['pattern'])).not.toThrow();
  });

  it('does not throw when linkPatternIds is empty', () => {
    const container = document.createElement('div');
    expect(() => applySankeyLinkPatterns(container, [])).not.toThrow();
  });

  it('does nothing when container has no svg.main-svg', () => {
    const container = document.createElement('div');
    expect(() => applySankeyLinkPatterns(container, ['pattern'])).not.toThrow();
  });

  it('applies pattern fill to sankey-link paths', () => {
    const container = document.createElement('div');
    const svg = makeSvgEl('svg');
    svg.classList.add('main-svg');
    const path = makeSvgEl('path');
    path.classList.add('sankey-link');
    svg.appendChild(path);
    container.appendChild(svg);

    applySankeyLinkPatterns(container, ['ttahub-sankey-pattern-goals']);

    expect(path.getAttribute('fill')).toBe('url(#ttahub-sankey-pattern-goals)');
  });
});

// ─── applySankeyNodeLabelPlacement ────────────────────────────────────────────

describe('applySankeyNodeLabelPlacement', () => {
  it('does not throw when container is null', () => {
    expect(() => applySankeyNodeLabelPlacement(null)).not.toThrow();
  });

  it('does not throw when container has no svg.main-svg', () => {
    const container = document.createElement('div');
    expect(() => applySankeyNodeLabelPlacement(container)).not.toThrow();
  });

  it('hides goals node native label and creates overlay label', () => {
    const groups = [
      makeSankeyNodeGroup(10, 100, 20, 200, ['10 (100.00%)', 'Goals Start']), // index 0: goals_start
      makeSankeyNodeGroup(200, 100, 20, 200, ['10 (100.00%)', 'Goals']), // index 1: goals
    ];
    const container = buildSankeyContainer(groups);

    applySankeyNodeLabelPlacement(container, '10 (100.00%)');

    const goalsNodeLabel = groups[1].querySelector('text.node-label');
    expect(goalsNodeLabel.getAttribute('opacity')).toBe('0');

    const overlayLabel = container.querySelector('text.ttahub-goals-link-label');
    expect(overlayLabel).toBeTruthy();
  });

  it('uses fallback tspan text when goalsLabelTopLine is empty', () => {
    const groups = [
      makeSankeyNodeGroup(10, 100, 20, 200, ['Fallback Count', 'Goals Start']),
      makeSankeyNodeGroup(200, 100, 20, 200, ['Fallback Count', 'Goals']),
    ];
    const container = buildSankeyContainer(groups);

    applySankeyNodeLabelPlacement(container, '');

    const overlayLabel = container.querySelector('text.ttahub-goals-link-label');
    expect(overlayLabel).toBeTruthy();
  });

  it('reuses existing overlay label element on second call', () => {
    const groups = [
      makeSankeyNodeGroup(10, 100, 20, 200, ['10', 'Goals Start']),
      makeSankeyNodeGroup(200, 100, 20, 200, ['10', 'Goals']),
    ];
    const container = buildSankeyContainer(groups);

    applySankeyNodeLabelPlacement(container, '10');
    applySankeyNodeLabelPlacement(container, '10');

    const overlayLabels = container.querySelectorAll('text.ttahub-goals-link-label');
    expect(overlayLabels).toHaveLength(1);
  });

  it('positions status node labels to the left of their node using transform override', () => {
    const groups = [
      makeSankeyNodeGroup(10, 100, 20, 200, ['', 'goals start']), // index 0
      makeSankeyNodeGroup(200, 100, 20, 200, ['', 'goals']), // index 1
      makeSankeyNodeGroup(400, 50, 20, 100, ['5 (50%)', 'not started']), // index 2 - status
    ];
    const container = buildSankeyContainer(groups);

    applySankeyNodeLabelPlacement(container);

    const label = groups[2].querySelector('text.node-label');
    // No existing transform → posY=0; posX = rectWidth(20) + STATUS_LABEL_OFFSET_X(8) = 28.
    // Label left edge sits 8px past the node's right edge.
    expect(label.getAttribute('transform')).toBe('translate(28, 0)');
    expect(label.getAttribute('text-anchor')).toBe('start');
    const tspans = label.querySelectorAll('tspan');
    tspans.forEach((tspan) => expect(tspan.getAttribute('x')).toBe('0'));
  });

  it('detects status labels from Plotly-style nested tspan structure (tspan.line > tspan(bold))', () => {
    // In the real browser, Plotly's convertToTspans turns "<b>5 (50%)</b><br>not started" into:
    //   <tspan class="line"><tspan style="font-weight:700">5 (50%)</tspan></tspan>
    //   <tspan class="line">not started</tspan>
    // querySelectorAll('tspan') returns [line0, boldInner, line1], so tspans[1] is the bold
    // tspan (not the status name). We must check ALL tspans with some().
    const svgNS2 = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(svgNS2, 'g');
    g.classList.add('sankey-node');
    const rect = document.createElementNS(svgNS2, 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '50');
    rect.setAttribute('width', '20');
    rect.setAttribute('height', '100');
    g.appendChild(rect);
    const text = document.createElementNS(svgNS2, 'text');
    text.classList.add('node-label');
    text.setAttribute('transform', 'translate(23, 14.5)');
    // Line 1: tspan.line containing a bold inner tspan
    const line1 = document.createElementNS(svgNS2, 'tspan');
    line1.classList.add('line');
    const bold1 = document.createElementNS(svgNS2, 'tspan');
    bold1.setAttribute('style', 'font-weight:700');
    bold1.textContent = '5 (50%)';
    line1.appendChild(bold1);
    text.appendChild(line1);
    // Line 2: tspan.line with plain text "not started"
    const line2 = document.createElementNS(svgNS2, 'tspan');
    line2.classList.add('line');
    line2.textContent = 'not started';
    text.appendChild(line2);
    g.appendChild(text);
    const groups = [
      makeSankeyNodeGroup(10, 100, 20, 200, ['', 'goals start']),
      makeSankeyNodeGroup(200, 100, 20, 200, ['', 'goals']),
      g,
    ];
    const container = buildSankeyContainer(groups);

    applySankeyNodeLabelPlacement(container);

    // Status is detected via some() over all tspans; posY preserved, posX = rectWidth(20)+8=28.
    expect(text.getAttribute('transform')).toBe('translate(28, 14.5)');
    expect(text.getAttribute('text-anchor')).toBe('start');
  });

  it('preserves posY from existing label transform when repositioning a status label', () => {
    const groups = [
      makeSankeyNodeGroup(10, 100, 20, 200, ['', 'goals start']), // index 0
      makeSankeyNodeGroup(200, 100, 20, 200, ['', 'goals']), // index 1
      makeSankeyNodeGroup(400, 50, 20, 100, ['5 (50%)', 'not started']), // index 2 - status
    ];
    // Simulate Plotly's transform attribute on the label element.
    const statusLabel = groups[2].querySelector('text.node-label');
    statusLabel.setAttribute('transform', 'translate(23, 14.5)');
    const container = buildSankeyContainer(groups);

    applySankeyNodeLabelPlacement(container);

    // posY(14.5) must be preserved; posX = rectWidth(20) + STATUS_LABEL_OFFSET_X(8) = 28.
    expect(statusLabel.getAttribute('transform')).toBe('translate(28, 14.5)');
  });

  it('positions reason node labels with LABEL_OFFSET_X (10)', () => {
    const groups = [
      makeSankeyNodeGroup(10, 100, 20, 200, ['', 'goals start']), // index 0
      makeSankeyNodeGroup(200, 100, 20, 200, ['', 'goals']), // index 1
      makeSankeyNodeGroup(400, 50, 20, 100, ['5 (50%)', 'not started']), // status
      makeSankeyNodeGroup(700, 50, 20, 40, ['5 (50%)', 'TTA complete']), // reason
    ];
    const container = buildSankeyContainer(groups);

    applySankeyNodeLabelPlacement(container);

    const label = groups[3].querySelector('text.node-label');
    // rectX(700) + rectWidth(20) + LABEL_OFFSET_X(10) = 730
    expect(label.getAttribute('x')).toBe('730');
  });

  it('skips node groups without a rect element', () => {
    const container = document.createElement('div');
    const svg = makeSvgEl('svg');
    svg.classList.add('main-svg');

    const g = makeSvgEl('g');
    g.classList.add('sankey-node');
    const text = makeSvgEl('text');
    text.classList.add('node-label');
    g.appendChild(text); // no rect
    svg.appendChild(g);
    container.appendChild(svg);

    expect(() => applySankeyNodeLabelPlacement(container)).not.toThrow();
  });

  it('skips node groups with non-finite rect coordinates', () => {
    const groups = [
      makeSankeyNodeGroup('notANumber', 100, 'notANumber', 200, ['', 'goals start']),
      makeSankeyNodeGroup(200, 100, 20, 200, ['', 'goals']),
    ];
    const container = buildSankeyContainer(groups);
    expect(() => applySankeyNodeLabelPlacement(container)).not.toThrow();
  });

  it('creates overlay tspan elements when goalsLabelCenterY is finite', () => {
    const groups = [
      makeSankeyNodeGroup(10, 100, 20, 200, ['10', 'Goals Start']), // index 0 — provides finite y
      makeSankeyNodeGroup(200, 100, 20, 200, ['10', 'Goals']), // index 1 — finite y
    ];
    const container = buildSankeyContainer(groups);

    applySankeyNodeLabelPlacement(container, '10 (100%)');

    const overlayLabel = container.querySelector('text.ttahub-goals-link-label');
    expect(overlayLabel).toBeTruthy();
    const tspans = overlayLabel.querySelectorAll('tspan');
    expect(tspans.length).toBeGreaterThan(0);
  });

  it('uses getBBox on the goals start link shape when it is available', () => {
    const groups = [
      makeSankeyNodeGroup(10, 100, 20, 200, ['10', 'Goals Start']),
      makeSankeyNodeGroup(200, 100, 20, 200, ['10', 'Goals']),
    ];
    const linkShape = makeSvgEl('path');
    linkShape.classList.add('sankey-link');
    // Provide a working getBBox so the try block succeeds.
    linkShape.getBBox = () => ({ x: 50, y: 80, width: 180, height: 120 });

    const container = buildSankeyContainer(groups, [linkShape]);

    expect(() => applySankeyNodeLabelPlacement(container, '10 (100%)')).not.toThrow();

    const overlayLabel = container.querySelector('text.ttahub-goals-link-label');
    expect(overlayLabel).toBeTruthy();
    // x should be midpoint of the link box: 50 + 180/2 = 140
    expect(overlayLabel.getAttribute('x')).toBe('140');
  });

  it('deoverlaps labels in the same column when getBBox is mocked to return real bounds', () => {
    const groups = [
      makeSankeyNodeGroup(10, 100, 20, 200, ['', 'goals start']), // index 0 — skipped
      makeSankeyNodeGroup(200, 100, 20, 200, ['', 'goals']), // index 1 — skipped
      makeSankeyNodeGroup(400, 50, 20, 100, ['5 (50%)', 'not started']), // status — same x
      makeSankeyNodeGroup(400, 200, 20, 40, ['2 (20%)', 'in progress']), // another — same x
    ];
    const container = buildSankeyContainer(groups);

    // Mock getBBox to return consistent bounds so deoverlap code runs.
    let callCount = 0;
    groups.forEach((g) => {
      const text = g.querySelector('text');
      if (text) {
        text.getBBox = () => {
          callCount += 1;
          return { x: 0, y: 0, width: 100, height: 20 };
        };
      }
    });

    applySankeyNodeLabelPlacement(container);

    // If the deoverlap ran, getBBox was called for non-goals/non-start nodes.
    expect(callCount).toBeGreaterThan(0);
  });

  it('applies goals-colored border only to goals nodes', () => {
    const groups = [
      makeSankeyNodeGroup(10, 100, 20, 200, ['', 'goals start']),
      makeSankeyNodeGroup(200, 100, 20, 200, ['', 'goals']),
      makeSankeyNodeGroup(400, 100, 20, 200, ['', 'not started']),
    ];
    const container = buildSankeyContainer(groups);

    applySankeyNodeLabelPlacement(container);

    const goalsColor = getNodeColorById('goals');
    const goalsStartRect = groups[0].querySelector('rect');
    const goalsRect = groups[1].querySelector('rect');
    const statusRect = groups[2].querySelector('rect');

    expect(goalsStartRect.getAttribute('stroke')).toBe(goalsColor);
    expect(goalsRect.getAttribute('stroke')).toBe(goalsColor);
    expect(statusRect.getAttribute('stroke')).toBe('none');
    expect(goalsStartRect.getAttribute('stroke-width')).toBe('1');
    expect(goalsRect.getAttribute('stroke-width')).toBe('1');
    expect(statusRect.getAttribute('stroke-width')).toBe('0');
  });

  it('adds a right-edge seam mask only for goals_start node', () => {
    const groups = [
      makeSankeyNodeGroup(10, 100, 20, 200, ['', 'goals start']),
      makeSankeyNodeGroup(200, 100, 20, 200, ['', 'goals']),
    ];
    const container = buildSankeyContainer(groups);

    applySankeyNodeLabelPlacement(container);

    const goalsStartMask = groups[0].querySelector('rect.ttahub-goals-right-seam-mask');
    const goalsMask = groups[1].querySelector('rect.ttahub-goals-right-seam-mask');

    expect(goalsStartMask).toBeTruthy();
    expect(goalsMask).toBeNull();
    expect(goalsStartMask.getAttribute('x')).toBe('29.5');
    expect(goalsStartMask.getAttribute('y')).toBe('100');
    expect(goalsStartMask.getAttribute('width')).toBe('1.5');
    expect(goalsStartMask.getAttribute('height')).toBe('200');
  });
});

// ─── Component branch coverage for chartData useMemo ─────────────────────────

describe('GoalStatusReasonSankey chartData edge cases', () => {
  it('handles duplicate links (triggers return 0 in sort comparator)', () => {
    const sankey = {
      nodes: [
        { id: 'goals', count: 10 },
        { id: 'status:Not Started', count: 5 },
        { id: 'status:In Progress', count: 5 },
      ],
      links: [
        { source: 'goals', target: 'status:Not Started', value: 5 },
        { source: 'goals', target: 'status:Not Started', value: 5 }, // duplicate
        { source: 'goals', target: 'status:In Progress', value: 5 },
      ],
    };
    const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('handles node with non-string id (covers return false in nonStatusNodeIds filter)', () => {
    const sankey = {
      nodes: [
        { id: 'goals', count: 5 },
        { id: 'status:Not Started', count: 5 },
        { id: null, count: 0 }, // non-string id
      ],
      links: [{ source: 'goals', target: 'status:Not Started', value: 5 }],
    };
    const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
    expect(container).toBeEmptyDOMElement();
  });
});

// ─── pickClosestLinkByTargetCenter ────────────────────────────────────────────

describe('pickClosestLinkByTargetCenter', () => {
  it('returns null for invalid inputs', () => {
    expect(pickClosestLinkByTargetCenter([], 100)).toBeNull();
    expect(pickClosestLinkByTargetCenter(null, 100)).toBeNull();
    expect(pickClosestLinkByTargetCenter([{ pts: { ty1: 0, ty2: 10 } }], Number.NaN)).toBeNull();
  });

  it('returns the link nearest the target center', () => {
    const links = [
      { id: 'a', pts: { ty1: 100, ty2: 120 } }, // center 110
      { id: 'b', pts: { ty1: 220, ty2: 240 } }, // center 230
      { id: 'c', pts: { ty1: 320, ty2: 360 } }, // center 340
    ];

    expect(pickClosestLinkByTargetCenter(links, 225)).toEqual(links[1]);
    expect(pickClosestLinkByTargetCenter(links, 345)).toEqual(links[2]);
  });
});
