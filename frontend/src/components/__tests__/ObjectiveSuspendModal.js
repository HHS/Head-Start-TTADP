/* eslint-disable react/prop-types */
import '@testing-library/jest-dom'
import React, { useRef } from 'react'
import { render, screen, act } from '@testing-library/react'
import { GOAL_SUSPEND_REASONS } from '@ttahub/common'
import { ModalToggleButton } from '@trussworks/react-uswds'
import userEvent from '@testing-library/user-event'
import ObjectiveSuspendModal from '../ObjectiveSuspendModal'
import { OBJECTIVE_STATUS } from '../../Constants'

describe('ObjectiveSuspendModal', () => {
  const ModalComponent = ({
    goalIds = [1],
    newStatus = OBJECTIVE_STATUS.CLOSED,
    onSubmit = jest.fn(),
    resetValues = false,
    setError = jest.fn(),
  }) => {
    const modalRef = useRef()

    return (
      <div>
        <div>Test Close Suspend Modal</div>
        <ModalToggleButton modalRef={modalRef} opener>
          Open
        </ModalToggleButton>
        <ModalToggleButton modalRef={modalRef} closer>
          Close
        </ModalToggleButton>
        <ObjectiveSuspendModal
          goalIds={goalIds}
          newStatus={newStatus}
          modalRef={modalRef}
          onSubmit={onSubmit}
          resetValues={resetValues}
          oldGoalStatus=""
          error={<></>}
          objectiveId={1}
          objectiveSuspendContext=""
          objectiveSuspendReason=""
          setError={setError}
          objectiveSuspendContextInputName="suspend-objective-1-context"
          objectiveSuspendInputName="suspend-objective-1-reason"
          onChangeSuspendContext={jest.fn()}
          onChangeSuspendReason={jest.fn()}
          onChangeStatus={jest.fn()}
        />
      </div>
    )
  }

  it('correctly shows suspend radio options', async () => {
    render(<ModalComponent newStatus={OBJECTIVE_STATUS.SUSPENDED} />)

    // Open modal.
    const button = await screen.findByText('Open')
    userEvent.click(button)

    // Verify title.
    expect(await screen.findByText('Why are you suspending this objective?')).toBeVisible()

    // Verify correct close radio options.
    expect(await screen.findByText(GOAL_SUSPEND_REASONS[0])).toBeVisible()
    expect(await screen.findByText(GOAL_SUSPEND_REASONS[1])).toBeVisible()
    expect(await screen.findByText(GOAL_SUSPEND_REASONS[2])).toBeVisible()
    expect(await screen.findByText(GOAL_SUSPEND_REASONS[3])).toBeVisible()

    // Verify Context.
    expect(await screen.findByText('Additional context')).toBeVisible()
    expect(await screen.findByRole('textbox', { hidden: true })).toBeVisible()
  })

  it('shows validation message', async () => {
    const setError = jest.fn()
    render(<ModalComponent newStatus={OBJECTIVE_STATUS.SUSPENDED} setError={setError} />)

    // Open modal.
    const button = await screen.findByText('Open')
    userEvent.click(button)

    // Verify title.
    expect(await screen.findByText('Why are you suspending this objective?')).toBeVisible()

    // Click submit button.
    const submitButton = await screen.findByText('Submit')

    act(() => {
      userEvent.click(submitButton)
    })

    // verify set error was called
    expect(setError).toHaveBeenCalled()
  })
})
