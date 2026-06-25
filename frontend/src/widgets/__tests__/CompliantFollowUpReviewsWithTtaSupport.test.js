/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import AppLoadingContext from '../../AppLoadingContext';
import useWidgetExport from '../../hooks/useWidgetExport';
import useWidgetMenuItems from '../../hooks/useWidgetMenuItems';
import { CompliantFollowUpReviewsWithTtaSupport } from '../CompliantFollowUpReviewsWithTtaSupport';

jest.mock('../withWidgetData', () => (Component) => Component);

jest.mock('../../hooks/useMediaCapture', () => jest.fn(() => jest.fn()));
jest.mock('../../hooks/useSize', () => jest.fn(() => null));
jest.mock('../../hooks/useWidgetExport', () => jest.fn());
jest.mock('../../hooks/useWidgetMenuItems', () =>
  jest.fn((showTabularData, setShowTabularData) => [
    {
      label: showTabularData ? 'Display graph' : 'Display table',
      onClick: () => setShowTabularData((prev) => !prev),
    },
  ])
);

jest.mock('react-plotly.js/factory', () => jest.fn(() => () => <div data-testid="plotly-chart" />));
jest.mock('plotly.js-basic-dist', () => ({}));

jest.mock(
  '../../components/WidgetContainer',
  () =>
    function MockWidgetContainer({ children, title, subtitle, menuItems, loading }) {
      return (
        <div data-testid="widget-container" data-loading={String(loading)}>
          <h2>{title}</h2>
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
  '../HorizontalTableWidget',
  () =>
    function MockHorizontalTableWidget({ headers, data, footerData }) {
      return (
        <div data-testid="horizontal-table-widget">
          <div data-testid="table-headers">{(headers || []).join(' | ')}</div>
          {(data || []).map((row) => (
            <div key={row.id} data-testid="table-row">
              {row.heading}
            </div>
          ))}
          <div data-testid="table-footer">
            {Array.isArray(footerData) ? footerData.join(' | ') : ''}
          </div>
        </div>
      );
    }
);

jest.mock(
  '../../components/NoResultsFound',
  () =>
    function MockNoResultsFound({ drawerConfig }) {
      return (
        <div data-testid="no-results">
          No results found
          <span data-testid="no-results-drawer-title">{drawerConfig?.title}</span>
        </div>
      );
    }
);

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
    function MockDrawer({ children }) {
      return <div data-testid="drawer">{children}</div>;
    }
);

jest.mock(
  '../../components/ContentFromFeedByTag',
  () =>
    function MockContentFromFeedByTag({ tagName }) {
      return <div data-testid="feed-content">{tagName}</div>;
    }
);

const setIsAppLoading = jest.fn();

const renderWidget = (props = {}) =>
  render(
    <AppLoadingContext.Provider value={{ setIsAppLoading }}>
      <CompliantFollowUpReviewsWithTtaSupport loading={false} data={null} {...props} />
    </AppLoadingContext.Provider>
  );

const widgetData = {
  months: ['2026-01', '2026-02'],
  reviews: [
    { name: 'With TTA support', values: [2, 1] },
    { name: 'Without TTA support', values: [3, 4] },
    { name: 'Total', values: [5, 5] },
  ],
};

describe('CompliantFollowUpReviewsWithTtaSupport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWidgetExport.mockReturnValue({ exportRows: [{ foo: 'bar' }] });
  });

  it('renders empty state when there are no months and loading is false', () => {
    renderWidget({ loading: false, data: { months: [], reviews: [] } });

    expect(screen.getByTestId('no-results')).toBeInTheDocument();
    expect(screen.getByTestId('no-results-drawer-title')).toHaveTextContent(
      'Monitoring dashboard filters'
    );
    expect(screen.queryByRole('button', { name: 'Display table' })).not.toBeInTheDocument();
  });

  it('does not render empty state while loading even when there are no months', () => {
    renderWidget({ loading: true, data: { months: [], reviews: [] } });

    expect(screen.queryByTestId('no-results')).not.toBeInTheDocument();
    expect(screen.getByTestId('widget-container')).toBeInTheDocument();
  });

  it('renders with menu actions and computes export columns including Total', () => {
    renderWidget({ loading: false, data: widgetData });

    expect(screen.getByRole('button', { name: 'Display table' })).toBeInTheDocument();
    expect(useWidgetExport).toHaveBeenCalledWith(
      expect.any(Array),
      ['2026-01', '2026-02', 'Total'],
      {},
      'Follow-up reviews',
      'Compliant follow-up reviews with TTA support'
    );
    expect(useWidgetMenuItems).toHaveBeenCalled();
    expect(screen.queryByTestId('no-results')).not.toBeInTheDocument();
  });

  it('switches to table mode and passes footer totals when Display table is clicked', async () => {
    renderWidget({ loading: false, data: widgetData });

    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));

    await waitFor(() => {
      expect(screen.getByTestId('horizontal-table-widget')).toBeInTheDocument();
    });

    expect(screen.getByTestId('table-headers')).toHaveTextContent('2026-01 | 2026-02');
    expect(screen.getByText('With TTA support')).toBeInTheDocument();
    expect(screen.getByText('Without TTA support')).toBeInTheDocument();
    expect(screen.getByTestId('table-footer')).toHaveTextContent('Total | 5 | 5 | 10');
    expect(screen.getByRole('button', { name: 'Display graph' })).toBeInTheDocument();
  });

  it('updates app loading context when loading changes', () => {
    const { rerender } = render(
      <AppLoadingContext.Provider value={{ setIsAppLoading }}>
        <CompliantFollowUpReviewsWithTtaSupport loading data={widgetData} />
      </AppLoadingContext.Provider>
    );

    expect(setIsAppLoading).toHaveBeenCalledWith(true);

    rerender(
      <AppLoadingContext.Provider value={{ setIsAppLoading }}>
        <CompliantFollowUpReviewsWithTtaSupport loading={false} data={widgetData} />
      </AppLoadingContext.Provider>
    );

    expect(setIsAppLoading).toHaveBeenLastCalledWith(false);
  });

  it('renders empty state when data is null', () => {
    renderWidget({ loading: false, data: null });

    expect(screen.getByTestId('no-results')).toBeInTheDocument();
  });

  it('renders graph view by default and not the table widget', () => {
    renderWidget({ loading: false, data: widgetData });

    expect(screen.queryByTestId('horizontal-table-widget')).not.toBeInTheDocument();
    expect(screen.getByTestId('widget-container')).toBeInTheDocument();
  });

  it('toggles back to graph view after switching to table mode', async () => {
    renderWidget({ loading: false, data: widgetData });

    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));
    await waitFor(() => expect(screen.getByTestId('horizontal-table-widget')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Display graph' }));
    await waitFor(() =>
      expect(screen.queryByTestId('horizontal-table-widget')).not.toBeInTheDocument()
    );
  });

  it('passes false for footerData when reviews contain no Total row', async () => {
    const dataWithoutTotal = {
      months: ['2026-01', '2026-02'],
      reviews: [
        { name: 'With TTA support', values: [2, 1] },
        { name: 'Without TTA support', values: [3, 4] },
      ],
    };

    renderWidget({ loading: false, data: dataWithoutTotal });
    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));

    await waitFor(() => expect(screen.getByTestId('horizontal-table-widget')).toBeInTheDocument());
    expect(screen.getByTestId('table-footer')).toHaveTextContent('');
  });

  it('includes per-row computed totals as the last data entry for each table row', () => {
    renderWidget({ loading: false, data: widgetData });

    const [tableDataArg] = useWidgetExport.mock.calls[0];
    const withTtaRow = tableDataArg.find((r) => r.heading === 'With TTA support');
    const withoutTtaRow = tableDataArg.find((r) => r.heading === 'Without TTA support');
    expect(withTtaRow.data.at(-1)).toEqual({ value: '3' });
    expect(withoutTtaRow.data.at(-1)).toEqual({ value: '7' });
  });

  it('renders empty table rows and no footer when reviews array is empty', async () => {
    const dataNoReviews = { months: ['2026-01'], reviews: [] };

    renderWidget({ loading: false, data: dataNoReviews });
    fireEvent.click(screen.getByRole('button', { name: 'Display table' }));

    await waitFor(() => expect(screen.getByTestId('horizontal-table-widget')).toBeInTheDocument());
    expect(screen.queryAllByTestId('table-row')).toHaveLength(0);
    expect(screen.getByTestId('table-footer')).toHaveTextContent('');
  });
});
