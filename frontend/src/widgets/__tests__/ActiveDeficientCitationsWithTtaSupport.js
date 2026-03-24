import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { ActiveDeficientCitationsWithTtaSupportWidget } from '../ActiveDeficientCitationsWithTtaSupport';
import AppLoadingContext from '../../AppLoadingContext';

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
  it('derives legend labels from trace data', async () => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <ActiveDeficientCitationsWithTtaSupportWidget
          data={[
            {
              ...TEST_DATA[0],
              name: 'Derived legend label one',
            },
            {
              ...TEST_DATA[1],
              name: 'Derived legend label two',
            },
          ]}
        />
      </AppLoadingContext.Provider>,
    );

    expect(
      await screen.findByRole('checkbox', { name: 'Derived legend label one' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('checkbox', { name: 'Derived legend label two' }),
    ).toBeInTheDocument();
  });

  it('renders and toggles to tabular view', async () => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <ActiveDeficientCitationsWithTtaSupportWidget data={TEST_DATA} />
      </AppLoadingContext.Provider>,
    );

    expect(await screen.findByRole('heading', { level: 2, name: /Active deficient citations with TTA support/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('context-menu-actions-btn'));
    fireEvent.click(screen.getByText('Display table'));

    expect(await screen.findByText('Active deficient citations')).toBeInTheDocument();
  });
});
