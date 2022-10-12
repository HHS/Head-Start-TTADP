import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GrantSelect from '../GrantSelect';

describe('GrantSelect', () => {
  const renderGrantSelect = (validateGrantNumbers = jest.fn()) => {
    render((
      <div>
        <GrantSelect
          error={<></>}
          setSelectedGrants={jest.fn()}
          selectedGrants={[]}
          validateGrantNumbers={validateGrantNumbers}
          label="Select grants"
          inputName="grantSelect"
          isLoading={false}
          isOnReport={false}
          goalStatus="Not Started"
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

  it('shows the read only view', async () => {
    const validateGrantNumbers = jest.fn();
    renderGrantSelect(validateGrantNumbers);
    const select = await screen.findByLabelText(/select grants/i);

    userEvent.click(select);
    userEvent.click(await screen.findByText('Blur me'));

    expect(validateGrantNumbers).toHaveBeenCalled();
  });
});
