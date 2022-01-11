import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import FilterStateSelect from '../FilterStateSelect';
import UserContext from '../../../UserContext';
import { SCOPE_IDS } from '../../../Constants';

const { findByText } = screen;
const { READ_ACTIVITY_REPORTS } = SCOPE_IDS;

describe('FilterStateSelect', () => {
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
    await selectEvent.select(select, ['MA']);
    expect(onApply).toHaveBeenCalledWith(['MA']);
  });

  it('handles a user with permissions to region 11', async () => {
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
    await selectEvent.select(select, ['PR']);
    const options = document.querySelectorAll('div[class$="-option"]');
    expect(options.length).toBe(55);
    expect(onApply).toHaveBeenCalledWith(['PR']);
  });

  it('handles a user with permissions to region 12', async () => {
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
    await selectEvent.select(select, ['GU']);
    const options = document.querySelectorAll('div[class$="-option"]');
    expect(options.length).toBe(55);
    expect(onApply).toHaveBeenCalledWith(['GU']);
  });
});
