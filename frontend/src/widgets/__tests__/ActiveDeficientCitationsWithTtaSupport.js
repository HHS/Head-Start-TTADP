import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { ActiveDeficientCitationsWithTtaSupportWidget } from '../ActiveDeficientCitationsWithTtaSupport';

jest.mock('plotly.js-basic-dist', () => ({
  newPlot: jest.fn(),
}));

const TEST_DATA = [
  {
    name: 'Active Deficiencies with TTA support',
    x: ['1', '2'],
    y: [1, 2],
    month: ['Jan', 'Feb'],
    trace: 'circle',
    id: 'active-deficiencies-with-tta-support',
  },
  {
    name: 'All active Deficiencies',
    x: ['1', '2'],
    y: [2, 3],
    month: ['Jan', 'Feb'],
    trace: 'triangle',
    id: 'all-active-deficiencies',
  },
];

describe('ActiveDeficientCitationsWithTtaSupportWidget', () => {
  it('renders and toggles to tabular view', async () => {
    render(<ActiveDeficientCitationsWithTtaSupportWidget data={TEST_DATA} />);

    expect(await screen.findByText('Active Deficient Citations with TTA Support')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('context-menu-actions-btn'));
    fireEvent.click(screen.getByText('Display table'));

    expect(await screen.findByText('TTA Provided')).toBeInTheDocument();
  });
});
