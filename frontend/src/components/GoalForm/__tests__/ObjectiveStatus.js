import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  render, screen,
} from '@testing-library/react';
import ObjectiveStatus from '../ObjectiveStatus';

describe('ObjectiveStatus', () => {
  it('shows the dropdown', async () => {
    const onChangeStatus = jest.fn();

    render(<ObjectiveStatus
      status="In Progress"
      goalStatus="In Progress"
      onChangeStatus={onChangeStatus}
      inputName="objective-status"
      isOnReport={false}
      userCanEdit
      previousStatus="Not Started"
    />);

    const dropdown = await screen.findByLabelText('Objective status');
    expect(dropdown).toBeVisible();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);

    userEvent.selectOptions(dropdown, 'Complete');
    expect(onChangeStatus).toHaveBeenCalledWith('Complete');
  });

  it('shows the correct options for completed', async () => {
    const onChangeStatus = jest.fn();

    render(<ObjectiveStatus
      status="Complete"
      goalStatus="In Progress"
      onChangeStatus={onChangeStatus}
      inputName="objective-status"
      isOnReport={false}
      userCanEdit
    />);

    const dropdown = await screen.findByLabelText('Objective status');
    expect(dropdown).toBeVisible();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
  });

  it('shows the read only view when the goal is not started', async () => {
    const onChangeStatus = jest.fn();

    render(<ObjectiveStatus
      status="Not Started"
      goalStatus="Not Started"
      onChangeStatus={onChangeStatus}
      inputName="objective-status"
      isOnReport={false}
      userCanEdit
    />);

    const label = await screen.findByText('Objective status');

    expect(label).toBeVisible();
    expect(label.tagName).toEqual('P');

    expect(document.querySelector('select')).toBe(null);
  });

  it('shows the read only view when the goal is closed', async () => {
    const onChangeStatus = jest.fn();

    render(<ObjectiveStatus
      status="Complete"
      goalStatus="Closed"
      onChangeStatus={onChangeStatus}
      inputName="objective-status"
      isOnReport={false}
      userCanEdit
    />);

    const label = await screen.findByText('Objective status');

    expect(label).toBeVisible();
    expect(label.tagName).toEqual('P');

    expect(document.querySelector('select')).toBe(null);
  });

  it('shows the read only view when the user cannot edit', async () => {
    render(<ObjectiveStatus
      status="In Progress"
      goalStatus="In Progress"
      onChangeStatus={jest.fn()}
      inputName="objective-status"
      isOnReport={false}
      userCanEdit={false}
    />);

    const label = await screen.findByText('Objective status');

    expect(label).toBeVisible();
    expect(label.tagName).toEqual('P');

    expect(document.querySelector('select')).toBe(null);
  });

  it('shows all options if the objective is suspended and there is no previous status', async () => {
    const onChangeStatus = jest.fn();

    render(<ObjectiveStatus
      status="Suspended"
      goalStatus="In Progress"
      onChangeStatus={onChangeStatus}
      inputName="objective-status"
      isOnReport={false}
      userCanEdit
    />);

    const dropdown = await screen.findByLabelText('Objective status');
    expect(dropdown).toBeVisible();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
  });

  it('shows the correct options if the objective is suspended and there is a previous status', async () => {
    const onChangeStatus = jest.fn();

    render(<ObjectiveStatus
      status="Suspended"
      goalStatus="In Progress"
      onChangeStatus={onChangeStatus}
      inputName="objective-status"
      isOnReport={false}
      userCanEdit
      previousStatus="Not Started"
    />);

    const dropdown = await screen.findByLabelText('Objective status');
    expect(dropdown).toBeVisible();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);

    const texts = options.map((option) => option.textContent);
    expect(texts).toEqual(['Not Started', 'Suspended']);
  });
});
