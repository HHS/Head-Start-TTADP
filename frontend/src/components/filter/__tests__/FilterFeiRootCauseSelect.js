import '@testing-library/jest-dom';
import React from 'react';
import fetchMock from 'fetch-mock';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import FilterActivityReportGoalResponseSelect from '../FilterActivityReportGoalResponseSelect';

const { findByText } = screen;

describe('FilterActivityReportGoalResponseSelect', () => {
  const renderFeiRootCauseSelect = async (onApply) => (
    render(
      <FilterActivityReportGoalResponseSelect
        onApply={onApply}
        inputId="curly"
        query={[]}
        title="FEI root cause"
      />,
    ));

  it('calls the onapply handler', async () => {
    fetchMock.get('/api/goal-templates/options?name=FEI%20root%20cause', { options: ['root cause 1', 'root cause 2'] });
    const onApply = jest.fn();
    await renderFeiRootCauseSelect(onApply);

    const select = await findByText(/Select root cause to filter by/i);
    await selectEvent.select(select, ['root cause 2']);
    expect(onApply).toHaveBeenCalledWith(['root cause 2']);
  });
});
