import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GrantSelect from '../GrantSelect';

describe('GrantSelect', () => {
  const renderGrantSelect = (
    validateGrantNumbers = jest.fn(), userCanEdit = true, selectedGrants = [],
  ) => {
    render((
      <div>
        <GrantSelect
          error={<></>}
          setSelectedGrants={jest.fn()}
          selectedGrants={selectedGrants}
          validateGrantNumbers={validateGrantNumbers}
          label="Select grants"
          inputName="grantSelect"
          isLoading={false}
          isOnReport={false}
          userCanEdit={userCanEdit}
          possibleGrants={[
            {
              value: 1,
              label: 'Grant 1',
            },
            {
              value: 2,
              label: 'Grant 2',
            },
          ]}
        />
        <button type="button">Blur me</button>
      </div>));
  };

  it('calls the on change handler', async () => {
    const validateGrantNumbers = jest.fn();
    renderGrantSelect(validateGrantNumbers);
    const select = await screen.findByLabelText(/select grants/i);

    userEvent.click(select);
    userEvent.click(await screen.findByText('Blur me'));

    expect(validateGrantNumbers).toHaveBeenCalled();
  });

  it('shows the read only view', async () => {
    const validateGrantNumbers = jest.fn();
    const userCanEdit = false;
    renderGrantSelect(validateGrantNumbers, userCanEdit, [{
      value: 1,
      label: 'Grant 1',
    }]);
    await screen.findByText(/select grants/i);
    expect(await screen.findByText('Grant 1')).toBeVisible();
  });
});
