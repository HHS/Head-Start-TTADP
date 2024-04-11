/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  waitFor,
  act,
} from '@testing-library/react';
import BarGraph from '../BarGraph';

const TEST_DATA = [{
  category: 'one',
  count: 1,
},
{
  category: 'two / two and a half',
  count: 2,
},
{
  category: 'three is the number than comes after two and with that we think about it',
  count: 0,
}];

const renderBarGraph = async () => {
  act(() => {
    render(<BarGraph data={TEST_DATA} />);
  });
};

describe('Bar Graph', () => {
  it('is shown', async () => {
    renderBarGraph();

    await waitFor(() => expect(document.querySelector('svg')).not.toBe(null));

    const point1 = document.querySelector('g.ytick');
    // eslint-disable-next-line no-underscore-dangle
    expect(point1.__data__.text).toBe('one');

    const point2 = document.querySelector('g.xtick');
    // eslint-disable-next-line no-underscore-dangle
    expect(point2.__data__.text).toBe('0');
  });
});
