import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import AppLoadingContext from '../../../AppLoadingContext';
import RestartStandardGoal from '../RestartStandardGoal';
import UpdateStandardGoal from '../UpdateStandardGoal';

jest.mock('../UpdateStandardGoalForm', () => () => <div>Update goal form</div>);
jest.mock('../RestartStandardGoalForm', () => () => <div>Restart goal form</div>);

describe('standard goal pages with the real prompt hook', () => {
  afterEach(() => fetchMock.restore());

  it.each([
    { Page: UpdateStandardGoal, text: 'Update goal form' },
    { Page: RestartStandardGoal, text: 'Restart goal form' },
  ])('fetches and renders $text after a curated response', async ({ Page, text }) => {
    fetchMock.get('path:/api/goal-templates/1/prompts', [[], null]);
    fetchMock.get('path:/api/goal-templates/standard/1/grant/10', { id: 1 });
    render(
      <MemoryRouter initialEntries={['/goals/1/grant/10/region/1']}>
        <Route path="/goals/:goalTemplateId/grant/:grantId/region/:regionId">
          <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
            <Page recipient={{ id: 1 }} />
          </AppLoadingContext.Provider>
        </Route>
      </MemoryRouter>
    );
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(fetchMock.called('path:/api/goal-templates/standard/1/grant/10')).toBe(true);
  });
});
