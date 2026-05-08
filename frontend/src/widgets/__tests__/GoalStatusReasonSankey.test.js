import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import GoalStatusReasonSankey from '../GoalStatusReasonSankey';
import pickClosestLinkByTargetCenter from '../goalStatusReasonSankeyUtils';

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
        // count=0 makes the synthetic goals_start->goals link invalid (value must be > 0)
        { id: 'goals', label: 'Goals', count: 0, percentage: 0 },
        { id: 'status:Not Started', label: 'Not Started', count: 5, percentage: 100 },
      ],
      links: [
        // zero-value links are filtered out of chart data
        { source: 'goals', target: 'status:Not Started', value: 0 },
      ],
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
    // In NODE_ENV=test, plotly loading is intentionally skipped.
    expect(container).toBeEmptyDOMElement();
  });
});

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
