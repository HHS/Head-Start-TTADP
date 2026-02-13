import '@testing-library/jest-dom'
import React from 'react'
import { GOAL_SOURCES } from '@ttahub/common'
import userEvent from '@testing-library/user-event'
import { render, screen, act } from '@testing-library/react'
import GoalSource from '../GoalSource'
import FormFieldThatIsSometimesReadOnly from '../FormFieldThatIsSometimesReadOnly'

const defaults = {
  sources: [],
  validateGoalSource: jest.fn(),
  onChangeGoalSource: jest.fn(),
  goalStatus: 'Draft',
  isMultiRecipientGoal: false,
  userCanEdit: true,
  disabled: false,
  permissions: [true],
}

describe('GoalSource', () => {
  const renderGoalSource = (props = defaults) => {
    const { source, validateGoalSource, onChangeGoalSource, goalStatus, isMultiRecipientGoal, userCanEdit, createdViaTr, permissions } = props
    render(
      <FormFieldThatIsSometimesReadOnly label="Goal source" value={source} permissions={permissions}>
        <GoalSource
          error={<></>}
          source={source}
          validateGoalSource={validateGoalSource}
          onChangeGoalSource={onChangeGoalSource}
          goalStatus={goalStatus}
          isLoading={false}
          isMultiRecipientGoal={isMultiRecipientGoal}
          userCanEdit={userCanEdit}
          createdViaTr={createdViaTr}
        />
      </FormFieldThatIsSometimesReadOnly>
    )
  }

  it('shows nothing if on a multi-recipient goal', async () => {
    act(() => {
      renderGoalSource({
        ...defaults,
        isMultiRecipientGoal: true,
      })
    })

    expect(screen.queryByText('Goal source')).toBeNull()
    expect(document.querySelector('usa-select')).toBeNull()
  })

  it('shows the read only view when user cannot edit', async () => {
    act(() => {
      renderGoalSource({
        ...defaults,
        source: GOAL_SOURCES[0],
        userCanEdit: false,
      })
    })

    expect(screen.getByText('Goal source')).toBeInTheDocument()
    expect(screen.getByText(GOAL_SOURCES[0])).toBeInTheDocument()
    expect(document.querySelector('usa-select')).toBeNull()
  })

  it('shows the select and the value', async () => {
    const onChange = jest.fn()

    act(() => {
      renderGoalSource({
        ...defaults,
        onChangeGoalSource: onChange,
        source: GOAL_SOURCES[0],
      })
    })

    expect(screen.getByText('Goal source')).toBeInTheDocument()

    const dropdown = screen.getByLabelText(/Goal source/i)
    userEvent.selectOptions(dropdown, GOAL_SOURCES[0])
    expect(onChange).toBeCalledWith(GOAL_SOURCES[0])
  })
})
