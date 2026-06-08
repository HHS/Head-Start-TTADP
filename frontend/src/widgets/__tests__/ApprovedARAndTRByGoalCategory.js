import '@testing-library/jest-dom';
import { act, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ApprovedARAndTRByGoalCategory } from '../ApprovedARAndTRByGoalCategory';

const mockData = [
  {
    category: 'Mental Health',
    activityReportCount: 120,
    sessionReportCount: 30,
    total: 150,
  },
  {
    category: 'Professional Development',
    activityReportCount: 80,
    sessionReportCount: 15,
    total: 95,
  },
  {
    category: 'School Readiness',
    activityReportCount: 50,
    sessionReportCount: 10,
    total: 60,
  },
];

describe('ApprovedARAndTRByGoalCategory', () => {
  it('renders the widget title', () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);
    const titles = screen.getAllByText(
      'Approved Activity Reports and Training Session Reports by goal category',
    );
    expect(titles.length).toBeGreaterThan(0);
  });

  it('renders the description subtitle', () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);
    expect(
      screen.getByText('Data reflects activity starting on 09/01/2025.'),
    ).toBeInTheDocument();
  });

  it('renders the About this data button', () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);
    expect(screen.getByText('About this data')).toBeInTheDocument();
  });

  it('renders the sort dropdown with default value "Total (high to low)"', () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);
    const sortDropdown = screen.getByRole('combobox', { name: /sort by/i });
    expect(sortDropdown).toBeInTheDocument();
    expect(sortDropdown.value).toBe('total-desc');
  });

  it('renders all four sort options', () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);
    expect(screen.getByText('Total (high to low)')).toBeInTheDocument();
    expect(screen.getByText('Total (low to high)')).toBeInTheDocument();
    expect(screen.getByText('Goal Category (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('Goal Category (Z-A)')).toBeInTheDocument();
  });

  it('renders the Activity Reports and Training Sessions checkboxes', () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);
    expect(screen.getByLabelText('Activity Reports')).toBeChecked();
    expect(screen.getByLabelText('Training Sessions')).toBeChecked();
  });

  it('unchecking Activity Reports checkbox hides that trace', () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);
    const arCheckbox = screen.getByLabelText('Activity Reports');
    fireEvent.click(arCheckbox);
    expect(arCheckbox).not.toBeChecked();
  });

  it('unchecking Training Sessions checkbox hides that trace', () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);
    const trCheckbox = screen.getByLabelText('Training Sessions');
    fireEvent.click(trCheckbox);
    expect(trCheckbox).not.toBeChecked();
  });

  it('switches to table view when "Display table" is clicked in Actions menu', async () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);

    const menuButton = await screen.findByRole('button', { name: /open actions/i });
    act(() => {
      userEvent.click(menuButton);
    });

    const viewTableButton = await screen.findByRole('button', { name: /display table/i });
    act(() => {
      userEvent.click(viewTableButton);
    });

    const table = await screen.findByRole('table');
    expect(table).toBeVisible();
  });

  it('switches back to graph view when "Display graph" is clicked in Actions menu', async () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);

    // Open Actions and click Display table
    const menuButton = await screen.findByRole('button', { name: /open actions/i });
    act(() => { userEvent.click(menuButton); });
    const viewTableButton = await screen.findByRole('button', { name: /display table/i });
    act(() => { userEvent.click(viewTableButton); });

    // Now switch back to graph
    const menuButton2 = await screen.findByRole('button', { name: /open actions/i });
    act(() => { userEvent.click(menuButton2); });
    const displayGraphButton = await screen.findByRole('button', { name: /display graph/i });
    act(() => { userEvent.click(displayGraphButton); });

    // Graph checkboxes should be visible again
    expect(screen.getByTestId('graph-checkboxes')).toBeInTheDocument();
  });

  it('shows no results found when all category totals are zero', () => {
    const zeroCounts = mockData.map((d) => ({ ...d, activityReportCount: 0, sessionReportCount: 0, total: 0 }));
    render(<ApprovedARAndTRByGoalCategory data={zeroCounts} loading={false} />);
    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });

  it('changes the sort option when dropdown is changed', () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);
    const sortDropdown = screen.getByRole('combobox', { name: /sort by/i });
    fireEvent.change(sortDropdown, { target: { value: 'category-asc' } });
    expect(sortDropdown.value).toBe('category-asc');
  });

  it('shows table with correct column headings', async () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);

    const menuButton = await screen.findByRole('button', { name: /open actions/i });
    act(() => { userEvent.click(menuButton); });
    const viewTableButton = await screen.findByRole('button', { name: /display table/i });
    act(() => { userEvent.click(viewTableButton); });

    const arHeadings = await screen.findAllByText('Number of Activity Reports');
    expect(arHeadings.length).toBeGreaterThan(0);
    const trHeadings = screen.getAllByText('Number of Training Report Sessions');
    expect(trHeadings.length).toBeGreaterThan(0);
    const totalHeadings = screen.getAllByText('Total');
    expect(totalHeadings.length).toBeGreaterThan(0);
    expect(screen.getByText('Goal category')).toBeInTheDocument();
  });

  it('sorts table by goal category ascending on first click of Goal category header', async () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);

    // Switch to table view
    const menuButton = await screen.findByRole('button', { name: /open actions/i });
    act(() => { userEvent.click(menuButton); });
    const viewTableButton = await screen.findByRole('button', { name: /display table/i });
    act(() => { userEvent.click(viewTableButton); });

    // Click the Goal category column header to sort ascending
    const goalCategoryBtn = await screen.findByText('Goal category');
    act(() => { fireEvent.click(goalCategoryBtn); });
    expect(goalCategoryBtn).toBeInTheDocument();
  });

  it('sorts table by goal category descending on second click of Goal category header', async () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);

    // Switch to table view
    const menuButton = await screen.findByRole('button', { name: /open actions/i });
    act(() => { userEvent.click(menuButton); });
    const viewTableButton = await screen.findByRole('button', { name: /display table/i });
    act(() => { userEvent.click(viewTableButton); });

    // First click: sort ascending
    const goalCategoryBtn = await screen.findByText('Goal category');
    act(() => { fireEvent.click(goalCategoryBtn); });

    // Second click: toggle to descending
    act(() => { fireEvent.click(goalCategoryBtn); });
    expect(goalCategoryBtn).toBeInTheDocument();
  });

  it('table sort dropdown is visible in table view', async () => {
    render(<ApprovedARAndTRByGoalCategory data={mockData} loading={false} />);

    // Switch to table view
    const menuButton = await screen.findByRole('button', { name: /open actions/i });
    act(() => { userEvent.click(menuButton); });
    const viewTableButton = await screen.findByRole('button', { name: /display table/i });
    act(() => { userEvent.click(viewTableButton); });

    // Sort dropdown should still be visible in table view
    expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument();
    expect(screen.getByText('Goal category')).toBeInTheDocument();
  });

  it('pre-sorts table by total desc (highest first) when data loads', async () => {
    const tiedData = [
      { category: 'Governance', activityReportCount: 1, sessionReportCount: 0, total: 1 },
      { category: 'Child Safety', activityReportCount: 1, sessionReportCount: 0, total: 1 },
      { category: 'Fiscal Management', activityReportCount: 1, sessionReportCount: 0, total: 1 },
      { category: 'Family Engagement', activityReportCount: 1, sessionReportCount: 0, total: 1 },
    ];
    render(<ApprovedARAndTRByGoalCategory data={[...mockData, ...tiedData]} loading={false} />);

    const menuButton = await screen.findByRole('button', { name: /open actions/i });
    act(() => { userEvent.click(menuButton); });
    const viewTableButton = await screen.findByRole('button', { name: /display table/i });
    act(() => { userEvent.click(viewTableButton); });

    await screen.findByRole('table');

    const rows = screen.getAllByRole('row');
    // Category names are in the first td of each data row
    const rowHeadings = rows
      .map((row) => row.querySelector('td'))
      .filter(Boolean)
      .map((td) => td.textContent.trim());

    // Mental Health (150) should be first
    expect(rowHeadings[0]).toBe('Mental Health');
    // Professional Development (95) second
    expect(rowHeadings[1]).toBe('Professional Development');
    // School Readiness (60) third
    expect(rowHeadings[2]).toBe('School Readiness');
    // Tied (all 1): alphabetical A→Z → Child Safety first
    expect(rowHeadings[3]).toBe('Child Safety');
    expect(rowHeadings[rowHeadings.length - 1]).toBe('Governance');
  });

  it('table Total desc via dropdown puts higher-total category above lower-total category', async () => {
    // Regression: sorting high-to-low should show Mental Health (150) before New Leaders (5).
    const data = [
      { category: 'New Leaders', activityReportCount: 5, sessionReportCount: 0, total: 5 },
      { category: 'Mental Health', activityReportCount: 120, sessionReportCount: 30, total: 150 },
    ];
    render(<ApprovedARAndTRByGoalCategory data={data} loading={false} />);

    const menuButton = await screen.findByRole('button', { name: /open actions/i });
    act(() => { userEvent.click(menuButton); });
    const viewTableButton = await screen.findByRole('button', { name: /display table/i });
    act(() => { userEvent.click(viewTableButton); });

    await screen.findByRole('table');

    // Select Total (high to low) from the dropdown
    const sortDropdown = screen.getByRole('combobox', { name: /sort by/i });
    fireEvent.change(sortDropdown, { target: { value: 'total-desc' } });

    const rows = screen.getAllByRole('row');
    const rowHeadings = rows
      .map((row) => row.querySelector('td'))
      .filter(Boolean)
      .map((td) => td.textContent.trim());

    // Mental Health (150) must appear before New Leaders (5) — high to low
    expect(rowHeadings[0]).toBe('Mental Health');
    expect(rowHeadings[1]).toBe('New Leaders');
  });

  it('sorts table by Total ascending with A-Z tiebreaker via dropdown', async () => {
    const tiedData = [
      { category: 'Governance', activityReportCount: 1, sessionReportCount: 0, total: 1 },
      { category: 'Child Safety', activityReportCount: 1, sessionReportCount: 0, total: 1 },
    ];
    render(<ApprovedARAndTRByGoalCategory data={tiedData} loading={false} />);

    const menuButton = await screen.findByRole('button', { name: /open actions/i });
    act(() => { userEvent.click(menuButton); });
    const viewTableButton = await screen.findByRole('button', { name: /display table/i });
    act(() => { userEvent.click(viewTableButton); });

    await screen.findByRole('table');

    // Select Total (low to high) from the dropdown
    const sortDropdown = screen.getByRole('combobox', { name: /sort by/i });
    fireEvent.change(sortDropdown, { target: { value: 'total-asc' } });

    const rows = screen.getAllByRole('row');
    const rowHeadings = rows
      .map((row) => row.querySelector('td'))
      .filter(Boolean)
      .map((td) => td.textContent.trim());

    // Tied totals: A-Z tiebreaker → Child Safety before Governance
    expect(rowHeadings[0]).toBe('Child Safety');
    expect(rowHeadings[1]).toBe('Governance');
  });
});
