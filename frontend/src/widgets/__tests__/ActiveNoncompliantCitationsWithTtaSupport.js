import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import AppLoadingContext from '../../AppLoadingContext';
import { ActiveNoncompliantCitationsWithTtaSupportWidget } from '../ActiveNoncompliantCitationsWithTtaSupport';

jest.mock('plotly.js-basic-dist', () => ({
  newPlot: jest.fn(),
}));

const TEST_DATA = [
  {
    name: 'Active Noncompliant Citations with TTA support',
    x: ['1', '2'],
    y: [1, 2],
    month: ['Jan', 'Feb'],
    trace: 'circle',
    id: 'active-areas-of-noncompliance-with-tta-support',
  },
  {
    name: 'All active Noncompliant Citations',
    x: ['1', '2'],
    y: [2, 3],
    month: ['Jan', 'Feb'],
    trace: 'triangle',
    id: 'all-active-areas-of-noncompliance',
  },
];

describe('ActiveNoncompliantCitationsWithTtaSupportWidget', () => {
  it('derives legend labels from trace data', async () => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <ActiveNoncompliantCitationsWithTtaSupportWidget
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
      </AppLoadingContext.Provider>
    );

    expect(
      await screen.findByRole('checkbox', { name: 'Derived legend label one' })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('checkbox', { name: 'Derived legend label two' })
    ).toBeInTheDocument();
  });

  it('renders and toggles to tabular view', async () => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <ActiveNoncompliantCitationsWithTtaSupportWidget data={TEST_DATA} />
      </AppLoadingContext.Provider>
    );

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: /Noncompliant citations with TTA support/i,
      })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('context-menu-actions-btn'));
    fireEvent.click(screen.getByText('Display table'));

    expect(await screen.findByText('Noncompliant citations')).toBeInTheDocument();
  });
});
