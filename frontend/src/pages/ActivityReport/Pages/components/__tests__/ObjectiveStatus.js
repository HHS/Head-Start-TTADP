import React from 'react'
import { render, screen } from '@testing-library/react'
import ObjectiveStatus from '../ObjectiveStatus'
import { OBJECTIVE_STATUS } from '../../../../../Constants'

describe('ObjectiveStatus', () => {
  const mockOnChangeStatus = jest.fn()
  const mockOnBlur = jest.fn()
  const defaultProps = {
    onChangeStatus: mockOnChangeStatus,
    status: OBJECTIVE_STATUS.NOT_STARTED,
    onBlur: mockOnBlur,
    closeSuspendReason: '',
    closeSuspendContext: '',
    inputName: 'objectiveStatus',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with all status options when status is "Not Started"', () => {
    render(
      <ObjectiveStatus
        onChangeStatus={defaultProps.onChangeStatus}
        status={defaultProps.status}
        onBlur={defaultProps.onBlur}
        closeSuspendReason={defaultProps.closeSuspendReason}
        closeSuspendContext={defaultProps.closeSuspendContext}
        inputName={defaultProps.inputName}
      />
    )

    // Check that the dropdown is rendered
    const dropdown = screen.getByRole('combobox', { name: /Status for objective/i })
    expect(dropdown).toBeInTheDocument()

    // Check all options are available
    expect(screen.getByRole('option', { name: OBJECTIVE_STATUS.NOT_STARTED })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: OBJECTIVE_STATUS.IN_PROGRESS })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: OBJECTIVE_STATUS.SUSPENDED })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: OBJECTIVE_STATUS.COMPLETE })).toBeInTheDocument()

    // Verify label is present
    expect(screen.getByText('Objective status')).toBeInTheDocument()
  })

  it('renders correctly with a selected option', () => {
    render(
      <ObjectiveStatus
        onChangeStatus={defaultProps.onChangeStatus}
        onBlur={defaultProps.onBlur}
        closeSuspendReason={defaultProps.closeSuspendReason}
        closeSuspendContext={defaultProps.closeSuspendContext}
        inputName={defaultProps.inputName}
        status={OBJECTIVE_STATUS.IN_PROGRESS}
      />
    )

    const dropdown = screen.getByRole('combobox', { name: /Status for objective/i })
    expect(dropdown).toHaveValue(OBJECTIVE_STATUS.IN_PROGRESS)
  })

  it('filters out "Not Started" option when status is "In Progress"', () => {
    render(
      <ObjectiveStatus
        onChangeStatus={defaultProps.onChangeStatus}
        onBlur={defaultProps.onBlur}
        closeSuspendReason={defaultProps.closeSuspendReason}
        closeSuspendContext={defaultProps.closeSuspendContext}
        inputName={defaultProps.inputName}
        status={OBJECTIVE_STATUS.IN_PROGRESS}
        currentStatus={OBJECTIVE_STATUS.IN_PROGRESS}
      />
    )

    // Not Started should be filtered out
    expect(screen.queryByRole('option', { name: OBJECTIVE_STATUS.NOT_STARTED })).not.toBeInTheDocument()

    // Other options should still be available
    expect(screen.getByRole('option', { name: OBJECTIVE_STATUS.IN_PROGRESS })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: OBJECTIVE_STATUS.SUSPENDED })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: OBJECTIVE_STATUS.COMPLETE })).toBeInTheDocument()
  })
})
