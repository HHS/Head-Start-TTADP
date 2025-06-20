import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterRegionSelect from '../FilterRegionSelect';
import UserContext from '../../../UserContext';

const { findByRole } = screen;

describe('FilterRegionSelect', () => {
  const renderRegionSelect = (user, appliedRegion, onApply) => (
    render(
      <UserContext.Provider value={{
        user,
      }}
      >
        <FilterRegionSelect
          onApply={onApply}
          inputId="curly"
          appliedRegion={appliedRegion}
        />
      </UserContext.Provider>,
    ));

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    const user = {
      name: 'test@test.com',
      homeRegionId: 6,
      id: 352,
      permissions: [
        {
          regionId: 6,
          scopeId: 3,
          userId: 352,
        },
        {
          regionId: 4,
          scopeId: 3,
          userId: 352,
        },
      ],
    };
    renderRegionSelect(user, 4, onApply);
    const select = await findByRole('combobox', { name: /select region to filter by/i });
    userEvent.selectOptions(select, '6');
    expect(onApply).toHaveBeenCalled();
  });

  it('shows all regions', async () => {
    const onApply = jest.fn();
    const user = {
      name: 'test@test.com',
      homeRegionId: 14,
      id: 352,
      permissions: [
        {
          regionId: 6,
          scopeId: 3,
          userId: 352,
        },
        {
          regionId: 4,
          scopeId: 3,
          userId: 352,
        },
      ],
    };
    renderRegionSelect(user, 14, onApply);

    const select = await findByRole('combobox', { name: /select region to filter by/i });
    userEvent.selectOptions(select, '6');
    expect(onApply).toHaveBeenCalled();
  });
});
