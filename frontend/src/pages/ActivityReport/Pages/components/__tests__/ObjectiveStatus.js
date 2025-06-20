import React from 'react';
import { render, screen } from '@testing-library/react';
import ObjectiveStatus from '../ObjectiveStatus';

describe('ObjectiveStatus', () => {
  const defaultProps = {
    status: 'Not Started',
    onChangeStatus: jest.fn(),
    onBlur: jest.fn(),
    inputName: 'objectiveStatus',
    closeSuspendReason: '',
    closeSuspendContext: '',
  };

  it('renders successfully', () => {
    render(
      <ObjectiveStatus
        status={defaultProps.status}
        onChangeStatus={defaultProps.onChangeStatus}
        onBlur={defaultProps.onBlur}
        inputName={defaultProps.inputName}
        closeSuspendReason={defaultProps.closeSuspendReason}
        closeSuspendContext={defaultProps.closeSuspendContext}
      />,
    );
    expect(screen.getByLabelText(/Objective status/i)).toBeInTheDocument();
  });

  it('shows all options when status is Not Started', () => {
    render(
      <ObjectiveStatus
        status="Not Started"
        onChangeStatus={defaultProps.onChangeStatus}
        onBlur={defaultProps.onBlur}
        inputName={defaultProps.inputName}
        closeSuspendReason={defaultProps.closeSuspendReason}
        closeSuspendContext={defaultProps.closeSuspendContext}
      />,
    );
    const options = screen.getAllByRole('option').map((opt) => opt.textContent);
    expect(options).toEqual([
      'Not Started',
      'In Progress',
      'Suspended',
      'Complete',
    ]);
  });

  it('shows only In Progress, Suspended, Complete when status is In Progress', () => {
    render(
      <ObjectiveStatus
        status="In Progress"
        onChangeStatus={defaultProps.onChangeStatus}
        onBlur={defaultProps.onBlur}
        inputName={defaultProps.inputName}
        closeSuspendReason={defaultProps.closeSuspendReason}
        closeSuspendContext={defaultProps.closeSuspendContext}
      />,
    );
    const options = screen.getAllByRole('option').map((opt) => opt.textContent);
    expect(options).toEqual([
      'In Progress',
      'Suspended',
      'Complete',
    ]);
  });

  it('shows only In Progress, Suspended, Complete when status is Suspended', () => {
    render(
      <ObjectiveStatus
        status="Suspended"
        onChangeStatus={defaultProps.onChangeStatus}
        onBlur={defaultProps.onBlur}
        inputName={defaultProps.inputName}
        closeSuspendReason={defaultProps.closeSuspendReason}
        closeSuspendContext={defaultProps.closeSuspendContext}
      />,
    );
    const options = screen.getAllByRole('option').map((opt) => opt.textContent);
    expect(options).toEqual([
      'In Progress',
      'Suspended',
      'Complete',
    ]);
  });

  it('shows only In Progress, Suspended, Complete when status is Complete', () => {
    render(
      <ObjectiveStatus
        status="Complete"
        onChangeStatus={defaultProps.onChangeStatus}
        onBlur={defaultProps.onBlur}
        inputName={defaultProps.inputName}
        closeSuspendReason={defaultProps.closeSuspendReason}
        closeSuspendContext={defaultProps.closeSuspendContext}
      />,
    );
    const options = screen.getAllByRole('option').map((opt) => opt.textContent);
    expect(options).toEqual([
      'In Progress',
      'Suspended',
      'Complete',
    ]);
  });
});
