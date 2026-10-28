import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import PercentageActivityReportByRole from '../PercentageActivityReportByRole';

jest.mock('@trussworks/react-uswds', () => ({
  Checkbox: (props) => <input type="checkbox" {...props} />,
  Table: ({ children }) => <table>{children}</table>,
}));

jest.mock('../../components/WidgetContainer', () => ({ children, menuItems }) => (
  <div>
    <button type="button" onClick={menuItems[0].onClick}>
      {menuItems[0].label}
    </button>
    {children}
  </div>
));

jest.mock('../../hooks/useMediaCapture', () => () => jest.fn());
jest.mock('../../hooks/useWidgetExport', () => () => ({ exportRows: jest.fn() }));
jest.mock('../VBarGraph', () => () => null);
jest.mock('../HorizontalTableWidgetCell', () => ({ data }) => (
  <td>{data.heading || data.value || ''}</td>
));

describe('PercentageActivityReportByRole', () => {
  it('sorts a populated table when the specialist role column is clicked', async () => {
    render(
      <PercentageActivityReportByRole
        data={{
          records: [
            { role_name: 'Alpha role', role_count: 1, percentage: 50 },
            { role_name: 'Zulu role', role_count: 1, percentage: 50 },
          ],
          filteredReports: 2,
        }}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Display table' }));
    await userEvent.click(screen.getByRole('button', { name: /Specialist role/ }));

    const rows = screen.getByRole('table').querySelectorAll('tbody tr');
    expect(
      Array.from(rows, (row) => row.querySelectorAll('td')[1].textContent)
    ).toEqual(['Zulu role', 'Alpha role']);
  });
});
