import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GoalStatusReasonSankeyWidget from '../GoalStatusReasonSankeyWidget';

jest.mock('../GoalStatusReasonSankey', () => function MockSankey() {
  return <div data-testid="sankey-mock">Sankey chart</div>;
});

jest.mock('../../components/WidgetContainer', () => function MockWidgetContainer({
  children, loading, title, subtitle,
}) {
  return (
    <div data-testid="widget-container" data-loading={String(loading)}>
      <span>{title}</span>
      {subtitle}
      {children}
    </div>
  );
});

jest.mock('../../components/NoResultsFound', () => function MockNoResultsFound() {
  return <div data-testid="no-results">No results found</div>;
});

jest.mock('../../hooks/useMediaCapture', () => () => jest.fn());

jest.mock('../../components/DrawerTriggerButton', () => function MockDrawerTriggerButton({
  children,
}) {
  return <button type="button">{children}</button>;
});

jest.mock('../../components/Drawer', () => function MockDrawer() {
  return null;
});

jest.mock('../../components/ContentFromFeedByTag', () => function MockContent() {
  return null;
});

const NODES = [
  {
    id: 'goals', label: 'Goals', count: 5, percentage: 100,
  },
  {
    id: 'status:In Progress', label: 'In progress', count: 5, percentage: 100,
  },
];
const LINKS = [{ source: 'goals', target: 'status:In Progress', value: 5 }];

describe('GoalStatusReasonSankeyWidget', () => {
  it('renders the sankey chart and legend when both nodes and links are present', () => {
    const data = { total: 5, sankey: { nodes: NODES, links: LINKS } };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    expect(screen.getByTestId('sankey-mock')).toBeInTheDocument();

    // All 5 legend items
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('does not render the sankey chart when nodes array is empty', () => {
    const data = { total: 0, sankey: { nodes: [], links: LINKS } };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    expect(screen.queryByTestId('sankey-mock')).not.toBeInTheDocument();
  });

  it('does not render the sankey chart when links array is empty', () => {
    const data = { total: 5, sankey: { nodes: NODES, links: [] } };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    expect(screen.queryByTestId('sankey-mock')).not.toBeInTheDocument();
  });

  it('shows NoResultsFound when hasSankeyData is false and loading is false', () => {
    const data = { total: 0, sankey: { nodes: [], links: [] } };
    render(<GoalStatusReasonSankeyWidget data={data} loading={false} />);

    expect(screen.getByTestId('no-results')).toBeInTheDocument();
  });

  it('does not show NoResultsFound when loading is true even if data is empty', () => {
    const data = { total: 0, sankey: { nodes: [], links: [] } };
    render(<GoalStatusReasonSankeyWidget data={data} loading />);

    expect(screen.queryByTestId('no-results')).not.toBeInTheDocument();
  });

  it('shows NoResultsFound when data prop is undefined (default props)', () => {
    render(<GoalStatusReasonSankeyWidget loading={false} />);

    expect(screen.queryByTestId('sankey-mock')).not.toBeInTheDocument();
    expect(screen.getByTestId('no-results')).toBeInTheDocument();
  });

  it('renders the "About this data" drawer trigger button', () => {
    render(<GoalStatusReasonSankeyWidget />);
    expect(screen.getByRole('button', { name: /about this data/i })).toBeInTheDocument();
  });
});
