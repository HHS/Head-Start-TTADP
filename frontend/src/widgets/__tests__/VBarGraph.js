import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  waitFor,
  act,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VBarGraph from '../VBarGraph';

const TEST_DATA = [{
  name: 'one',
  count: 1,
},
{
  name: 'two / two and a half',
  count: 2,
},
{
  name: 'three is the number than comes after two and with that we think about it',
  count: 0,
}];

const renderBarGraph = async () => {
  act(() => {
    render(<VBarGraph data={TEST_DATA} xAxisLabel="Names" yAxisLabel="Counts" />);
  });
};

describe('VBar Graph', () => {
  it('is shown', async () => {
    renderBarGraph();

    await waitFor(() => expect(document.querySelector('svg')).not.toBe(null));

    const point1 = document.querySelector('g.ytick');
    // eslint-disable-next-line no-underscore-dangle
    expect(point1.__data__.text).toBe('0');

    const point2 = document.querySelector('g.xtick');
    // eslint-disable-next-line no-underscore-dangle
    expect(point2.__data__.text).toBe('one');
  });

  it('toggles table view', async () => {
    act(() => {
      renderBarGraph();
    });

    await waitFor(() => expect(document.querySelector('svg')).not.toBe(null));

    const button = await screen.findByRole('button', { name: /as table/i });
    act(() => {
      userEvent.click(button);
    });

    const table = document.querySelector('table');
    expect(table).not.toBeNull();
  });
});
