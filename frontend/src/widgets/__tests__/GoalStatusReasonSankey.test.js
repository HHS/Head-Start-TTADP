import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import colors from '../../colors';
import GoalStatusReasonSankey, {
  applyCustomLinkPaths,
  applyGoalsLabel,
  applyGoalsLeftBorder,
  applyPatternFill,
  applyReasonNodeBorders,
  applySankeyPatterns,
  applyStatusLabels,
  applyStatusRightBorders,
  ensureSankeyPatterns,
  getBaseNodeShape,
  getNodeColor,
  makeLabelText,
  parsePathPoints,
  shiftLabelY,
} from '../GoalStatusReasonSankey';
import pickClosestLinkByTargetCenter from '../goalStatusReasonSankeyUtils';

let latestPlotProps;

const mockPlotComponent = React.forwardRef((props, ref) => {
  latestPlotProps = props;
  return <div data-testid="mock-plot-component" ref={ref} />;
});

jest.mock('plotly.js/dist/plotly', () => ({
  __esModule: true,
  default: { mockedPlotly: true },
}));

jest.mock('react-plotly.js/factory', () => jest.fn(() => mockPlotComponent));

// ---------------------------------------------------------------------------
// Shared SVG helpers
// ---------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeSvgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function makeSankeyNodeGroup(
  bboxOverride = {
    x: 0,
    y: 0,
    width: 100,
    height: 50,
  }
) {
  const group = makeSvgEl('g');
  group.classList.add('sankey-node');
  const rect = makeSvgEl('rect', {
    x: '0',
    y: '0',
    width: '100',
    height: '50',
  });
  rect.classList.add('node-rect');
  // jsdom getBBox always returns zeros — override for layout-sensitive tests.
  rect.getBBox = () => bboxOverride;
  group.appendChild(rect);
  return group;
}

// ---------------------------------------------------------------------------
// pickClosestLinkByTargetCenter (utility)
// ---------------------------------------------------------------------------

describe('GoalStatusReasonSankey', () => {
  describe('pickClosestLinkByTargetCenter', () => {
    it('returns null when links are empty', () => {
      expect(pickClosestLinkByTargetCenter([], 100)).toBeNull();
    });

    it('returns null when target center is not numeric', () => {
      const links = [{ pts: { ty1: 100, ty2: 120 } }];
      expect(pickClosestLinkByTargetCenter(links, Number.NaN)).toBeNull();
    });

    it('picks the link whose target center is nearest to the status center', () => {
      const linkA = { shape: { id: 'a' }, pts: { ty1: 100, ty2: 120 } }; // center 110
      const linkB = { shape: { id: 'b' }, pts: { ty1: 220, ty2: 240 } }; // center 230
      const linkC = { shape: { id: 'c' }, pts: { ty1: 310, ty2: 350 } }; // center 330

      expect(pickClosestLinkByTargetCenter([linkA, linkB, linkC], 240)).toBe(linkB);
      expect(pickClosestLinkByTargetCenter([linkA, linkB, linkC], 320)).toBe(linkC);
    });
  });

  // -------------------------------------------------------------------------
  // parsePathPoints — pure string parser, no DOM
  // -------------------------------------------------------------------------

  describe('parsePathPoints', () => {
    it('parses a 16-number Plotly cubic-bezier path', () => {
      // M sx sy1  C _ _ tx ty1  L tx ty2  C _ _ sx sy2
      const d = 'M 0 10 C 25 10 75 30 100 30 L 100 50 C 75 50 25 70 0 70';
      const pts = parsePathPoints(d);
      expect(pts).toMatchObject({
        sx: 0,
        sy1: 10,
        tx: 100,
        ty1: 30,
        ty2: 50,
        sy2: 70,
      });
    });

    it('parses an 8-number straight-rectangle path', () => {
      // M sx sy1  L tx ty1  L tx ty2  L sx sy2
      const d = 'M 0 10 L 100 30 L 100 50 L 0 70';
      const pts = parsePathPoints(d);
      expect(pts).toMatchObject({
        sx: 0,
        sy1: 10,
        tx: 100,
        ty1: 30,
        ty2: 50,
        sy2: 70,
      });
    });

    it('returns null for paths with unexpected point counts', () => {
      expect(parsePathPoints('M 0 10 L 50 30')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // applyPatternFill — DOM attribute manipulation
  // -------------------------------------------------------------------------

  describe('applyPatternFill', () => {
    it('does nothing when element is null', () => {
      // Should not throw
      expect(() => applyPatternFill(null, 'my-pattern')).not.toThrow();
    });

    it('does nothing when patternId is falsy', () => {
      const rect = makeSvgEl('rect');
      applyPatternFill(rect, '');
      expect(rect.getAttribute('fill')).toBeNull();
    });

    it('sets fill and style attributes on the element', () => {
      const rect = makeSvgEl('rect');
      applyPatternFill(rect, 'my-pattern');
      expect(rect.getAttribute('fill')).toBe('url(#my-pattern)');
      expect(rect.getAttribute('style')).toContain('fill: url(#my-pattern)');
      expect(rect.getAttribute('style')).toContain('stroke: none');
    });

    it('does not re-apply when fill is already set correctly', () => {
      const rect = makeSvgEl('rect');
      applyPatternFill(rect, 'my-pattern');
      const style1 = rect.getAttribute('style');
      applyPatternFill(rect, 'my-pattern');
      // Second call should be a no-op — attributes stay the same
      expect(rect.getAttribute('style')).toBe(style1);
    });

    it('replaces a previous fill with the new pattern', () => {
      const rect = makeSvgEl('rect');
      applyPatternFill(rect, 'pattern-a');
      applyPatternFill(rect, 'pattern-b');
      expect(rect.getAttribute('fill')).toBe('url(#pattern-b)');
    });
  });

  // -------------------------------------------------------------------------
  // makeLabelText — SVG text element creation
  // -------------------------------------------------------------------------

  describe('makeLabelText', () => {
    const statusNode = {
      id: 'status:In Progress',
      count: 5,
      percentage: 50,
      label: 'In Progress',
    };
    const goalsNode = {
      id: 'goals',
      count: 10,
      percentage: 100,
      label: 'Goals',
    };
    const zeroGoalsNode = {
      id: 'goals',
      count: 0,
      percentage: 0,
      label: 'Goals',
    };

    it('creates a <text> element with two <tspan> children', () => {
      const el = makeLabelText(SVG_NS, statusNode, 120, 40, 56);
      expect(el.nodeName.toLowerCase()).toBe('text');
      const tspans = el.querySelectorAll('tspan');
      expect(tspans).toHaveLength(2);
    });

    it('sets the correct x/y positions on both tspans', () => {
      const el = makeLabelText(SVG_NS, statusNode, 120, 40, 56);
      const [line1, line2] = el.querySelectorAll('tspan');
      expect(line1.getAttribute('x')).toBe('120');
      expect(line1.getAttribute('y')).toBe('40');
      expect(line2.getAttribute('x')).toBe('120');
      expect(line2.getAttribute('y')).toBe('56');
    });

    it('shows percentage for non-goals nodes (exercises formatPercent non-goals branch)', () => {
      const el = makeLabelText(SVG_NS, statusNode, 0, 0, 0);
      const [line1] = el.querySelectorAll('tspan');
      expect(line1.textContent).toContain('50.00%');
    });

    it('shows 100% for a goals node with positive count', () => {
      const el = makeLabelText(SVG_NS, goalsNode, 0, 0, 0);
      const [line1] = el.querySelectorAll('tspan');
      expect(line1.textContent).toContain('100%');
    });

    it('shows 0% for a goals node with zero count (formatPercent 0% branch)', () => {
      const el = makeLabelText(SVG_NS, zeroGoalsNode, 0, 0, 0);
      const [line1] = el.querySelectorAll('tspan');
      expect(line1.textContent).toContain('0%');
    });

    it('handles null/zero percentage by defaulting to 0.00%', () => {
      const node = {
        id: 'status:Closed',
        count: 3,
        percentage: null,
        label: 'Closed',
      };
      const el = makeLabelText(SVG_NS, node, 0, 0, 0);
      const [line1] = el.querySelectorAll('tspan');
      expect(line1.textContent).toContain('0.00%');
    });
  });

  // -------------------------------------------------------------------------
  // shiftLabelY — tspan y-attribute adjustment
  // -------------------------------------------------------------------------

  describe('shiftLabelY', () => {
    function makeTextWithTspans(ys) {
      const text = makeSvgEl('text');
      ys.forEach((y) => {
        const ts = makeSvgEl('tspan');
        ts.setAttribute('y', `${y}`);
        text.appendChild(ts);
      });
      return text;
    }

    it('does nothing when labelElement is null', () => {
      expect(() => shiftLabelY(null, 10)).not.toThrow();
    });

    it('does nothing when deltaY is 0 / falsy', () => {
      const text = makeTextWithTspans([50, 66]);
      shiftLabelY(text, 0);
      const tspans = text.querySelectorAll('tspan');
      expect(tspans[0].getAttribute('y')).toBe('50');
    });

    it('shifts all tspan y values by deltaY', () => {
      const text = makeTextWithTspans([50, 66]);
      shiftLabelY(text, 10);
      const tspans = text.querySelectorAll('tspan');
      expect(tspans[0].getAttribute('y')).toBe('60');
      expect(tspans[1].getAttribute('y')).toBe('76');
    });

    it('handles negative delta', () => {
      const text = makeTextWithTspans([80]);
      shiftLabelY(text, -20);
      expect(text.querySelector('tspan').getAttribute('y')).toBe('60');
    });
  });

  // -------------------------------------------------------------------------
  // ensureSankeyPatterns — SVG <defs> creation
  // -------------------------------------------------------------------------

  describe('ensureSankeyPatterns', () => {
    it('does nothing when svg is null', () => {
      expect(() => ensureSankeyPatterns(null)).not.toThrow();
    });

    it('creates a <defs> element and inserts 5 patterns when none exist', () => {
      const svg = makeSvgEl('svg');
      ensureSankeyPatterns(svg);
      const defs = svg.querySelector('defs');
      expect(defs).not.toBeNull();
      expect(defs.querySelectorAll('pattern')).toHaveLength(5);
    });

    it('reuses an existing <defs> element instead of creating a new one', () => {
      const svg = makeSvgEl('svg');
      const existingDefs = document.createElementNS(SVG_NS, 'defs');
      svg.appendChild(existingDefs);
      ensureSankeyPatterns(svg);
      expect(svg.querySelectorAll('defs')).toHaveLength(1);
    });

    it('does not duplicate patterns when called twice', () => {
      const svg = makeSvgEl('svg');
      ensureSankeyPatterns(svg);
      ensureSankeyPatterns(svg); // second call — existing patterns should be skipped
      expect(svg.querySelectorAll('pattern')).toHaveLength(5);
    });

    it('each pattern has an id, width, height, and a base rect', () => {
      const svg = makeSvgEl('svg');
      ensureSankeyPatterns(svg);
      const patterns = svg.querySelectorAll('pattern');
      patterns.forEach((p) => {
        expect(p.getAttribute('id')).toBeTruthy();
        expect(p.getAttribute('width')).toBeTruthy();
        expect(p.querySelector('rect')).not.toBeNull();
      });
    });

    it('patterned categories include a stripe <path> element; solid categories do not', () => {
      const svg = makeSvgEl('svg');
      ensureSankeyPatterns(svg);
      const patterned = [
        'ttahub-sankey-pattern-goals',
        'ttahub-sankey-pattern-in-progress',
        'ttahub-sankey-pattern-closed',
        'ttahub-sankey-pattern-suspended',
      ];
      const solid = ['ttahub-sankey-pattern-not-started'];
      patterned.forEach((id) => {
        const p = svg.querySelector(`#${id}`);
        expect(p.querySelector('path')).not.toBeNull();
      });
      solid.forEach((id) => {
        const p = svg.querySelector(`#${id}`);
        expect(p.querySelector('path')).toBeNull();
      });
    });
  });

  // -------------------------------------------------------------------------
  // getBaseNodeShape — DOM query helpers
  // -------------------------------------------------------------------------

  describe('getBaseNodeShape', () => {
    it('returns null when group is null/undefined', () => {
      expect(getBaseNodeShape(null)).toBeNull();
      expect(getBaseNodeShape(undefined)).toBeNull();
    });

    it('returns a .node-rect element when present', () => {
      const group = makeSvgEl('g');
      const nodeRect = makeSvgEl('rect');
      nodeRect.classList.add('node-rect');
      const other = makeSvgEl('rect'); // not .node-rect
      group.appendChild(other);
      group.appendChild(nodeRect);
      expect(getBaseNodeShape(group)).toBe(nodeRect);
    });

    it('falls back to the first rect/path that is not a border overlay', () => {
      const group = makeSvgEl('g');
      const overlay = makeSvgEl('rect');
      overlay.classList.add('ttahub-border-overlay');
      const normalRect = makeSvgEl('rect');
      group.appendChild(overlay);
      group.appendChild(normalRect);
      expect(getBaseNodeShape(group)).toBe(normalRect);
    });

    it('returns null when the only elements are border overlays', () => {
      const group = makeSvgEl('g');
      const overlay = makeSvgEl('rect');
      overlay.classList.add('ttahub-border-overlay');
      group.appendChild(overlay);
      expect(getBaseNodeShape(group)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // applyGoalsLeftBorder — goals node borders (requires getBBox mock)
  // -------------------------------------------------------------------------

  describe('applyGoalsLeftBorder', () => {
    it('does nothing when svg is null', () => {
      expect(() => applyGoalsLeftBorder(null)).not.toThrow();
    });

    it('does nothing when there is no g.sankey-node in the svg', () => {
      const svg = makeSvgEl('svg');
      expect(() => applyGoalsLeftBorder(svg)).not.toThrow();
    });

    it('does nothing when the goals node has no rect/path', () => {
      const svg = makeSvgEl('svg');
      const group = makeSvgEl('g');
      group.classList.add('sankey-node');
      // no rect inside
      svg.appendChild(group);
      expect(() => applyGoalsLeftBorder(svg)).not.toThrow();
    });

    it('adds left and right border rects when getBBox returns valid dimensions', () => {
      const svg = makeSvgEl('svg');
      const group = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      svg.appendChild(group);

      applyGoalsLeftBorder(svg);

      expect(group.querySelector('#ttahub-goals-left-border')).not.toBeNull();
      expect(group.querySelector('#ttahub-goals-right-border')).not.toBeNull();
    });

    it('right border x is set to width - 12', () => {
      const svg = makeSvgEl('svg');
      const group = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      svg.appendChild(group);
      applyGoalsLeftBorder(svg);
      const rightBorder = group.querySelector('#ttahub-goals-right-border');
      expect(rightBorder.getAttribute('x')).toBe('88'); // 100 - 12
    });

    it('does nothing when both getBBox and DOM attributes return zero dimensions', () => {
      const svg = makeSvgEl('svg');
      const group = makeSvgEl('g');
      group.classList.add('sankey-node');
      const zeroRect = makeSvgEl('rect', { width: '0', height: '0' });
      zeroRect.classList.add('node-rect');
      zeroRect.getBBox = () => ({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
      group.appendChild(zeroRect);
      svg.appendChild(group);
      applyGoalsLeftBorder(svg);
      expect(group.querySelector('#ttahub-goals-left-border')).toBeNull();
    });

    it('updates existing border dimensions on a second call', () => {
      const svg = makeSvgEl('svg');
      const group = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      svg.appendChild(group);
      applyGoalsLeftBorder(svg);

      // Simulate a resize: update getBBox mock then re-run
      group.querySelector('.node-rect').getBBox = () => ({
        x: 0,
        y: 0,
        width: 120,
        height: 80,
      });
      applyGoalsLeftBorder(svg);

      const rightBorder = group.querySelector('#ttahub-goals-right-border');
      expect(rightBorder.getAttribute('x')).toBe('108'); // 120 - 12
      expect(rightBorder.getAttribute('height')).toBe('80');
    });
  });

  // -------------------------------------------------------------------------
  // applyGoalsLabel — Goals node white centered text
  // -------------------------------------------------------------------------

  describe('applyGoalsLabel', () => {
    const goalsNodeData = { id: 'goals', count: 10, label: 'Goals', percentage: 100 };

    it('does nothing when svg is null', () => {
      expect(() => applyGoalsLabel(null, { goalsNodeData })).not.toThrow();
    });

    it('does nothing when chartData has no goalsNodeData', () => {
      const svg = makeSvgEl('svg');
      expect(() => applyGoalsLabel(svg, {})).not.toThrow();
      expect(() => applyGoalsLabel(svg, null)).not.toThrow();
    });

    it('does nothing when there is no g.sankey-node in the svg', () => {
      const svg = makeSvgEl('svg');
      expect(() => applyGoalsLabel(svg, { goalsNodeData })).not.toThrow();
    });

    it('does nothing when goals node has no base shape', () => {
      const svg = makeSvgEl('svg');
      const group = makeSvgEl('g');
      group.classList.add('sankey-node');
      svg.appendChild(group);
      expect(() => applyGoalsLabel(svg, { goalsNodeData })).not.toThrow();
      expect(group.querySelector('.ttahub-goals-label')).toBeNull();
    });

    it('does nothing when bbox has zero dimensions', () => {
      const svg = makeSvgEl('svg');
      const group = makeSvgEl('g');
      group.classList.add('sankey-node');
      const rect = makeSvgEl('rect');
      rect.classList.add('node-rect');
      rect.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
      group.appendChild(rect);
      svg.appendChild(group);
      applyGoalsLabel(svg, { goalsNodeData });
      expect(group.querySelector('.ttahub-goals-label')).toBeNull();
    });

    it('creates a centered label with count/percent line and label line', () => {
      const svg = makeSvgEl('svg');
      const group = makeSankeyNodeGroup({ x: 0, y: 0, width: 100, height: 50 });
      svg.appendChild(group);

      applyGoalsLabel(svg, { goalsNodeData });

      const label = group.querySelector('.ttahub-goals-label');
      expect(label).not.toBeNull();
      const tspans = label.querySelectorAll('tspan');
      expect(tspans).toHaveLength(2);
      expect(tspans[0].textContent).toContain('10 (100%)');
      expect(tspans[1].textContent).toBe('Goals');
    });

    it('tspan y values are centered on the bbox midpoint', () => {
      const svg = makeSvgEl('svg');
      const group = makeSankeyNodeGroup({ x: 0, y: 0, width: 100, height: 50 });
      svg.appendChild(group);

      applyGoalsLabel(svg, { goalsNodeData });

      const [line1, line2] = group.querySelectorAll('.ttahub-goals-label tspan');
      // centerY = 0 + 50/2 = 25; lineGap = 16; line1 y = 25-8=17; line2 y = 25+8=33
      expect(line1.getAttribute('y')).toBe('17');
      expect(line2.getAttribute('y')).toBe('33');
    });

    it('replaces an existing goals label on re-call (idempotent)', () => {
      const svg = makeSvgEl('svg');
      const group = makeSankeyNodeGroup({ x: 0, y: 0, width: 100, height: 50 });
      svg.appendChild(group);

      applyGoalsLabel(svg, { goalsNodeData });
      applyGoalsLabel(svg, { goalsNodeData });

      expect(group.querySelectorAll('.ttahub-goals-label')).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // applyStatusRightBorders
  // -------------------------------------------------------------------------

  describe('applyStatusRightBorders', () => {
    it('does nothing when svg or chartData is null', () => {
      expect(() => applyStatusRightBorders(null, {})).not.toThrow();
      const svg = makeSvgEl('svg');
      expect(() => applyStatusRightBorders(svg, null)).not.toThrow();
    });

    it('adds right-border rects on each status node group', () => {
      const svg = makeSvgEl('svg');
      // index 0 = goals (skipped by slice(1)), indices 1–2 = status nodes
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup1 = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      const statusGroup2 = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 60,
      });
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup1);
      svg.appendChild(statusGroup2);

      const chartData = {
        statusNodeCount: 2,
        statusBorderColors: ['#AA0000', '#00AA00'],
        nodeColors: ['blue', '#AA0000', '#00AA00'],
      };
      applyStatusRightBorders(svg, chartData);

      expect(statusGroup1.querySelector('#ttahub-status-right-border-1')).not.toBeNull();
      expect(statusGroup2.querySelector('#ttahub-status-right-border-2')).not.toBeNull();
    });

    it('falls back to nodeColors when statusBorderColors has no entry', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);

      const chartData = {
        statusNodeCount: 1,
        statusBorderColors: [null], // null → fallback to nodeColors
        nodeColors: ['blue', '#FF0000'],
      };
      applyStatusRightBorders(svg, chartData);
      // border should still be added using nodeColors[1]
      const border = statusGroup.querySelector('#ttahub-status-right-border-1');
      expect(border).not.toBeNull();
    });

    it('skips status groups when no color can be resolved', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup = makeSankeyNodeGroup();
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);

      applyStatusRightBorders(svg, {
        statusNodeCount: 1,
        statusBorderColors: [null],
        nodeColors: ['blue', null],
      });

      expect(statusGroup.querySelector('#ttahub-status-right-border-1')).toBeNull();
    });

    it('skips status groups that do not have a base node shape', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup = makeSvgEl('g');
      statusGroup.classList.add('sankey-node');
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);

      applyStatusRightBorders(svg, {
        statusNodeCount: 1,
        statusBorderColors: ['#AA0000'],
        nodeColors: ['blue', '#AA0000'],
      });

      expect(statusGroup.querySelector('#ttahub-status-right-border-1')).toBeNull();
    });

    it('updates existing status border position and height on re-apply', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);

      const chartData = {
        statusNodeCount: 1,
        statusBorderColors: ['#AA0000'],
        nodeColors: ['blue', '#AA0000'],
      };

      applyStatusRightBorders(svg, chartData);
      statusGroup.querySelector('.node-rect').getBBox = () => ({
        x: 0,
        y: 0,
        width: 140,
        height: 80,
      });
      applyStatusRightBorders(svg, chartData);

      const border = statusGroup.querySelector('#ttahub-status-right-border-1');
      expect(border.getAttribute('x')).toBe('128');
      expect(border.getAttribute('height')).toBe('80');
    });

    it('skips a group when both getBBox and DOM attributes return zero dimensions', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();

      // Both the getBBox mock AND the DOM attributes must be zero for the guard to fire
      const statusGroup = makeSvgEl('g');
      statusGroup.classList.add('sankey-node');
      const zeroRect = makeSvgEl('rect', { width: '0', height: '0' });
      zeroRect.classList.add('node-rect');
      zeroRect.getBBox = () => ({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
      statusGroup.appendChild(zeroRect);

      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);

      const chartData = {
        statusNodeCount: 1,
        statusBorderColors: ['red'],
        nodeColors: ['blue', 'red'],
      };
      applyStatusRightBorders(svg, chartData);
      expect(statusGroup.querySelector('#ttahub-status-right-border-1')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // applyReasonNodeBorders
  // -------------------------------------------------------------------------

  describe('applyReasonNodeBorders', () => {
    it('does nothing when svg or chartData is null', () => {
      expect(() => applyReasonNodeBorders(null, {})).not.toThrow();
      const svg = makeSvgEl('svg');
      expect(() => applyReasonNodeBorders(svg, null)).not.toThrow();
    });

    it('adds only a right border rect on each reason node group', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup = makeSankeyNodeGroup();
      const reasonGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 40,
      });
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);
      svg.appendChild(reasonGroup);

      const chartData = {
        statusNodeCount: 1,
        reasonNodeBorderColors: ['#00AAAA'],
      };
      applyReasonNodeBorders(svg, chartData);

      expect(reasonGroup.querySelector('#ttahub-reason-right-border-0')).not.toBeNull();
    });

    it('skips reason groups with a falsy borderColor entry', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup = makeSankeyNodeGroup();
      const reasonGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 40,
      });
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);
      svg.appendChild(reasonGroup);

      applyReasonNodeBorders(svg, { statusNodeCount: 1, reasonNodeBorderColors: [null] });
      expect(reasonGroup.querySelector('#ttahub-reason-right-border-0')).toBeNull();
    });

    it('skips groups when both getBBox and DOM attributes return zero dimensions', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup = makeSankeyNodeGroup();

      const reasonGroup = makeSvgEl('g');
      reasonGroup.classList.add('sankey-node');
      const zeroRect = makeSvgEl('rect', { width: '0', height: '0' });
      zeroRect.classList.add('node-rect');
      zeroRect.getBBox = () => ({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
      reasonGroup.appendChild(zeroRect);

      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);
      svg.appendChild(reasonGroup);

      applyReasonNodeBorders(svg, { statusNodeCount: 1, reasonNodeBorderColors: ['red'] });
      expect(reasonGroup.querySelector('#ttahub-reason-right-border-0')).toBeNull();
    });

    it('skips reason groups without a base node shape', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup = makeSankeyNodeGroup();
      const reasonGroup = makeSvgEl('g');
      reasonGroup.classList.add('sankey-node');

      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);
      svg.appendChild(reasonGroup);

      applyReasonNodeBorders(svg, { statusNodeCount: 1, reasonNodeBorderColors: ['red'] });
      expect(reasonGroup.querySelector('#ttahub-reason-right-border-0')).toBeNull();
    });

    it('updates existing reason borders on re-apply', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup = makeSankeyNodeGroup();
      const reasonGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 40,
      });
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);
      svg.appendChild(reasonGroup);

      const chartData = {
        statusNodeCount: 1,
        reasonNodeBorderColors: ['#00AAAA'],
      };

      applyReasonNodeBorders(svg, chartData);
      reasonGroup.querySelector('.node-rect').getBBox = () => ({
        x: 0,
        y: 0,
        width: 130,
        height: 70,
      });
      applyReasonNodeBorders(svg, chartData);

      const rightBorder = reasonGroup.querySelector('#ttahub-reason-right-border-0');
      expect(rightBorder.getAttribute('x')).toBe('118');
      expect(rightBorder.getAttribute('height')).toBe('70');
    });
  });

  // -------------------------------------------------------------------------
  // applyCustomLinkPaths
  // -------------------------------------------------------------------------

  describe('applyCustomLinkPaths', () => {
    it('does nothing when svg or chartData is null', () => {
      expect(() => applyCustomLinkPaths(null, {})).not.toThrow();
      const svg = makeSvgEl('svg');
      expect(() => applyCustomLinkPaths(svg, null)).not.toThrow();
    });

    it('does nothing when there are no parseable link paths', () => {
      const svg = makeSvgEl('svg');
      // Add a path with an unparseable d attribute
      const path = makeSvgEl('path');
      path.classList.add('sankey-link');
      path.setAttribute('d', 'M 0 0'); // too few points
      svg.appendChild(path);

      expect(() =>
        applyCustomLinkPaths(svg, {
          linkSources: ['goals'],
          linkTargets: ['status:Not Started'],
        })
      ).not.toThrow();
    });

    it('applies a straight custom path to goals→Not Started links identified by chartData indices', () => {
      const svg = makeSvgEl('svg');
      // 16-point path: goals → Not Started
      const goalsToNotStarted = makeSvgEl('path');
      goalsToNotStarted.classList.add('sankey-link');
      goalsToNotStarted.setAttribute(
        'd',
        'M 0 10 C 25 10 75 30 100 30 L 100 50 C 75 50 25 70 0 70'
      );
      svg.appendChild(goalsToNotStarted);

      // 16-point path: status → reason (should also get overlap extension applied)
      const statusToReason = makeSvgEl('path');
      statusToReason.classList.add('sankey-link');
      statusToReason.setAttribute(
        'd',
        'M 100 30 C 150 30 190 40 200 40 L 200 50 C 190 50 150 60 100 60'
      );
      svg.appendChild(statusToReason);

      const chartData = {
        linkSources: ['goals', 'status:Closed'],
        linkTargets: ['status:Not Started', 'reason:Closed:Foo'],
        notStartedLinkIndex: 0,
        statusNodeGroupIndexById: { 'status:Not Started': 1 },
      };

      applyCustomLinkPaths(svg, chartData);

      // Both goals→status and status→reason links should have a custom-d attribute
      expect(goalsToNotStarted.getAttribute('data-ttahub-custom-d')).not.toBeNull();
      expect(goalsToNotStarted.getAttribute('d')).not.toContain(' C ');
      // Ensure the Not Started band is a clean rectangle (no intermediate collinear points).
      expect(goalsToNotStarted.getAttribute('d')).toContain('M -3 30');
      expect(goalsToNotStarted.getAttribute('d')).toContain('L 103 30');
      expect(goalsToNotStarted.getAttribute('d')).not.toContain('L 0 30');
      expect(statusToReason.getAttribute('data-ttahub-custom-d')).not.toBeNull();
    });

    it('restores original path before recomputing on a second call', () => {
      const svg = makeSvgEl('svg');
      const path = makeSvgEl('path');
      path.classList.add('sankey-link');
      const originalD = 'M 0 10 C 25 10 75 30 100 30 L 100 50 C 75 50 25 70 0 70';
      path.setAttribute('d', originalD);
      svg.appendChild(path);

      const chartData = {
        linkSources: ['goals'],
        linkTargets: ['status:Not Started'],
        notStartedLinkIndex: 0,
        statusNodeGroupIndexById: { 'status:Not Started': 1 },
      };

      applyCustomLinkPaths(svg, chartData);
      const afterFirst = path.getAttribute('d');

      // Second call: simulate Plotly re-render by keeping the custom path as current d
      applyCustomLinkPaths(svg, chartData);

      // Path after second call should be a custom path (recomputed from the stored original)
      expect(path.getAttribute('d')).toBeTruthy();
      // The data-ttahub-original-d should still hold the original
      expect(path.getAttribute('data-ttahub-original-d')).toBe(originalD);
      // Both calls produce the same custom result since source data didn't change
      expect(path.getAttribute('d')).toBe(afterFirst);
    });

    it('falls back to topmost-link heuristic when notStartedLinkIndex is -1 and no chartData match', () => {
      const svg = makeSvgEl('svg');
      const path = makeSvgEl('path');
      path.classList.add('sankey-link');
      path.setAttribute('d', 'M 0 10 C 25 10 75 30 100 30 L 100 50 C 75 50 25 70 0 70');
      svg.appendChild(path);

      // No matching source in chartData → fallback
      const chartData = {
        linkSources: ['goals'],
        linkTargets: ['status:Not Started'],
        notStartedLinkIndex: -1,
        statusNodeGroupIndexById: {},
      };

      expect(() => applyCustomLinkPaths(svg, chartData)).not.toThrow();
    });

    it('uses source-X fallback when chartData ordering does not identify goals links', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      svg.appendChild(goalsGroup);

      const path = makeSvgEl('path');
      path.classList.add('sankey-link');
      path.setAttribute('d', 'M 100 10 C 125 10 175 30 200 30 L 200 50 C 175 50 125 70 100 70');
      svg.appendChild(path);

      applyCustomLinkPaths(svg, {
        linkSources: ['status:Closed'],
        linkTargets: ['status:Not Started'],
        statusNodeGroupIndexById: {},
        notStartedLinkIndex: 0,
      });

      expect(path.getAttribute('data-ttahub-custom-d')).not.toBeNull();
    });

    it('uses midpoint heuristic when goals node is absent', () => {
      const svg = makeSvgEl('svg');

      const leftPath = makeSvgEl('path');
      leftPath.classList.add('sankey-link');
      leftPath.setAttribute('d', 'M 0 10 C 25 10 75 30 100 30 L 100 50 C 75 50 25 70 0 70');
      svg.appendChild(leftPath);

      const rightPath = makeSvgEl('path');
      rightPath.classList.add('sankey-link');
      rightPath.setAttribute(
        'd',
        'M 100 10 C 125 10 175 30 200 30 L 200 50 C 175 50 125 70 100 70'
      );
      svg.appendChild(rightPath);

      applyCustomLinkPaths(svg, {
        linkSources: ['status:Closed', 'status:Closed'],
        linkTargets: ['status:Not Started', 'status:In Progress'],
        statusNodeGroupIndexById: {},
        notStartedLinkIndex: -1,
      });

      expect(leftPath.getAttribute('data-ttahub-custom-d')).not.toBeNull();
      expect(rightPath.getAttribute('data-ttahub-custom-d')).toBeNull();
    });

    it('uses Not Started target y for a horizontal first goals-link when index mapping is unavailable', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      const notStartedStatusGroup = makeSankeyNodeGroup({
        x: 110,
        y: 200,
        width: 80,
        height: 60,
      });
      svg.appendChild(goalsGroup);
      svg.appendChild(notStartedStatusGroup);

      const pathA = makeSvgEl('path');
      pathA.classList.add('sankey-link');
      pathA.setAttribute('d', 'M 100 10 C 125 10 175 30 200 30 L 200 50 C 175 50 125 70 100 70');
      svg.appendChild(pathA);

      const pathB = makeSvgEl('path');
      pathB.classList.add('sankey-link');
      pathB.setAttribute(
        'd',
        'M 100 200 C 125 200 175 220 200 220 L 200 240 C 175 240 125 260 100 260'
      );
      svg.appendChild(pathB);

      applyCustomLinkPaths(svg, {
        linkSources: ['status:Closed', 'status:Closed'],
        linkTargets: ['status:Not Started', 'status:In Progress'],
        statusNodeGroupIndexById: { 'status:Not Started': 1 },
        notStartedLinkIndex: -1,
      });

      // Not Started and In Progress links are horizontal and anchored to target Y.
      expect(pathA.getAttribute('d')).toContain('M 97 30');
      expect(pathB.getAttribute('d')).toContain('M 97 220');
    });

    it('renders the Not Started goals-link band as horizontal at target Y', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      svg.appendChild(goalsGroup);

      const topPath = makeSvgEl('path');
      topPath.classList.add('sankey-link');
      topPath.setAttribute('d', 'M 100 10 C 125 10 175 30 200 30 L 200 50 C 175 50 125 70 100 70');
      svg.appendChild(topPath);

      const lowerPath = makeSvgEl('path');
      lowerPath.classList.add('sankey-link');
      lowerPath.setAttribute(
        'd',
        'M 100 30 C 125 30 175 45 200 45 L 200 65 C 175 65 125 80 100 80'
      );
      svg.appendChild(lowerPath);

      applyCustomLinkPaths(svg, {
        linkSources: ['status:Closed', 'status:Suspended'],
        linkTargets: ['status:Not Started', 'status:In Progress'],
        statusNodeGroupIndexById: {},
        notStartedLinkIndex: 0,
      });

      // Not Started and In Progress paths start at each target top Y, not source Y.
      expect(topPath.getAttribute('d')).toContain('M 97 30');
      expect(lowerPath.getAttribute('d')).toContain('M 97 45');
    });

    it('shifts curved Closed link down when its Goals-side source overlaps the In Progress horizontal band', () => {
      // In Progress straight link: ty2=50. Closed curved link: sy1=30, inside the band.
      // Expected shift = ty2_ip - sy1_closed = 50 - 30 = 20 → Closed departs at sy1+20 = 50.
      const svg = makeSvgEl('svg');
      const inProgressPath = makeSvgEl('path');
      inProgressPath.classList.add('sankey-link');
      // Straight rectangle: M(sx,sy1) L(tx,ty1) L(tx,ty2) L(sx,sy2)
      inProgressPath.setAttribute('d', 'M 100 20 L 200 20 L 200 50 L 100 50');
      svg.appendChild(inProgressPath);

      const closedPath = makeSvgEl('path');
      closedPath.classList.add('sankey-link');
      // Curved S-curve: sy1=30, ty1=70
      closedPath.setAttribute(
        'd',
        'M 100 30 C 125 30 175 70 200 70 L 200 90 C 175 90 125 60 100 60'
      );
      svg.appendChild(closedPath);

      applyCustomLinkPaths(svg, {
        linkSources: ['goals', 'goals'],
        linkTargets: ['status:In Progress', 'status:Closed'],
        statusNodeGroupIndexById: {},
      });

      // In Progress stays horizontal at ty1=20.
      expect(inProgressPath.getAttribute('d')).toContain('M 97 20');
      expect(inProgressPath.getAttribute('d')).not.toContain(' C ');
      // Closed is shifted down by 20px: original sy1=30 → adjusted=50 (= ty2_ip).
      expect(closedPath.getAttribute('d')).toContain('M 97 50');
      expect(closedPath.getAttribute('d')).toContain(' C ');
    });

    it('extends Goals→Closed path to status right edge when reason links are present', () => {
      // Closed curved link: sx=100, tx=200, ty1=70, ty2=90, sy1=60, sy2=80
      // Reason link source x (status right edge) = 350
      // Expected: Goals→Closed path ends at L 350 70 / L 350 90 instead of L 203 70 / L 203 90
      const svg = makeSvgEl('svg');

      const closedPath = makeSvgEl('path');
      closedPath.classList.add('sankey-link');
      closedPath.setAttribute(
        'd',
        'M 100 60 C 125 60 175 70 200 70 L 200 90 C 175 90 125 80 100 80'
      );
      svg.appendChild(closedPath);

      const reasonPath = makeSvgEl('path');
      reasonPath.classList.add('sankey-link');
      // Reason link: sx=350 (status right edge), tx=500
      reasonPath.setAttribute(
        'd',
        'M 350 70 C 400 70 450 80 500 80 L 500 90 C 450 90 400 85 350 85'
      );
      svg.appendChild(reasonPath);

      applyCustomLinkPaths(svg, {
        linkSources: ['goals', 'status:Closed'],
        linkTargets: ['status:Closed', 'reason:Closed:TTA Complete'],
        statusNodeGroupIndexById: {},
      });

      const d = closedPath.getAttribute('d');
      // Path must extend all the way to the status right edge (350), not just tx+OVERLAP (203).
      expect(d).toContain('L 350 70');
      expect(d).toContain('L 350 90');
      expect(d).not.toContain('L 203 70');
      // Still an S-curve.
      expect(d).toContain(' C ');
    });

    it('falls back to tx+OVERLAP for curved Goals→status links with no reason links', () => {
      const svg = makeSvgEl('svg');
      const closedPath = makeSvgEl('path');
      closedPath.classList.add('sankey-link');
      closedPath.setAttribute(
        'd',
        'M 100 60 C 125 60 175 70 200 70 L 200 90 C 175 90 125 80 100 80'
      );
      svg.appendChild(closedPath);

      applyCustomLinkPaths(svg, {
        linkSources: ['goals'],
        linkTargets: ['status:Closed'],
        statusNodeGroupIndexById: {},
      });

      const d = closedPath.getAttribute('d');
      // No reason links → falls back to tx+OVERLAP = 200+3 = 203.
      expect(d).toContain('L 203 70');
    });

    it('extends the Goals node height when curved links are shifted down', () => {
      const svg = makeSvgEl('svg');

      // Goals node group with a rect (height=40) and existing border overlays.
      const goalsGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 30,
        height: 40,
      });
      const leftBorder = makeSvgEl('rect');
      leftBorder.setAttribute('id', 'ttahub-goals-left-border');
      leftBorder.setAttribute('height', '40');
      goalsGroup.appendChild(leftBorder);
      const rightBorder = makeSvgEl('rect');
      rightBorder.setAttribute('id', 'ttahub-goals-right-border');
      rightBorder.setAttribute('height', '40');
      goalsGroup.appendChild(rightBorder);
      svg.appendChild(goalsGroup);

      // In Progress (straight): ty2=50
      const ipPath = makeSvgEl('path');
      ipPath.classList.add('sankey-link');
      ipPath.setAttribute('d', 'M 100 20 L 200 20 L 200 50 L 100 50');
      svg.appendChild(ipPath);

      // Closed (curved): sy1=30, inside the In Progress band → shift = ty2-sy1 = 20
      const closedPath = makeSvgEl('path');
      closedPath.classList.add('sankey-link');
      closedPath.setAttribute(
        'd',
        'M 100 30 C 125 30 175 70 200 70 L 200 90 C 175 90 125 60 100 60'
      );
      svg.appendChild(closedPath);

      applyCustomLinkPaths(svg, {
        linkSources: ['goals', 'goals'],
        linkTargets: ['status:In Progress', 'status:Closed'],
        statusNodeGroupIndexById: {},
      });

      // Extension height is computed from the actual shifted curved-link bottom so
      // it always covers any gap between the Goals rect and the link departure point.
      // maxCurvedSy2=60, shift=20 → shifted bottom=80, Goals rect bottom=40 (gy=0),
      // neededExtHeight = max(21, 80-0-0-40+1+2) = max(21, 43) = 43.
      const ext = goalsGroup.querySelector('.ttahub-goals-ext');
      expect(ext).not.toBeNull();
      expect(ext.getAttribute('height')).toBe('43');

      // Borders are extended to match: currentH(40) + neededExtHeight(43) - overlap(1) = 82.
      expect(leftBorder.getAttribute('height')).toBe('82');
      expect(rightBorder.getAttribute('height')).toBe('82');
    });
  });

  // -------------------------------------------------------------------------
  // getNodeColor
  // -------------------------------------------------------------------------

  describe('getNodeColor', () => {
    it('returns the mapped color for status nodes', () => {
      expect(getNodeColor({ id: 'status:Closed' })).toBe(colors.ttahubSankeyGreen);
    });

    it('returns Sankey green/red for known reason prefixes', () => {
      expect(getNodeColor({ id: 'reason:Closed:Done' })).toBe(colors.ttahubSankeyGreen);
      expect(getNodeColor({ id: 'reason:Suspended:Other' })).toBe(colors.ttahubSankeyRed);
    });

    it('falls back to baseMedium for unknown ids', () => {
      expect(getNodeColor({ id: 'custom:Unknown' })).toBe(colors.baseMedium);
    });
  });

  // -------------------------------------------------------------------------
  // applyStatusLabels
  // -------------------------------------------------------------------------

  describe('applyStatusLabels', () => {
    it('does nothing when svg or chartData is missing', () => {
      expect(() => applyStatusLabels(null, {})).not.toThrow();
      const svg = makeSvgEl('svg');
      expect(() => applyStatusLabels(svg, null)).not.toThrow();
    });

    it('skips groups when no node data exists at that index', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup = makeSankeyNodeGroup();
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);

      applyStatusLabels(svg, {
        allNonGoalsNodes: [],
        statusIdsWithReasons: new Set(),
        leftAlignAllStatusLabels: true,
      });

      expect(statusGroup.querySelector('.ttahub-status-label')).toBeNull();
    });

    it('removes a stale label before creating the current one', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup = makeSankeyNodeGroup({
        x: 10,
        y: 20,
        width: 100,
        height: 40,
      });
      const stale = makeSvgEl('text');
      stale.classList.add('ttahub-status-label');
      statusGroup.appendChild(stale);

      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);

      applyStatusLabels(svg, {
        allNonGoalsNodes: [
          {
            id: 'status:Not Started',
            label: 'Not Started',
            count: 7,
            percentage: 70,
          },
        ],
        statusIdsWithReasons: new Set(),
        leftAlignAllStatusLabels: true,
      });

      expect(statusGroup.querySelectorAll('.ttahub-status-label')).toHaveLength(1);
    });

    it('skips groups with no base shape', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup = makeSvgEl('g');
      statusGroup.classList.add('sankey-node');
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);

      applyStatusLabels(svg, {
        allNonGoalsNodes: [
          {
            id: 'status:Closed',
            label: 'Closed',
            count: 4,
            percentage: 40,
          },
        ],
        statusIdsWithReasons: new Set(),
        leftAlignAllStatusLabels: true,
      });

      expect(statusGroup.querySelector('.ttahub-status-label')).toBeNull();
    });

    it('skips groups with zero-sized node bounds', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup();
      const statusGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);

      applyStatusLabels(svg, {
        allNonGoalsNodes: [
          {
            id: 'status:Closed',
            label: 'Closed',
            count: 4,
            percentage: 40,
          },
        ],
        statusIdsWithReasons: new Set(),
        leftAlignAllStatusLabels: true,
      });

      expect(statusGroup.querySelector('.ttahub-status-label')).toBeNull();
    });

    it('centers labels for Not Started status nodes', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      const statusGroup = makeSankeyNodeGroup({
        x: 10,
        y: 20,
        width: 100,
        height: 40,
      });
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);

      applyStatusLabels(svg, {
        allNonGoalsNodes: [
          {
            id: 'status:Not Started',
            label: 'Not Started',
            count: 7,
            percentage: 70,
          },
        ],
        statusIdsWithReasons: new Set(),
        leftAlignAllStatusLabels: true,
      });

      const label = statusGroup.querySelector('.ttahub-status-label');
      expect(label).not.toBeNull();
      const [line1] = label.querySelectorAll('tspan');
      expect(line1.getAttribute('y')).toBe('32'); // centerY (40) - lineGap/2
    });

    it('aligns status-with-reason labels at the same x as other status labels', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      const statusGroup = makeSankeyNodeGroup({
        x: 10,
        y: 20,
        width: 100,
        height: 40,
      });
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);

      applyStatusLabels(svg, {
        allNonGoalsNodes: [
          {
            id: 'status:Closed',
            label: 'Closed',
            count: 4,
            percentage: 40,
          },
        ],
        statusIdsWithReasons: new Set(['status:Closed']),
      });

      const label = statusGroup.querySelector('.ttahub-status-label');
      const [line1] = label.querySelectorAll('tspan');
      expect(line1.getAttribute('x')).toBe('120'); // x + width + GAP (no left shift)
    });

    it('centers reason-node labels on the bar midpoint', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      const reasonGroup = makeSankeyNodeGroup({
        x: 10,
        y: 20,
        width: 100,
        height: 40,
      });
      svg.appendChild(goalsGroup);
      svg.appendChild(reasonGroup);

      applyStatusLabels(svg, {
        allNonGoalsNodes: [
          {
            id: 'reason:Closed:Done',
            label: 'Done',
            count: 2,
            percentage: 20,
          },
        ],
        statusIdsWithReasons: new Set(),
        leftAlignAllStatusLabels: true,
      });

      const label = reasonGroup.querySelector('.ttahub-status-label');
      expect(label).not.toBeNull();
      const [line1, line2] = label.querySelectorAll('tspan');
      expect(line1.getAttribute('y')).toBe('32');
      expect(line2.getAttribute('y')).toBe('48');
    });

    it('places non-branching status labels above the node', () => {
      const svg = makeSvgEl('svg');
      const goalsGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      const statusGroup = makeSankeyNodeGroup({
        x: 10,
        y: 40,
        width: 100,
        height: 40,
      });
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);

      applyStatusLabels(svg, {
        allNonGoalsNodes: [
          {
            id: 'status:Closed',
            label: 'Closed',
            count: 2,
            percentage: 20,
          },
        ],
        statusIdsWithReasons: new Set(),
        leftAlignAllStatusLabels: true,
      });

      const label = statusGroup.querySelector('.ttahub-status-label');
      const [line1, line2] = label.querySelectorAll('tspan');
      expect(line1.getAttribute('y')).toBe('14');
      expect(line2.getAttribute('y')).toBe('30');
    });

    it('places later status-with-reasons labels below when above would overlap', () => {
      const originalGetBoundingClientRect = window.SVGElement.prototype.getBoundingClientRect;
      try {
        window.SVGElement.prototype.getBoundingClientRect = function mockRect() {
          if (this.classList?.contains('ttahub-status-label')) {
            const firstY = parseFloat(this.querySelector('tspan')?.getAttribute('y') || '0');
            return {
              x: 0,
              y: firstY,
              width: 100,
              height: 20,
              top: firstY,
              right: 100,
              bottom: firstY + 20,
              left: 0,
              toJSON: () => ({}),
            };
          }
          return {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            toJSON: () => ({}),
          };
        };

        const svg = makeSvgEl('svg');
        const goalsGroup = makeSankeyNodeGroup({
          x: 0,
          y: 0,
          width: 100,
          height: 50,
        });
        const statusGroup1 = makeSankeyNodeGroup({
          x: 10,
          y: 100,
          width: 100,
          height: 40,
        });
        const statusGroup2 = makeSankeyNodeGroup({
          x: 10,
          y: 100,
          width: 100,
          height: 40,
        });
        svg.appendChild(goalsGroup);
        svg.appendChild(statusGroup1);
        svg.appendChild(statusGroup2);

        applyStatusLabels(svg, {
          allNonGoalsNodes: [
            {
              id: 'status:Closed',
              label: 'Closed',
              count: 3,
              percentage: 30,
            },
            {
              id: 'status:Suspended',
              label: 'Suspended',
              count: 2,
              percentage: 20,
            },
          ],
          statusIdsWithReasons: new Set(['status:Closed', 'status:Suspended']),
          leftAlignAllStatusLabels: true,
        });

        const firstLabelY = parseFloat(
          statusGroup1.querySelector('.ttahub-status-label tspan').getAttribute('y')
        );
        const secondLabelY = parseFloat(
          statusGroup2.querySelector('.ttahub-status-label tspan').getAttribute('y')
        );

        expect(secondLabelY).toBeGreaterThan(firstLabelY);
        expect(secondLabelY).toBe(152);
      } finally {
        window.SVGElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      }
    });

    it('nudges second label down via while loop when placed below but still overlaps previous label', () => {
      const originalGetBCR = window.SVGElement.prototype.getBoundingClientRect;
      try {
        window.SVGElement.prototype.getBoundingClientRect = function mockBCR() {
          if (this.classList?.contains('ttahub-status-label')) {
            const firstTspan = this.querySelector('tspan');
            const y = parseFloat(firstTspan?.getAttribute('y') || '0');
            return {
              top: y,
              bottom: y + 20,
              left: 0,
              right: 100,
              width: 100,
              height: 20,
              x: 0,
              y,
              toJSON: () => ({}),
            };
          }
          return {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          };
        };

        const svg = makeSvgEl('svg');
        const goalsGroup = makeSankeyNodeGroup({ x: 0, y: 0, width: 100, height: 50 });
        // First node: above label at y = 200 - 12 - 16 = 172; getBCR top=172, bottom=192
        const firstStatusGroup = makeSankeyNodeGroup({ x: 10, y: 200, width: 100, height: 40 });
        // Second node: above label at y = 100 - 12 - 16 = 72 < 192+6 → placeBelow=true
        // Below label at y = 100 + 40 + 12 = 152; 152 < 192+6=198 → while loop fires
        const secondStatusGroup = makeSankeyNodeGroup({ x: 10, y: 100, width: 100, height: 40 });
        svg.appendChild(goalsGroup);
        svg.appendChild(firstStatusGroup);
        svg.appendChild(secondStatusGroup);

        applyStatusLabels(svg, {
          allNonGoalsNodes: [
            { id: 'status:Closed', label: 'Closed', count: 5, percentage: 50 },
            { id: 'status:Suspended', label: 'Suspended', count: 5, percentage: 50 },
          ],
          statusIdsWithReasons: new Set(['status:Closed', 'status:Suspended']),
        });

        const secondLabel = secondStatusGroup.querySelector('.ttahub-status-label');
        expect(secondLabel).not.toBeNull();
        // While loop should have nudged the label until top >= previousBottom + MIN_GAP (6)
        const secondTspan = secondLabel.querySelector('tspan');
        expect(parseFloat(secondTspan.getAttribute('y'))).toBeGreaterThanOrEqual(198);
      } finally {
        window.SVGElement.prototype.getBoundingClientRect = originalGetBCR;
      }
    });
  });

  // -------------------------------------------------------------------------
  // applySankeyPatterns
  // -------------------------------------------------------------------------

  describe('applySankeyPatterns', () => {
    it('returns early when container or chartData is missing', () => {
      expect(() => applySankeyPatterns(null, {})).not.toThrow();
      const container = document.createElement('div');
      expect(() => applySankeyPatterns(container, null)).not.toThrow();
    });

    it('returns early when main svg is not present in container', () => {
      const container = document.createElement('div');
      expect(() =>
        applySankeyPatterns(container, {
          nodePatternIds: [],
          linkPatternIds: [],
        })
      ).not.toThrow();
    });

    it('applies node/link pattern fills and rebuilt overlays', () => {
      const container = document.createElement('div');
      const svg = makeSvgEl('svg');
      svg.classList.add('main-svg');
      container.appendChild(svg);

      const goalsGroup = makeSankeyNodeGroup({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      const statusGroup = makeSankeyNodeGroup({
        x: 10,
        y: 20,
        width: 100,
        height: 40,
      });
      svg.appendChild(goalsGroup);
      svg.appendChild(statusGroup);

      const staleOverlay = makeSvgEl('rect');
      staleOverlay.classList.add('ttahub-border-overlay');
      staleOverlay.setAttribute('id', 'stale-overlay');
      statusGroup.appendChild(staleOverlay);

      const link = makeSvgEl('path');
      link.classList.add('sankey-link');
      link.setAttribute('d', 'M 0 10 C 25 10 75 30 100 30 L 100 50 C 75 50 25 70 0 70');
      svg.appendChild(link);

      const chartData = {
        nodePatternIds: ['ttahub-sankey-pattern-goals', 'ttahub-sankey-pattern-not-started'],
        statusNodeCount: 1,
        statusBorderColors: ['#005ea2'],
        nodeColors: ['#2e2e2e', '#005ea2'],
        reasonNodeBorderColors: [],
        allNonGoalsNodes: [
          {
            id: 'status:Not Started',
            label: 'Not Started',
            count: 1,
            percentage: 100,
          },
        ],
        statusIdsWithReasons: new Set(),
        leftAlignAllStatusLabels: true,
        linkPatternIds: ['ttahub-sankey-pattern-not-started'],
        linkSources: ['goals'],
        linkTargets: ['status:Not Started'],
        statusNodeGroupIndexById: { 'status:Not Started': 1 },
        notStartedLinkIndex: 0,
      };

      applySankeyPatterns(container, chartData);

      expect(svg.querySelector('defs')).not.toBeNull();
      expect(statusGroup.querySelector('#stale-overlay')).toBeNull();
      expect(statusGroup.querySelector('.ttahub-status-label')).not.toBeNull();
      expect(goalsGroup.querySelector('.node-rect').getAttribute('fill')).toBe(
        'url(#ttahub-sankey-pattern-goals)'
      );
      expect(link.getAttribute('fill')).toBe('url(#ttahub-sankey-pattern-not-started)');
    });

    it('clones a phase-offset pattern when a node group has a non-zero translate transform', () => {
      const container = document.createElement('div');
      const svg = makeSvgEl('svg');
      svg.classList.add('main-svg');
      container.appendChild(svg);

      // translate(5, 3): tile size 8×8 → ox=((-5%8)+8)%8=3, oy=((-3%8)+8)%8=5 (both non-zero)
      const goalsGroup = makeSankeyNodeGroup({ x: 0, y: 0, width: 100, height: 50 });
      goalsGroup.setAttribute('transform', 'translate(5, 3)');
      svg.appendChild(goalsGroup);

      const chartData = {
        nodePatternIds: ['ttahub-sankey-pattern-goals'],
        statusNodeCount: 0,
        statusBorderColors: [],
        nodeColors: ['#2e2e2e'],
        reasonNodeBorderColors: [],
        allNonGoalsNodes: [],
        statusIdsWithReasons: new Set(),
        linkPatternIds: [],
        linkSources: [],
        linkTargets: [],
        statusNodeGroupIndexById: {},
        goalsNodeData: { id: 'goals', count: 5, label: 'Goals', percentage: 100 },
      };

      applySankeyPatterns(container, chartData);

      const defs = svg.querySelector('defs');
      // Offset pattern should be created for the non-zero translate
      expect(defs.querySelector('#ttahub-sankey-pattern-goals-ox3-oy5')).not.toBeNull();
      // Node fill should use the offset pattern
      expect(goalsGroup.querySelector('.node-rect').getAttribute('fill')).toBe(
        'url(#ttahub-sankey-pattern-goals-ox3-oy5)'
      );
    });

    it('does not duplicate offset patterns on a second call', () => {
      const container = document.createElement('div');
      const svg = makeSvgEl('svg');
      svg.classList.add('main-svg');
      container.appendChild(svg);

      const goalsGroup = makeSankeyNodeGroup({ x: 0, y: 0, width: 100, height: 50 });
      goalsGroup.setAttribute('transform', 'translate(5, 3)');
      svg.appendChild(goalsGroup);

      const chartData = {
        nodePatternIds: ['ttahub-sankey-pattern-goals'],
        statusNodeCount: 0,
        statusBorderColors: [],
        nodeColors: ['#2e2e2e'],
        reasonNodeBorderColors: [],
        allNonGoalsNodes: [],
        statusIdsWithReasons: new Set(),
        linkPatternIds: [],
        linkSources: [],
        linkTargets: [],
        statusNodeGroupIndexById: {},
        goalsNodeData: { id: 'goals', count: 5, label: 'Goals', percentage: 100 },
      };

      applySankeyPatterns(container, chartData);
      applySankeyPatterns(container, chartData);

      const defs = svg.querySelector('defs');
      expect(defs.querySelectorAll('#ttahub-sankey-pattern-goals-ox3-oy5')).toHaveLength(1);
    });

    it('removes clip-path from link style when present as a style property', () => {
      const container = document.createElement('div');
      const svg = makeSvgEl('svg');
      svg.classList.add('main-svg');
      container.appendChild(svg);

      const goalsGroup = makeSankeyNodeGroup({ x: 0, y: 0, width: 100, height: 50 });
      svg.appendChild(goalsGroup);

      const link = makeSvgEl('path');
      link.classList.add('sankey-link');
      link.setAttribute('style', 'clip-path: url(#clip0); opacity: 1;');
      svg.appendChild(link);

      const chartData = {
        nodePatternIds: ['ttahub-sankey-pattern-goals'],
        statusNodeCount: 0,
        statusBorderColors: [],
        nodeColors: ['#2e2e2e'],
        reasonNodeBorderColors: [],
        allNonGoalsNodes: [],
        statusIdsWithReasons: new Set(),
        linkPatternIds: ['ttahub-sankey-pattern-goals'],
        linkSources: [],
        linkTargets: [],
        statusNodeGroupIndexById: {},
        goalsNodeData: { id: 'goals', count: 5, label: 'Goals', percentage: 100 },
      };

      applySankeyPatterns(container, chartData);

      expect(link.getAttribute('style')).not.toContain('clip-path');
    });
  });

  // -------------------------------------------------------------------------
  // GoalStatusReasonSankey component
  // In test env PlotComponent never loads (NODE_ENV=test guard), so:
  //   • invalid/empty data  → "No goal status data found."
  //   • valid data          → null (chartData computed but PlotComponent absent)
  // -------------------------------------------------------------------------

  describe('GoalStatusReasonSankey component', () => {
    const makeGoalsNode = (count = 10) => ({
      id: 'goals',
      label: 'Goals',
      count,
      percentage: 100,
    });
    const makeStatusNode = (status, count, percentage) => ({
      id: `status:${status}`,
      label: status,
      count,
      percentage,
    });
    const makeReasonNode = (status, reason, count, percentage) => ({
      id: `reason:${status}:${reason}`,
      label: reason,
      count,
      percentage,
    });
    const makeGoalsToStatusLink = (target, value) => ({
      source: 'goals',
      target: `status:${target}`,
      value,
    });
    const makeStatusToReasonLink = (status, reason, value) => ({
      source: `status:${status}`,
      target: `reason:${status}:${reason}`,
      value,
    });

    it('renders "No goal status data found." when nodes array is empty', () => {
      render(<GoalStatusReasonSankey sankey={{ nodes: [], links: [] }} />);
      expect(screen.getByText('No goal status data found.')).toBeInTheDocument();
    });

    it('renders "No goal status data found." when goals node is absent', () => {
      const sankey = {
        nodes: [makeStatusNode('In Progress', 5, 100)],
        links: [],
      };
      render(<GoalStatusReasonSankey sankey={sankey} />);
      expect(screen.getByText('No goal status data found.')).toBeInTheDocument();
    });

    it('renders nothing (null) when data is valid — PlotComponent not yet loaded', () => {
      const sankey = {
        nodes: [
          makeGoalsNode(20),
          makeStatusNode('Not Started', 5, 25),
          makeStatusNode('In Progress', 10, 50),
          makeStatusNode('Closed', 3, 15),
          makeStatusNode('Suspended', 2, 10),
        ],
        links: [
          makeGoalsToStatusLink('Not Started', 5),
          makeGoalsToStatusLink('In Progress', 10),
          makeGoalsToStatusLink('Closed', 3),
          makeGoalsToStatusLink('Suspended', 2),
        ],
      };
      const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
      expect(screen.queryByText('No goal status data found.')).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });

    it('exercises computeStatusNodeYBounds dominant-status headroom branch (>40%)', () => {
      const sankey = {
        nodes: [
          makeGoalsNode(100),
          makeStatusNode('Not Started', 80, 80),
          makeStatusNode('In Progress', 20, 20),
        ],
        links: [makeGoalsToStatusLink('Not Started', 80), makeGoalsToStatusLink('In Progress', 20)],
      };
      const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
      expect(container.firstChild).toBeNull();
    });

    it('exercises trailing-status gap branch when Closed is present', () => {
      const sankey = {
        nodes: [
          makeGoalsNode(10),
          makeStatusNode('In Progress', 6, 60),
          makeStatusNode('Closed', 4, 40),
        ],
        links: [makeGoalsToStatusLink('In Progress', 6), makeGoalsToStatusLink('Closed', 4)],
      };
      const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
      expect(container.firstChild).toBeNull();
    });

    it('exercises computeReasonNodeY with Closed reason nodes', () => {
      const sankey = {
        nodes: [
          makeGoalsNode(10),
          makeStatusNode('In Progress', 5, 50),
          makeStatusNode('Closed', 5, 50),
          makeReasonNode('Closed', 'Duplicate goal', 3, 60),
          makeReasonNode('Closed', 'Goal met', 2, 40),
        ],
        links: [
          makeGoalsToStatusLink('In Progress', 5),
          makeGoalsToStatusLink('Closed', 5),
          makeStatusToReasonLink('Closed', 'Duplicate goal', 3),
          makeStatusToReasonLink('Closed', 'Goal met', 2),
        ],
      };
      const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
      expect(container.firstChild).toBeNull();
    });

    it('exercises computeReasonNodeY with Suspended reason nodes', () => {
      const sankey = {
        nodes: [
          makeGoalsNode(10),
          makeStatusNode('In Progress', 4, 40),
          makeStatusNode('Suspended', 6, 60),
          makeReasonNode('Suspended', 'Grant ended', 4, 67),
          makeReasonNode('Suspended', 'Other', 2, 33),
        ],
        links: [
          makeGoalsToStatusLink('In Progress', 4),
          makeGoalsToStatusLink('Suspended', 6),
          makeStatusToReasonLink('Suspended', 'Grant ended', 4),
          makeStatusToReasonLink('Suspended', 'Other', 2),
        ],
      };
      const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
      expect(container.firstChild).toBeNull();
    });

    it('exercises computeReasonNodeY backward-shift (overflow bottom edge)', () => {
      const closedReasons = Array.from({ length: 8 }, (_, i) =>
        makeReasonNode('Closed', `Reason ${i}`, 1, 12.5)
      );
      const suspendedReasons = Array.from({ length: 8 }, (_, i) =>
        makeReasonNode('Suspended', `Reason ${i}`, 1, 12.5)
      );
      const sankey = {
        nodes: [
          makeGoalsNode(16),
          makeStatusNode('Closed', 8, 50),
          makeStatusNode('Suspended', 8, 50),
          ...closedReasons,
          ...suspendedReasons,
        ],
        links: [
          makeGoalsToStatusLink('Closed', 8),
          makeGoalsToStatusLink('Suspended', 8),
          ...closedReasons.map((n) => makeStatusToReasonLink('Closed', n.label, 1)),
          ...suspendedReasons.map((n) => makeStatusToReasonLink('Suspended', n.label, 1)),
        ],
      };
      const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
      expect(container.firstChild).toBeNull();
    });

    it('exercises dynamic NS↔IP gap with large combined inflated counts', () => {
      // Both Not Started and In Progress large → dynamic extra gap between horizontal bands
      const sankey = {
        nodes: [
          makeGoalsNode(200),
          makeStatusNode('Not Started', 100, 50),
          makeStatusNode('In Progress', 100, 50),
        ],
        links: [
          makeGoalsToStatusLink('Not Started', 100),
          makeGoalsToStatusLink('In Progress', 100),
        ],
      };
      const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
      expect(container.firstChild).toBeNull();
    });

    it('exercises dynamic NS↔IP gap with small counts (heavy inflation)', () => {
      // Small counts get heavily inflated, verifying inflated-value path in gap logic
      const sankey = {
        nodes: [
          makeGoalsNode(4),
          makeStatusNode('Not Started', 2, 50),
          makeStatusNode('In Progress', 2, 50),
        ],
        links: [makeGoalsToStatusLink('Not Started', 2), makeGoalsToStatusLink('In Progress', 2)],
      };
      const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
      expect(container.firstChild).toBeNull();
    });

    it('exercises dynamic Closed↔Suspended gap with both statuses present', () => {
      const sankey = {
        nodes: [
          makeGoalsNode(10),
          makeStatusNode('Closed', 6, 60),
          makeStatusNode('Suspended', 4, 40),
          makeReasonNode('Closed', 'Goal met', 6, 100),
          makeReasonNode('Suspended', 'Grant ended', 4, 100),
        ],
        links: [
          makeGoalsToStatusLink('Closed', 6),
          makeGoalsToStatusLink('Suspended', 4),
          makeStatusToReasonLink('Closed', 'Goal met', 6),
          makeStatusToReasonLink('Suspended', 'Grant ended', 4),
        ],
      };
      const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
      expect(container.firstChild).toBeNull();
    });

    it('exercises dynamic Closed↔Suspended gap with small counts (inflated)', () => {
      // Small Closed + Suspended counts get inflated; gap formula must still clear label
      const sankey = {
        nodes: [
          makeGoalsNode(4),
          makeStatusNode('Closed', 2, 50),
          makeStatusNode('Suspended', 2, 50),
          makeReasonNode('Closed', 'Goal met', 2, 100),
          makeReasonNode('Suspended', 'Grant ended', 2, 100),
        ],
        links: [
          makeGoalsToStatusLink('Closed', 2),
          makeGoalsToStatusLink('Suspended', 2),
          makeStatusToReasonLink('Closed', 'Goal met', 2),
          makeStatusToReasonLink('Suspended', 'Grant ended', 2),
        ],
      };
      const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
      expect(container.firstChild).toBeNull();
    });

    it('exercises small In Progress count with large Closed (inflated IP gap)', () => {
      // Low In Progress raw count gets inflated, making dynamicGapBeforeTrailingStatus
      // use inflated pct rather than raw pct for the In Progress → Closed gap
      const sankey = {
        nodes: [
          makeGoalsNode(52),
          makeStatusNode('In Progress', 2, 4),
          makeStatusNode('Closed', 50, 96),
          makeReasonNode('Closed', 'Goal met', 50, 100),
        ],
        links: [
          makeGoalsToStatusLink('In Progress', 2),
          makeGoalsToStatusLink('Closed', 50),
          makeStatusToReasonLink('Closed', 'Goal met', 50),
        ],
      };
      const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
      expect(container.firstChild).toBeNull();
    });

    it('exercises formatPercent goals node with zero count', () => {
      const sankey = {
        nodes: [makeGoalsNode(0), makeStatusNode('Not Started', 0, 0)],
        links: [makeGoalsToStatusLink('Not Started', 0)],
      };
      const { container } = render(<GoalStatusReasonSankey sankey={sankey} />);
      expect(container.firstChild).toBeNull();
    });

    it('handles sankey prop being undefined (default props)', () => {
      render(<GoalStatusReasonSankey />);
      expect(screen.getByText('No goal status data found.')).toBeInTheDocument();
    });

    it('loads and renders PlotComponent outside test env and runs scheduled pattern callbacks', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        callback();
        return 1;
      });

      process.env.NODE_ENV = 'development';
      latestPlotProps = null;

      const sankey = {
        nodes: [makeGoalsNode(5), makeStatusNode('Not Started', 5, 100)],
        links: [makeGoalsToStatusLink('Not Started', 5)],
      };

      render(<GoalStatusReasonSankey sankey={sankey} />);

      await waitFor(() => {
        expect(screen.getByTestId('mock-plot-component')).toBeInTheDocument();
      });

      expect(latestPlotProps).toBeDefined();
      expect(typeof latestPlotProps.onInitialized).toBe('function');

      rafSpy.mockClear();
      latestPlotProps.onInitialized();
      expect(rafSpy).toHaveBeenCalledTimes(2);

      rafSpy.mockRestore();
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('cancels pending rAFs on rapid successive calls so only the final pair executes', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      latestPlotProps = null;

      const pending = [];
      let nextId = 1;
      const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        const id = nextId++;
        pending.push({ id, callback });
        return id;
      });
      const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
        const idx = pending.findIndex((c) => c.id === id);
        if (idx >= 0) pending.splice(idx, 1);
      });

      const sankey = {
        nodes: [makeGoalsNode(5), makeStatusNode('Not Started', 5, 100)],
        links: [makeGoalsToStatusLink('Not Started', 5)],
      };

      render(<GoalStatusReasonSankey sankey={sankey} />);

      await waitFor(() => expect(screen.getByTestId('mock-plot-component')).toBeInTheDocument());

      // Flush rAFs from initial render/useEffect before testing rapid calls.
      while (pending.length > 0) {
        pending.shift().callback();
      }

      // Simulate 3 simultaneous Plotly events (e.g. onHover + onAfterPlot + onRelayout).
      latestPlotProps.onInitialized();
      latestPlotProps.onInitialized();
      latestPlotProps.onInitialized();

      // Only the final call's outer rAF should remain — the first two were cancelled.
      expect(pending).toHaveLength(1);

      // Flush the remaining rAF pair (outer then inner from the final call).
      while (pending.length > 0) {
        pending.shift().callback();
      }
      expect(pending).toHaveLength(0);

      rafSpy.mockRestore();
      cancelSpy.mockRestore();
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('schedules pattern apply when chart data is available', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        callback();
        return 1;
      });

      const sankey = {
        nodes: [makeGoalsNode(5), makeStatusNode('Not Started', 5, 100)],
        links: [makeGoalsToStatusLink('Not Started', 5)],
      };

      try {
        render(<GoalStatusReasonSankey sankey={sankey} />);

        await waitFor(() => {
          expect(screen.getByTestId('mock-plot-component')).toBeInTheDocument();
        });

        await waitFor(() => {
          expect(rafSpy).toHaveBeenCalled();
        });
      } finally {
        rafSpy.mockRestore();
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it('inflates low link values proportionally up through 10 and keeps 5 clearly above 1', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const sankey = {
        nodes: [
          makeGoalsNode(26),
          makeStatusNode('Not Started', 1, 4.76),
          makeStatusNode('In Progress', 5, 19.23),
          makeStatusNode('Closed', 8, 30.77),
          makeStatusNode('Suspended', 12, 46.15),
        ],
        links: [
          makeGoalsToStatusLink('Not Started', 1),
          makeGoalsToStatusLink('In Progress', 5),
          makeGoalsToStatusLink('Closed', 8),
          makeGoalsToStatusLink('Suspended', 12),
        ],
      };

      try {
        render(<GoalStatusReasonSankey sankey={sankey} />);

        await waitFor(() => {
          expect(screen.getByTestId('mock-plot-component')).toBeInTheDocument();
        });

        expect(latestPlotProps.data[0].link.value).toEqual([16, 25.93, 31.54, 12]);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it('scales reason link rendered values proportionally so their sum equals the Goals→Status rendered value', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Closed = 2 goals, reasons A=1, B=1, C=1. Low-volume scenario.
      // Goals→Closed uses curved progressive low-count inflation for <=10.
      // For value=2: 16 + (1/9)^0.8 * (35 - 16) ≈ 19.28.
      // Reason links remain proportional and should sum to the status rendered value.
      const sankey = {
        nodes: [
          makeGoalsNode(2),
          makeStatusNode('Closed', 2, 100),
          makeReasonNode('Closed', 'ReasonA', 1, 50),
          makeReasonNode('Closed', 'ReasonB', 1, 25),
          makeReasonNode('Closed', 'ReasonC', 1, 25),
        ],
        links: [
          makeGoalsToStatusLink('Closed', 2),
          makeStatusToReasonLink('Closed', 'ReasonA', 1),
          makeStatusToReasonLink('Closed', 'ReasonB', 1),
          makeStatusToReasonLink('Closed', 'ReasonC', 1),
        ],
      };

      try {
        render(<GoalStatusReasonSankey sankey={sankey} />);

        await waitFor(() => {
          expect(screen.getByTestId('mock-plot-component')).toBeInTheDocument();
        });

        const linkValues = latestPlotProps.data[0].link.value;
        // Goals→Closed link (index 0): curved progressive low-count inflation for value=2.
        const goalsToClosedRendered = linkValues[0];
        expect(goalsToClosedRendered).toBeCloseTo(19.28, 2);

        // Reason links (indices 1–3): each should be roughly (1/3) * 19.28 ≈ 6.43.
        const reasonRenderedValues = linkValues.slice(1);
        const sumOfReasonRendered = reasonRenderedValues.reduce((s, v) => s + v, 0);
        // Sum of reason rendered values must equal the Goals→Closed rendered value.
        expect(sumOfReasonRendered).toBeCloseTo(goalsToClosedRendered, 5);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it('gives reason count 5 a thicker link than count 1 under the same status', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const sankey = {
        nodes: [
          makeGoalsNode(6),
          makeStatusNode('Closed', 6, 100),
          makeReasonNode('Closed', 'Low', 1, 16.67),
          makeReasonNode('Closed', 'High', 5, 83.33),
        ],
        links: [
          makeGoalsToStatusLink('Closed', 6),
          makeStatusToReasonLink('Closed', 'Low', 1),
          makeStatusToReasonLink('Closed', 'High', 5),
        ],
      };

      try {
        render(<GoalStatusReasonSankey sankey={sankey} />);

        await waitFor(() => {
          expect(screen.getByTestId('mock-plot-component')).toBeInTheDocument();
        });

        const linkValues = latestPlotProps.data[0].link.value;
        const lowReasonRendered = linkValues[1];
        const highReasonRendered = linkValues[2];

        expect(highReasonRendered).toBeGreaterThan(lowReasonRendered);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it('merges duplicate links with the same source and target before rendering', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const sankey = {
        nodes: [
          makeGoalsNode(5),
          makeStatusNode('Not Started', 3, 60),
          makeStatusNode('Closed', 2, 40),
          makeReasonNode('Closed', 'TTA complete', 2, 100),
        ],
        links: [
          makeGoalsToStatusLink('Not Started', 1),
          makeGoalsToStatusLink('Not Started', 2),
          makeGoalsToStatusLink('Closed', 1),
          makeGoalsToStatusLink('Closed', 1),
          makeStatusToReasonLink('Closed', 'TTA complete', 1),
          makeStatusToReasonLink('Closed', 'TTA complete', 1),
        ],
      };

      try {
        render(<GoalStatusReasonSankey sankey={sankey} />);

        await waitFor(() => {
          expect(screen.getByTestId('mock-plot-component')).toBeInTheDocument();
        });

        expect(latestPlotProps.data[0].link.source).toHaveLength(3);
        expect(latestPlotProps.data[0].link.target).toHaveLength(3);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it('omits orphan reason nodes that do not have a positive status-to-reason link', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const sankey = {
        nodes: [
          makeGoalsNode(3),
          makeStatusNode('Closed', 2, 66.67),
          makeStatusNode('Suspended', 1, 33.33),
          makeReasonNode('Closed', 'TTA complete', 2, 100),
          makeReasonNode('Suspended', 'Key staff turnover / vacancies', 0, 0),
        ],
        links: [
          makeGoalsToStatusLink('Closed', 2),
          makeGoalsToStatusLink('Suspended', 1),
          makeStatusToReasonLink('Closed', 'TTA complete', 2),
          makeStatusToReasonLink('Suspended', 'Key staff turnover / vacancies', 0),
        ],
      };

      try {
        render(<GoalStatusReasonSankey sankey={sankey} />);

        await waitFor(() => {
          expect(screen.getByTestId('mock-plot-component')).toBeInTheDocument();
        });

        expect(latestPlotProps.data[0].node.label).toHaveLength(4);
        expect(latestPlotProps.data[0].link.source).toHaveLength(3);
        expect(latestPlotProps.data[0].link.target).toHaveLength(3);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });
});
