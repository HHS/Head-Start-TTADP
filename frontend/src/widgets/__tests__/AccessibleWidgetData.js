import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import AccessibleWidgetData from '../AccessibleWidgetData';

describe('accessible widget data table', () => {
  it('renders data as expected', () => {
    const data = [
      {
        heading: 'Special Agent',
        data: ['Cherry'],
      },
      {
        data: ['Audrey', 'Boysenberry'],
      },
      {
        data: ['Bobby', 'Mincemeat'],
      },
    ];

    render(<AccessibleWidgetData
      caption="This table is not what it seems"
      columnHeadings={['Person', 'Favorite Pie']}
      rows={data}
    />);

    const els = [
      screen.getByText(/this table is not what it seems/i),
      screen.getByRole('rowheader', { name: /special agent/i }),
      screen.getByRole('columnheader', { name: /favorite pie/i }),
      screen.getByRole('cell', { name: /mincemeat/i }),
    ];

    els.forEach((el) => {
      expect(el).toBeInTheDocument();
    });
  });
});
