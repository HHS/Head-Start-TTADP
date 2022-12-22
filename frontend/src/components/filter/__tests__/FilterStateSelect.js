import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import fetchMock from 'fetch-mock';
import FilterStateSelect from '../FilterStateSelect';
import UserContext from '../../../UserContext';
import { SCOPE_IDS } from '../../../Constants';

const { findByText } = screen;
const { READ_ACTIVITY_REPORTS } = SCOPE_IDS;

describe('FilterStateSelect', () => {
  afterEach(async () => fetchMock.reset());

  const renderStateSelect = (user, onApply) => {
    render(
      <UserContext.Provider value={{ user }}>
        <FilterStateSelect
          onApply={onApply}
          inputId="curly"
          query={[]}
        />
      </UserContext.Provider>,
    );
  };

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    const user = {
      permissions: [
        {
          regionId: 1,
          scopeId: READ_ACTIVITY_REPORTS,
        },
      ],
    };

    renderStateSelect(user, onApply);

    const select = await findByText(/Select state to filter by/i);
    await selectEvent.select(select, ['Massachusetts (MA)']);
    expect(onApply).toHaveBeenCalledWith(['MA']);
  });

  it('handles a user with permissions to region 11', async () => {
    fetchMock.get('/api/users/stateCodes', ['AZ', 'PR', 'FC']);
    const onApply = jest.fn();
    const user = {
      permissions: [
        {
          regionId: 11,
          scopeId: READ_ACTIVITY_REPORTS,
        },
      ],
    };

    renderStateSelect(user, onApply);
    const select = await findByText(/Select state to filter by/i);
    await selectEvent.select(select, ['Puerto Rico (PR)', 'FC']);
    const options = document.querySelectorAll('div[class$="-option"]');
    expect(options.length).toBe(3);
    expect(onApply).toHaveBeenCalledWith(['PR']);
    expect(onApply).toHaveBeenCalledWith(['FC']);
  });

  it('handles a user with permissions to region 12', async () => {
    fetchMock.get('/api/users/stateCodes', ['AZ', 'GU']);
    const onApply = jest.fn();
    const user = {
      permissions: [
        {
          regionId: 11,
          scopeId: READ_ACTIVITY_REPORTS,
        },
      ],
    };

    renderStateSelect(user, onApply);
    const select = await findByText(/Select state to filter by/i);
    await selectEvent.select(select, ['Guam (GU)']);
    const options = document.querySelectorAll('div[class$="-option"]');
    expect(options.length).toBe(2);
    expect(onApply).toHaveBeenCalledWith(['GU']);
  });

  it('handles a request error when fetching user state data', async () => {
    fetchMock.get('/api/users/stateCodes', 500);
    const onApply = jest.fn();
    const user = {
      permissions: [
        {
          regionId: 11,
          scopeId: READ_ACTIVITY_REPORTS,
        },
      ],
    };

    renderStateSelect(user, onApply);
    const select = await findByText(/Select state to filter by/i);
    await selectEvent.select(select, ['Guam (GU)']);
    const options = document.querySelectorAll('div[class$="-option"]');
    expect(options.length).toBe(59);
    expect(onApply).toHaveBeenCalledWith(['GU']);
  });
});
