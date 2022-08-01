import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  render, screen,
} from '@testing-library/react';
import ObjectiveStatus from '../ObjectiveStatus';

describe('ObjectiveStatus', () => {
  it('shows the read only view', async () => {
    const onChangeStatus = jest.fn();

    render(<ObjectiveStatus
      status="In Progress"
      goalStatus="In Progress"
      onChangeStatus={onChangeStatus}
      inputName="objective-status"
      isOnReport={false}
    />);

    const dropdown = await screen.findByLabelText('Objective status');
    expect(dropdown).toBeVisible();

    userEvent.selectOptions(dropdown, 'Completed');
    expect(onChangeStatus).toHaveBeenCalledWith('Completed');
  });
});
