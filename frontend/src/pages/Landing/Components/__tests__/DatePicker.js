import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DatePicker from '../DatePicker';

// eslint-disable-next-line react/prop-types
const RenderDatePicker = ({ onUpdateFilter = () => {}, id = 'id', query = null }) => (
  <DatePicker
    onUpdateFilter={onUpdateFilter}
    id={id}
    query={query}
  />
);

describe('DatePicker', () => {
  it('opens calendar when open calendar button is pressed', async () => {
    render(<RenderDatePicker />);
    const button = await screen.findByRole('button');
    userEvent.click(button);
    const calendar = await screen.findByRole('button', { name: 'Move backward to switch to the previous month.' });
    expect(calendar).toBeVisible();
  });

  it('parses a date `query`', async () => {
    render(<RenderDatePicker query="2021/05/05" />);
    const text = await screen.findByRole('textbox');
    expect(text).toHaveValue('05/05/2021');
  });

  it('closes the calendar after a date is selected', async () => {
    render(<RenderDatePicker />);
    const button = await screen.findByRole('button');
    userEvent.click(button);
    const buttons = await screen.findAllByRole('button');
    const firstDay = buttons.find((b) => b.textContent === '1');
    userEvent.click(firstDay);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Move backward to switch to the previous month.' })).toBeNull());
  });

  it('calls "onUpdateFilter" when the date changes', async () => {
    const onUpdateFilter = jest.fn();
    render(<RenderDatePicker onUpdateFilter={onUpdateFilter} />);
    const text = await screen.findByRole('textbox');
    userEvent.type(text, '02/02/2022');
    await waitFor(() => expect(onUpdateFilter).toHaveBeenCalled());
  });
});
