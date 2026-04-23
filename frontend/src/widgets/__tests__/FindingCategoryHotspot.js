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
  buildLegendLabels,
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

  it('returns fewer than 5 thresholds for small max values', () => {
    expect(computeLegendRanges(1).length).toBe(1);
    expect(computeLegendRanges(2).length).toBe(2);
    expect(computeLegendRanges(3).length).toBe(3);
    expect(computeLegendRanges(4).length).toBe(4);
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

  it('renders at most 10 category rows in the hotspot grid', async () => {
    renderWidget();
    // 11 categories in TEST_DATA, only 10 should appear in the grid
    expect(screen.queryByText('Category K')).not.toBeInTheDocument();
  });

  it('shows all categories in table view', async () => {
    renderWidget();
    fireEvent.click(screen.getByTestId('context-menu-actions-btn'));
    fireEvent.click(screen.getByText('Display table'));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    // Category K is the 11th category and should appear in table view
    expect(screen.getByText('Category K')).toBeInTheDocument();
  });

  it('renders month labels', async () => {
    renderWidget();
    // Months appear in tfoot (aria-hidden) and sr-only header row
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
    // Month appears in both the sr-only header row and aria-hidden tfoot
    expect(footerCells.length).toBeGreaterThanOrEqual(1);
  });

  it('renders axis header labels', async () => {
    renderWidget();
    expect(await screen.findByText(/Finding category \(Top 10\)/i)).toBeInTheDocument();
    expect(await screen.findByText(/Number of activity reports with finding category/i)).toBeInTheDocument();
    expect(await screen.findByText(/Activity report start date/i)).toBeInTheDocument();
  });

  it('exposes month column headers to assistive technology', async () => {
    const { container } = renderWidget();

    // The sr-only header row must NOT be aria-hidden
    const srOnlyRow = container.querySelector('thead tr.usa-sr-only');
    expect(srOnlyRow).toBeInTheDocument();
    expect(srOnlyRow).not.toHaveAttribute('aria-hidden');

    // Month <th> cells must be present in the accessibility tree
    const monthHeaders = Array.from(srOnlyRow.querySelectorAll('th[scope="col"]'));
    const monthNames = monthHeaders.map((th) => th.textContent);
    expect(monthNames).toContain('Jan-24');
    expect(monthNames).toContain('Feb-24');
    expect(monthNames).toContain('Mar-24');

    // tfoot must be aria-hidden (visual duplicate only)
    const tfoot = container.querySelector('tfoot');
    expect(tfoot).toHaveAttribute('aria-hidden', 'true');
  });

  it('toggles to table view via actions menu', async () => {
    renderWidget();
    fireEvent.click(screen.getByTestId('context-menu-actions-btn'));
    fireEvent.click(screen.getByText('Display table'));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('shows total column values in table view', async () => {
    // Category B has counts [10, 8, 6] = total 24
    renderWidget();
    fireEvent.click(screen.getByTestId('context-menu-actions-btn'));
    fireEvent.click(screen.getByText('Display table'));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    // Total column header
    expect(screen.getByText('Total')).toBeInTheDocument();
    // Category B total = 24
    expect(screen.getByText('24')).toBeInTheDocument();
  });

  it('uses backend-provided total when present', () => {
    const dataWithTotal = [
      {
        name: 'Cat X', months: ['Jan-24'], counts: [3], total: 99,
      },
    ];
    const result = getTop10(dataWithTotal);
    // Should use the backend total (99), not the computed sum (3)
    expect(result[0].total).toBe(99);
  });

  it('renders with empty data without crashing', () => {
    renderWidget([]);
    expect(screen.getByRole('heading', { name: /Finding category hot spots/i })).toBeInTheDocument();
  });

  it('renders legend without undefined when max cell value is 1', async () => {
    const sparseData = [
      { name: 'Single Hit', months: ['Jan-24'], counts: [1] },
    ];
    renderWidget(sparseData);
    const legend = await screen.findByText(/Frequency of finding categories:/i);
    const legendContainer = legend.parentElement;
    expect(legendContainer.textContent).not.toContain('undefined');
    expect(legendContainer.textContent).not.toContain('NaN');
  });
  it('sorts by Finding category column alphabetically', async () => {
    renderWidget();
    // Switch to table view
    fireEvent.click(screen.getByTestId('context-menu-actions-btn'));
    fireEvent.click(screen.getByText('Display table'));
    expect(await screen.findByRole('table')).toBeInTheDocument();

    // Click "Finding category" header to sort ascending (alphabetically)
    const findingCategoryBtn = screen.getByRole('button', { name: /Finding category. Activate to sort ascending/i });
    fireEvent.click(findingCategoryBtn);

    // Grab row headings to verify alphabetical order
    const getRowHeadings = () => {
      const rows = screen.getAllByRole('row');
      // Skip the thead rows — body rows have th[scope="row"]
      return rows
        .map((row) => row.querySelector('th[scope="row"]'))
        .filter(Boolean)
        .map((th) => th.textContent);
    };

    const ascHeadings = getRowHeadings();
    const sortedAsc = [...ascHeadings].sort((a, b) => a.localeCompare(b));
    expect(ascHeadings).toEqual(sortedAsc);

    // Click again for descending
    fireEvent.click(findingCategoryBtn);
    const descHeadings = getRowHeadings();
    const sortedDesc = [...descHeadings].sort((a, b) => b.localeCompare(a));
    expect(descHeadings).toEqual(sortedDesc);
  });
});

describe('buildLegendLabels', () => {
  it('returns only the zero item for max=0', () => {
    expect(buildLegendLabels(0)).toEqual([{ opacity: 0, label: '0' }]);
  });

  it('returns only the zero item for falsy max', () => {
    expect(buildLegendLabels(null)).toEqual([{ opacity: 0, label: '0' }]);
  });

  it('returns two items for max=1 (zero + final bucket)', () => {
    const items = buildLegendLabels(1);
    expect(items.length).toBe(2);
    expect(items[0]).toEqual({ opacity: 0, label: '0' });
    expect(items[1]).toEqual({ opacity: 1.0, label: '1+' });
  });

  it('returns correct items for max=2', () => {
    const items = buildLegendLabels(2);
    expect(items.length).toBe(3);
    expect(items[0]).toEqual({ opacity: 0, label: '0' });
    expect(items[1]).toEqual({ opacity: 0.6, label: '1' });
    expect(items[2]).toEqual({ opacity: 1.0, label: '2+' });
  });

  it('returns correct items for max=3', () => {
    const items = buildLegendLabels(3);
    expect(items.length).toBe(4);
    expect(items[0]).toEqual({ opacity: 0, label: '0' });
    expect(items[1]).toEqual({ opacity: 0.4, label: '1' });
    expect(items[2]).toEqual({ opacity: 0.8, label: '2' });
    expect(items[3]).toEqual({ opacity: 1.0, label: '3+' });
  });

  it('returns 6 items for max=5', () => {
    const items = buildLegendLabels(5);
    expect(items.length).toBe(6);
    expect(items[0]).toEqual({ opacity: 0, label: '0' });
    expect(items[5]).toEqual({ opacity: 1.0, label: '5+' });
  });

  it('returns 6 items matching current behavior for max=100', () => {
    const items = buildLegendLabels(100);
    expect(items.length).toBe(6);
    expect(items[0]).toEqual({ opacity: 0, label: '0' });
    expect(items[1]).toEqual({ opacity: 0.2, label: '1\u201320' });
    expect(items[2]).toEqual({ opacity: 0.4, label: '21\u201340' });
    expect(items[3]).toEqual({ opacity: 0.6, label: '41\u201360' });
    expect(items[4]).toEqual({ opacity: 0.8, label: '61\u201380' });
    expect(items[5]).toEqual({ opacity: 1.0, label: '81+' });
  });

  it('never produces undefined in any label', () => {
    [0, 1, 2, 3, 4, 5, 10, 100].forEach((max) => {
      buildLegendLabels(max).forEach(({ label }) => {
        expect(label).not.toContain('undefined');
        expect(label).not.toContain('NaN');
      });
    });
  });
});
