/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DateRangePicker from '../../../../../components/DateRangePicker';

const RenderDateRangePicker = ({
  onUpdateFilter = () => {},
  id = 'id',
  query = null,
}) => (
  <DateRangePicker
    onUpdateFilter={onUpdateFilter}
    id={id}
    query={query}
  />
);

describe('DateRangePicker', () => {
  describe('query parsing', () => {
    it('parses both dates', async () => {
      render(<RenderDateRangePicker query="2021/05/05-2021/05/06" />);
      const firstDate = await screen.findByRole('textbox', { name: /please enter a start date in the format mm\/dd\/yyyy\./i });
      const endDate = await screen.findByRole('textbox', { name: /please enter a end date in the format mm\/dd\/yyyy\./i });
      expect(firstDate).toHaveValue('05/05/2021');
      expect(endDate).toHaveValue('05/06/2021');
    });

    it('parses just the start date', async () => {
      render(<RenderDateRangePicker query="2021/05/05-" />);
      const firstDate = await screen.findByRole('textbox', { name: /please enter a start date in the format mm\/dd\/yyyy\./i });
      expect(firstDate).toHaveValue('05/05/2021');
    });

    it('parses just the end date', async () => {
      render(<RenderDateRangePicker query="-2021/05/06" />);
      const endDate = await screen.findByRole('textbox', { name: /please enter a end date in the format mm\/dd\/yyyy\./i });
      expect(endDate).toHaveValue('05/06/2021');
    });
  });

  it('calls "onChange" and sets the start date', async () => {
    const onUpdateFilter = jest.fn();
    render(<RenderDateRangePicker onUpdateFilter={onUpdateFilter} />);
    const text = await screen.findByRole('textbox', { name: /please enter a start date in the format mm\/dd\/yyyy\./i });
    userEvent.type(text, '02/02/2022');
    await waitFor(() => expect(onUpdateFilter).toHaveBeenCalledWith('query', '2022/02/02-'));
  });

  it('calls "onChange" and sets the end date', async () => {
    const onUpdateFilter = jest.fn();
    render(<RenderDateRangePicker onUpdateFilter={onUpdateFilter} />);
    const text = await screen.findByRole('textbox', { name: /please enter a end date in the format mm\/dd\/yyyy\./i });
    userEvent.type(text, '02/02/2022');
    await waitFor(() => expect(onUpdateFilter).toHaveBeenCalledWith('query', '-2022/02/02'));
  });
});
