/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import useWidgetExport from '../../hooks/useWidgetExport';
import GoalStatusReasonSankeyWidget from '../GoalStatusReasonSankeyWidget';

jest.mock('../../hooks/useWidgetExport', () => jest.fn());

const mockExportRows = jest.fn();

jest.mock(
  '../GoalStatusReasonSankey',
  () =>
    function MockSankey() {
      return <div data-testid="sankey-mock">Sankey chart</div>;
    }
);

jest.mock(
  '../../components/WidgetContainer',
  () =>
    function MockWidgetContainer({ children, loading, title, subtitle, menuItems }) {
      return (
        <div data-testid="widget-container" data-loading={String(loading)}>
          <span>{title}</span>
          {subtitle}
          {(menuItems || []).map((item) => (
            <button key={item.label} type="button" onClick={item.onClick}>
              {item.label}
            </button>
          ))}
          {children}
        </div>
      );
    }
);

jest.mock(
  '../../components/NoResultsFound',
  () =>
    function MockNoResultsFound() {
      return <div data-testid="no-results">No results found</div>;
    }
);

jest.mock('../../hooks/useMediaCapture', () => () => jest.fn());

jest.mock(
  '../../components/DrawerTriggerButton',
  () =>
    function MockDrawerTriggerButton({ children }) {
      return <button type="button">{children}</button>;
    }
);

jest.mock(
  '../../components/Drawer',
  () =>
    function MockDrawer() {
      return null;
    }
);

jest.mock(
  '../../components/ContentFromFeedByTag',
  () =>
    function MockContent() {
      return null;
    }
);

jest.mock(
  '../HorizontalTableWidget',
  () =>
    function MockHorizontalTableWidget({ data, footerData, firstHeading, headers }) {
      return (
        <div data-testid="horizontal-table-widget">
          <div data-testid="first-heading">{firstHeading}</div>
          {(headers || []).map((h) => (
            <div key={h} data-testid={`header-${h}`}>
              {h}
            </div>
          ))}
          {(data || []).map((row) => {
            const pctCell = (row.data || []).find((c) => c.title === 'Percentage');
            return (
              <div
                key={row.id}
                data-testid="table-row"
                data-percentage={pctCell ? pctCell.value : ''}
              >
                {row.heading}
              </div>
            );
          })}
          <div data-testid="footer">{(footerData || []).join(' | ')}</div>
        </div>
      );
    }
);

jest.mock('../../hooks/useWidgetSorting', () => {
  // eslint-disable-next-line global-require
  const { useEffect } = require('react');
  return (key, defaultSort, data, setData) => {
    useEffect(() => {
      setData(data);
    }, [data, setData]);
    return { requestSort: jest.fn(), sortConfig: defaultSort };
  };
});

beforeEach(() => {
  mockExportRows.mockClear();
  useWidgetExport.mockClear();
  useWidgetExport.mockReturnValue({
    exportRows: mockExportRows,
  });
});

const NODES = [
  {
    id: 'goals',
    label: 'Goals',
    count: 5,
    percentage: 100,
  },
  {
    id: 'status:In Progress',
    label: 'In progress',
    count: 5,
    percentage: 100,
  },
];
const LINKS = [{ source: 'goals', target: 'status:In Progress', value: 5 }];

const STATUS_ROWS = [
  {
    status: 'Not Started',
    label: 'Not started',
    count: 0,
    percentage: 0,
  },
  {
    status: 'In Progress',
    label: 'In progress',
    count: 5,
    percentage: 100,
  },
  {
    status: 'Closed',
    label: 'Closed',
    count: 0,
    percentage: 0,
  },
  {
    status: 'Suspended',
    label: 'Suspended',
    count: 0,
    percentage: 0,
  },
];

const FULL_NODES = [
  {
    id: 'goals',
    label: 'Goals',
    count: 67,
    percentage: 100,
  },
  {
    id: 'status:Not Started',
    label: 'Not started',
    count: 37,
    percentage: 57.81,
  },
  {
    id: 'status:In Progress',
    label: 'In progress',
    count: 24,
    percentage: 37.5,
  },
  {
    id: 'status:Closed',
    label: 'Closed',
    count: 2,
    percentage: 2.99,
  },
  {
    id: 'status:Suspended',
    label: 'Suspended',
    count: 1,
    percentage: 1.49,
  },
  {
    id: 'reason:Suspended:Key staff turnover / vacancies',
    label: 'Key staff turnover / vacancies',
    count: 0,
    percentage: 0,
  },
  {
    id: 'reason:Suspended:Recipient request',
    label: 'Recipient request',
    count: 1,
    percentage: 1.49,
  },
  {
    id: 'reason:Closed:TTA complete',
    label: 'TTA complete',
    count: 2,
    percentage: 2.99,
  },
];

const FULL_STATUS_ROWS = [
  {
    status: 'Not Started',
    label: 'Not started',
    count: 37,
    percentage: 55.22,
  },
  {
    status: 'In Progress',
    label: 'In progress',
    count: 24,
    percentage: 35.82,
  },
  {
    status: 'Closed',
    label: 'Closed',
    count: 2,
    percentage: 2.99,
  },
  {
    status: 'Suspended',
    label: 'Suspended',
    count: 1,
    percentage: 1.49,
  },
];

const FULL_REASON_ROWS = [
  {
    status: 'Closed',
    statusLabel: 'Closed',
    reason: 'TTA complete',
    count: 2,
    percentage: 100,
  },
  {
    status: 'Suspended',
    statusLabel: 'Suspended',
    reason: 'Key staff turnover / vacancies',
    count: 0,
    percentage: 0,
  },
  {
    status: 'Suspended',
    statusLabel: 'Suspended',
    reason: 'Recipient request',
    count: 1,
    percentage: 100,
  },
];

const FULL_LINKS = [
  { source: 'goals', target: 'status:Not Started', value: 37 },
  { source: 'goals', target: 'status:In Progress', value: 24 },
  { source: 'goals', target: 'status:Closed', value: 2 },
  { source: 'goals', target: 'status:Suspended', value: 1 },
  { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 2 },
  {
    source: 'status:Suspended',
    target: 'reason:Suspended:Key staff turnover / vacancies',
    value: 0,
  },
  { source: 'status:Suspended', target: 'reason:Suspended:Recipient request', value: 1 },
];

describe('GoalStatusReasonSankeyWidget', () => {
  it('renders the sankey chart and legend when both nodes and links are present', () => {
    const data = {
      total: 5,
      statusRows: STATUS_ROWS,
      reasonRows: [],
      sankey: { nodes: NODES, links: LINKS },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    expect(screen.getByTestId('sankey-mock')).toBeInTheDocument();

    // All 5 legend items
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
    expect(
      screen.getByText('Data reflects standard goals created on or after 09/09/2025.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Data reflects activity starting on 09/09/2025.')
    ).not.toBeInTheDocument();
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

  it('does not render a no-results preview toggle button in graph view', () => {
    const data = {
      total: 5,
      statusRows: STATUS_ROWS,
      reasonRows: [],
      sankey: { nodes: NODES, links: LINKS },
    };
    render(<GoalStatusReasonSankeyWidget data={data} loading={false} />);

    expect(
      screen.queryByRole('button', { name: /preview no-results view/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show chart/i })).not.toBeInTheDocument();
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

  it('shows "Display table" button in the actions menu by default', () => {
    const data = {
      total: 5,
      statusRows: STATUS_ROWS,
      reasonRows: [],
      sankey: { nodes: NODES, links: LINKS },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    expect(screen.getByRole('button', { name: 'Display table' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Display graph' })).not.toBeInTheDocument();
  });

  it('shows "Save screenshot" button in graph view', () => {
    const data = {
      total: 5,
      statusRows: STATUS_ROWS,
      reasonRows: [],
      sankey: { nodes: NODES, links: LINKS },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    expect(screen.getByRole('button', { name: 'Save screenshot' })).toBeInTheDocument();
  });

  it('switches to table view when "Display table" is clicked', () => {
    const data = {
      total: 67,
      statusRows: FULL_STATUS_ROWS,
      reasonRows: FULL_REASON_ROWS,
      sankey: { nodes: FULL_NODES, links: FULL_LINKS },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    expect(screen.getByTestId('sankey-mock')).toBeInTheDocument();
    expect(screen.queryByTestId('horizontal-table-widget')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));

    expect(screen.queryByTestId('sankey-mock')).not.toBeInTheDocument();
    expect(screen.getByTestId('horizontal-table-widget')).toBeInTheDocument();
  });

  it('shows "Export table" button after switching to table view', () => {
    const data = {
      total: 5,
      statusRows: STATUS_ROWS,
      reasonRows: [],
      sankey: { nodes: NODES, links: LINKS },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));

    expect(screen.getByRole('button', { name: 'Export table' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Display graph' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Display table' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save screenshot' })).not.toBeInTheDocument();
  });

  it('calls exportRows with all rows when "Export table" is clicked', () => {
    const data = {
      total: 5,
      statusRows: STATUS_ROWS,
      reasonRows: [],
      sankey: { nodes: NODES, links: LINKS },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export table' }));

    expect(mockExportRows).toHaveBeenCalledWith('all');
  });

  it('renders the table heading in table view', () => {
    const data = {
      total: 5,
      statusRows: STATUS_ROWS,
      reasonRows: [],
      sankey: { nodes: NODES, links: LINKS },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));

    expect(screen.getByText('Number of goals by status and reason')).toBeInTheDocument();
  });

  it('derives table rows correctly and defaults to Number ascending order', () => {
    const data = {
      total: 67,
      statusRows: FULL_STATUS_ROWS,
      reasonRows: FULL_REASON_ROWS,
      sankey: { nodes: FULL_NODES, links: FULL_LINKS },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));

    const rowTexts = screen.getAllByTestId('table-row').map((r) => r.textContent);

    // Includes only non-zero status/reason rows and starts in Number ascending order by default.
    expect(rowTexts).toEqual([
      'Suspended - Recipient request',
      'Closed - TTA complete',
      'In progress',
      'Not started',
    ]);
  });

  it('renders correct footer with computed percentage from visible table rows', () => {
    const data = {
      total: 67,
      statusRows: FULL_STATUS_ROWS,
      reasonRows: FULL_REASON_ROWS,
      sankey: { nodes: FULL_NODES, links: FULL_LINKS },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));

    // visible table rows have counts 37 + 24 + 2 + 1 = 64
    // footer percentage is based on visible row sum vs total (64/67 = 95.52%)
    expect(screen.getByTestId('footer')).toHaveTextContent('Total | 67 | 95.52%');
  });

  it('computes row percentages relative to the goals node count, not the reason parent count', () => {
    const data = {
      total: 67,
      statusRows: FULL_STATUS_ROWS,
      reasonRows: FULL_REASON_ROWS,
      sankey: { nodes: FULL_NODES, links: FULL_LINKS },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));

    // "Suspended - Recipient request" has count=1, goals total=67
    // percentage should be (1/67)*100 = 1.49%, NOT (1/1)*100 = 100% (relative to status)
    const rows = screen.getAllByTestId('table-row');
    const suspendedRow = rows.find((r) => r.textContent === 'Suspended - Recipient request');
    expect(suspendedRow).toBeInTheDocument();
    expect(suspendedRow).toHaveAttribute('data-percentage', '1.49%');

    // Verify another row: "Closed - TTA complete" count=2, total=67 → 2.99%
    const closedRow = rows.find((r) => r.textContent === 'Closed - TTA complete');
    expect(closedRow).toHaveAttribute('data-percentage', '2.99%');
  });

  it('excludes zero-count reason rows and zero-count status rows from table view', () => {
    // Scenario: Suspended has count=0 and all its reason rows have count=0.
    // Neither the status row nor its reasons should appear.
    const statusRows = [
      {
        status: 'Not Started',
        label: 'Not started',
        count: 5,
        percentage: 50,
      },
      {
        status: 'In Progress',
        label: 'In progress',
        count: 5,
        percentage: 50,
      },
      {
        status: 'Closed',
        label: 'Closed',
        count: 0,
        percentage: 0,
      },
      {
        status: 'Suspended',
        label: 'Suspended',
        count: 0,
        percentage: 0,
      },
    ];
    const reasonRows = [
      {
        status: 'Suspended',
        statusLabel: 'Suspended',
        reason: 'Recipient request',
        count: 0,
        percentage: 0,
      },
      {
        status: 'Suspended',
        statusLabel: 'Suspended',
        reason: 'Key staff',
        count: 0,
        percentage: 0,
      },
    ];
    const nodes = [
      {
        id: 'goals',
        label: 'Goals',
        count: 10,
        percentage: 100,
      },
      {
        id: 'status:Not Started',
        label: 'Not started',
        count: 5,
        percentage: 50,
      },
      {
        id: 'status:In Progress',
        label: 'In progress',
        count: 5,
        percentage: 50,
      },
    ];
    const links = [
      { source: 'goals', target: 'status:Not Started', value: 5 },
      { source: 'goals', target: 'status:In Progress', value: 5 },
    ];
    const data = {
      total: 10,
      statusRows,
      reasonRows,
      sankey: { nodes, links },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));

    const rows = screen.getAllByTestId('table-row');
    const rowTexts = rows.map((r) => r.textContent);

    // Zero-count nodes should NOT appear
    expect(rowTexts).not.toContain('Suspended');
    expect(rowTexts).not.toContain('Suspended - Recipient request');
    expect(rowTexts).not.toContain('Suspended - Key staff');

    // Non-zero status nodes should appear
    expect(rowTexts).toContain('Not started');
    expect(rowTexts).toContain('In progress');
  });

  it('shows Closed/Suspended as reason rows in the table, not as status rows', () => {
    // Closed/Suspended goals always have a reason row (at minimum "Unknown").
    // They should appear as "Status - Reason" rows, never as bare status rows.
    const statusRows = [
      {
        status: 'Not Started',
        label: 'Not started',
        count: 5,
        percentage: 50,
      },
      {
        status: 'Suspended',
        label: 'Suspended',
        count: 5,
        percentage: 50,
      },
    ];
    const reasonRows = [
      {
        status: 'Suspended',
        statusLabel: 'Suspended',
        reason: 'Unknown',
        count: 5,
        percentage: 100,
      },
    ];
    const nodes = [
      {
        id: 'goals',
        label: 'Goals',
        count: 10,
        percentage: 100,
      },
      {
        id: 'status:Not Started',
        label: 'Not started',
        count: 5,
        percentage: 50,
      },
      {
        id: 'status:Suspended',
        label: 'Suspended',
        count: 5,
        percentage: 50,
      },
      {
        id: 'reason:Suspended:Unknown',
        label: 'Unknown',
        count: 5,
        percentage: 50,
      },
    ];
    const links = [
      { source: 'goals', target: 'status:Not Started', value: 5 },
      { source: 'goals', target: 'status:Suspended', value: 5 },
      { source: 'status:Suspended', target: 'reason:Suspended:Unknown', value: 5 },
    ];
    const data = {
      total: 10,
      statusRows,
      reasonRows,
      sankey: { nodes, links },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));

    const rows = screen.getAllByTestId('table-row');
    const rowTexts = rows.map((r) => r.textContent);

    // Suspended appears as a reason row, not a bare status row
    expect(rowTexts).toContain('Suspended - Unknown');
    expect(rowTexts).not.toContain('Suspended');
    expect(rowTexts).toContain('Not started');
  });

  it('passes correct column headings to HorizontalTableWidget', () => {
    const data = {
      total: 5,
      statusRows: STATUS_ROWS,
      reasonRows: [],
      sankey: { nodes: NODES, links: LINKS },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));

    expect(screen.getByTestId('first-heading')).toHaveTextContent('Status');
    expect(screen.getByTestId('header-Number')).toBeInTheDocument();
    expect(screen.getByTestId('header-Percentage')).toBeInTheDocument();
  });

  it('passes table-visible cells to the export hook', async () => {
    const data = {
      total: 67,
      statusRows: FULL_STATUS_ROWS,
      reasonRows: FULL_REASON_ROWS,
      sankey: { nodes: FULL_NODES, links: FULL_LINKS },
    };
    render(<GoalStatusReasonSankeyWidget data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));
    expect(screen.getByTestId('horizontal-table-widget')).toBeInTheDocument();

    await waitFor(() => {
      expect(useWidgetExport).toHaveBeenCalled();
      const latestExportHookCall =
        useWidgetExport.mock.calls[useWidgetExport.mock.calls.length - 1];
      const [rowsForExport, headersForExport, checkboxesArg, headingArg, exportNameArg] =
        latestExportHookCall;

      expect(headersForExport).toEqual(['Number', 'Percentage']);
      expect(checkboxesArg).toEqual({});
      expect(headingArg).toBe('Status');
      expect(exportNameArg).toBe('goal-status-suspension-closure-reasons');

      expect(rowsForExport).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ heading: 'Not started' }),
          expect.objectContaining({ heading: 'In progress' }),
          expect.objectContaining({ heading: 'Closed - TTA complete' }),
          expect.objectContaining({ heading: 'Suspended - Recipient request' }),
          expect.objectContaining({
            heading: 'Total',
            data: [
              expect.objectContaining({ title: 'Number', value: '67' }),
              expect.objectContaining({ title: 'Percentage', value: '95.52%' }),
            ],
          }),
        ])
      );

      rowsForExport.forEach((row) => {
        expect(row.data).toHaveLength(2);
        expect(row.data.map((cell) => cell.title)).toEqual(['Number', 'Percentage']);
      });
    });
  });
});
