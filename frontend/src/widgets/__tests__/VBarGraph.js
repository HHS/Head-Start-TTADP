import '@testing-library/jest-dom';
import React, { createRef } from 'react';
import {
  render,
  waitFor,
  act,
  screen,
} from '@testing-library/react';
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

const renderBarGraph = async (props) => {
  act(() => {
    render(<VBarGraph data={props.data} xAxisLabel="Names" yAxisLabel="Counts" widgetRef={createRef()} />);
  });
};

describe('VBar Graph', () => {
  it('is shown', async () => {
    renderBarGraph({ data: TEST_DATA });

    await waitFor(() => expect(document.querySelector('svg')).not.toBe(null));

    const point1 = document.querySelector('g.ytick');
    // eslint-disable-next-line no-underscore-dangle
    expect(point1.__data__.text).toBe('0');

    const point2 = document.querySelector('g.xtick');
    // eslint-disable-next-line no-underscore-dangle
    expect(point2.__data__.text).toBe('one');
  });

  it('shows no results found', async () => {
    renderBarGraph({ data: [] });

    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeVisible();
      expect(screen.getByText('Try removing or changing the selected filters.')).toBeVisible();
      expect(screen.getByText('Get help using filters')).toBeVisible();
    });
  });
});
