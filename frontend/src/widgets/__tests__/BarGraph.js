/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import BarGraph from '../BarGraph';

const TEST_DATA = [{
  category: 'one',
  count: 1,
},
{
  category: 'two',
  count: 2,
},
{
  category: 'three',
  count: 0,
}];

const renderBarGraph = async () => (
  render(<BarGraph data={TEST_DATA} xAxisLabel="xaxis" yAxisLabel="yaxis" />)
);

describe('Bar Graph', () => {
  it('is shown', async () => {
    renderBarGraph();
    await screen.findByText('xaxis');
    const point1 = document.querySelector('g.xtick');
    // eslint-disable-next-line no-underscore-dangle
    expect(point1.__data__.text).toBe(' one');
  });

  it('has the correct x axis label', async () => {
    renderBarGraph();
    const axis = await screen.findByText('xaxis');
    expect(axis).toBeInTheDocument();
  });

  it('has the correct y axis label', async () => {
    renderBarGraph();
    const axis = await screen.findByText('yaxis');
    expect(axis).toBeInTheDocument();
  });
});
