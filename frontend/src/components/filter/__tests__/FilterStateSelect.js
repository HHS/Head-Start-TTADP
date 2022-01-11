import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import FilterStateSelect from '../FilterStateSelect';
import UserContext from '../../../UserContext';

const { findByText } = screen;

describe('FilterStateSelect', () => {
  const renderStateSelect = (onApply) => {
    const user = {
      permissions: [],
    };
    render(
      <UserContext.Provider {...{ user }}>
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
    renderStateSelect(onApply);

    const select = await findByText(/Select state to filter by/i);
    await selectEvent.select(select, ['MA']);
    expect(onApply).toHaveBeenCalledWith(['MA']);
  });
});
