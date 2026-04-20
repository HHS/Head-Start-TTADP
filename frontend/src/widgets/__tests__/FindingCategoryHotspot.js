import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  fireEvent,
} from '@testing-library/react';
import {
  FindingCategoryHotspotWidget as FindingCategoryHotspot,
  getTop10,
  computeLegendRanges,
  getColorForValue,
} from '../FindingCategoryHotspot';
import AppLoadingContext from '../../AppLoadingContext';

const TEST_DATA = [
  { name: 'Category A', months: ['Jan-24', 'Feb-24', 'Mar-24'], counts: [5, 3, 2] },
  { name: 'Category B', months: ['Jan-24', 'Feb-24', 'Mar-24'], counts: [10, 8, 6] },
  { name: 'Category C', months: ['Jan-24', 'Feb-24', 'Mar-24'], counts: [1, 1, 1] },
  { name: 'Category D', months: ['Jan-24', 'Feb-24', 'Mar-24'], counts: [4, 4, 4] },
  { name: 'Category E', months: ['Jan-24', 'Feb-24', 'Mar-24'], counts: [7, 0, 0] },
  { name: 'Category F', months: ['Jan-24', 'Feb-24', 'Mar-24'], counts: [2, 2, 2] },
  { name: 'Category G', months: ['Jan-24', 'Feb-24', 'Mar-24'], counts: [9, 9, 0] },
  { name: 'Category H', months: ['Jan-24', 'Feb-24', 'Mar-24'], counts: [3, 3, 3] },
  { name: 'Category I', months: ['Jan-24', 'Feb-24', 'Mar-24'], counts: [6, 0, 0] },
  { name: 'Category J', months: ['Jan-24', 'Feb-24', 'Mar-24'], counts: [0, 5, 5] },
  { name: 'Category K', months: ['Jan-24', 'Feb-24', 'Mar-24'], counts: [1, 1, 0] },
];

const renderWidget = (data = TEST_DATA) => render(
  <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
    <FindingCategoryHotspot data={data} loading={false} />
  </AppLoadingContext.Provider>,
);

describe('getTop10', () => {
  it('returns at most 10 rows', () => {
    expect(getTop10(TEST_DATA).length).toBe(10);
  });

  it('sorts by total count descending', () => {
    const result = getTop10(TEST_DATA);
    for (let i = 0; i < result.length - 1; i += 1) {
      expect(result[i].total).toBeGreaterThanOrEqual(result[i + 1].total);
    }
  });

  it('attaches total to each row', () => {
    const result = getTop10([TEST_DATA[0]]);
    expect(result[0].total).toBe(10); // 5+3+2
  });

  it('handles empty data', () => {
    expect(getTop10([])).toEqual([]);
  });
});

describe('computeLegendRanges', () => {
  it('returns 5 thresholds', () => {
    expect(computeLegendRanges(100).length).toBe(5);
  });

  it('last threshold equals max', () => {
    expect(computeLegendRanges(100)[4]).toBe(100);
  });

  it('handles zero/falsy max', () => {
    expect(computeLegendRanges(0)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('getColorForValue', () => {
  it('returns zero-opacity rgba for value 0', () => {
    expect(getColorForValue(0, 100)).toContain(', 0)');
  });

  it('returns full-opacity rgba for max value', () => {
    expect(getColorForValue(100, 100)).toContain(', 1)');
  });

  it('returns partial opacity for mid value', () => {
    const color = getColorForValue(50, 100);
    expect(color).toMatch(/rgba\(/);
    expect(color).not.toContain(', 0)');
    expect(color).not.toContain(', 1)');
  });
});

describe('FindingCategoryHotspot widget', () => {
  it('renders the widget title', async () => {
    renderWidget();
    expect(await screen.findByRole('heading', { name: /Finding category hot spots/i })).toBeInTheDocument();
  });

  it('renders at most 10 category rows', async () => {
    renderWidget();
    // 11 categories in TEST_DATA, only 10 should appear
    expect(screen.queryByText('Category K')).not.toBeInTheDocument();
  });

  it('renders month labels', async () => {
    renderWidget();
    // Months appear in tfoot (and hidden header row)
    expect(await screen.findAllByText('Jan-24')).not.toHaveLength(0);
    expect(await screen.findAllByText('Feb-24')).not.toHaveLength(0);
    expect(await screen.findAllByText('Mar-24')).not.toHaveLength(0);
  });

  it('renders the frequency legend', async () => {
    renderWidget();
    expect(await screen.findByText(/Frequency of finding categories:/i)).toBeInTheDocument();
  });

  it('renders month labels in the table footer', async () => {
    renderWidget();
    const footerCells = await screen.findAllByText('Jan-24');
    // Month appears in both the hidden header row and tfoot
    expect(footerCells.length).toBeGreaterThanOrEqual(1);
  });

  it('renders axis header labels', async () => {
    renderWidget();
    expect(await screen.findByText(/Finding category \(Top 10\)/i)).toBeInTheDocument();
    expect(await screen.findByText(/Number of activity reports with finding category/i)).toBeInTheDocument();
    expect(await screen.findByText(/Activity report start date/i)).toBeInTheDocument();
  });

  it('toggles to table view via actions menu', async () => {
    renderWidget();
    fireEvent.click(screen.getByTestId('context-menu-actions-btn'));
    fireEvent.click(screen.getByText('Display table'));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('renders with empty data without crashing', () => {
    renderWidget([]);
    expect(screen.getByRole('heading', { name: /Finding category hot spots/i })).toBeInTheDocument();
  });
});
