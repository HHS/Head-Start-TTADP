import '@testing-library/jest-dom'
import React from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import ObjectiveStatus from '../ObjectiveStatus'
import { OBJECTIVE_STATUS } from '../../../Constants'

describe('ObjectiveStatus', () => {
  it('shows the dropdown', async () => {
    const onChangeStatus = jest.fn()

    render(
      <ObjectiveStatus
        status={OBJECTIVE_STATUS.IN_PROGRESS}
        goalStatus={GOAL_STATUS.IN_PROGRESS}
        onChangeStatus={onChangeStatus}
        inputName="objective-status"
        isOnReport={false}
        userCanEdit
      />
    )

    const dropdown = await screen.findByLabelText('Objective status')
    expect(dropdown).toBeVisible()

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(4)
    const optionText = options.map((option) => option.textContent)
    expect(optionText).toEqual([OBJECTIVE_STATUS.NOT_STARTED, OBJECTIVE_STATUS.IN_PROGRESS, OBJECTIVE_STATUS.SUSPENDED, OBJECTIVE_STATUS.COMPLETE])

    userEvent.selectOptions(dropdown, OBJECTIVE_STATUS.COMPLETE)
    expect(onChangeStatus).toHaveBeenCalledWith(OBJECTIVE_STATUS.COMPLETE)
  })

  it('shows the correct options for completed', async () => {
    const onChangeStatus = jest.fn()

    render(
      <ObjectiveStatus
        status={OBJECTIVE_STATUS.COMPLETE}
        goalStatus={GOAL_STATUS.IN_PROGRESS}
        onChangeStatus={onChangeStatus}
        inputName="objective-status"
        isOnReport={false}
        userCanEdit
      />
    )

    const dropdown = await screen.findByLabelText('Objective status')
    expect(dropdown).toBeVisible()

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    const optionText = options.map((option) => option.textContent)
    expect(optionText).toEqual([OBJECTIVE_STATUS.IN_PROGRESS, OBJECTIVE_STATUS.SUSPENDED, OBJECTIVE_STATUS.COMPLETE])
  })

  it('shows the read only view when the goal is closed', async () => {
    const onChangeStatus = jest.fn()

    render(
      <ObjectiveStatus
        status={OBJECTIVE_STATUS.COMPLETE}
        goalStatus={GOAL_STATUS.CLOSED}
        onChangeStatus={onChangeStatus}
        inputName="objective-status"
        isOnReport={false}
        userCanEdit
      />
    )

    const label = await screen.findByText('Objective status')

    expect(label).toBeVisible()
    expect(label.tagName).toEqual('P')

    expect(document.querySelector('select')).toBe(null)
  })

  it('shows the read only view when the user cannot edit', async () => {
    render(
      <ObjectiveStatus
        status={OBJECTIVE_STATUS.IN_PROGRESS}
        goalStatus={GOAL_STATUS.IN_PROGRESS}
        onChangeStatus={jest.fn()}
        inputName="objective-status"
        isOnReport={false}
        userCanEdit={false}
      />
    )

    const label = await screen.findByText('Objective status')

    expect(label).toBeVisible()
    expect(label.tagName).toEqual('P')

    expect(document.querySelector('select')).toBe(null)
  })
})
