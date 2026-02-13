import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { SCOPE_IDS, GOAL_STATUS } from '@ttahub/common'
import userEvent from '@testing-library/user-event'
import ObjectiveStatusDropdown from '../ObjectiveStatusDropdown'
import UserContext from '../../../../UserContext'
import { OBJECTIVE_STATUS } from '../../../../Constants'

const user = {
  permissions: [
    {
      regionId: 1,
      scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
    },
    {
      regionId: 5,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    },
  ],
}

describe('ObjectiveStatusDropdown', () => {
  const renderStatusDropdown = (currentStatus, onUpdate = jest.fn(), forceReadOnly = false, onApprovedAR = false) => {
    render(
      <UserContext.Provider value={{ user }}>
        <ObjectiveStatusDropdown
          currentStatus={currentStatus}
          onUpdateObjectiveStatus={onUpdate}
          forceReadOnly={forceReadOnly}
          regionId={1}
          objectiveTitle={345345}
          goalStatus={GOAL_STATUS.IN_PROGRESS}
          className="test-class"
          onApprovedAR={onApprovedAR}
        />
      </UserContext.Provider>
    )
  }

  it('displays the correct number of options for not started', async () => {
    const onUpdate = jest.fn()
    renderStatusDropdown(OBJECTIVE_STATUS.NOT_STARTED, onUpdate)

    let options = await screen.findAllByRole('button')
    expect(options.length).toBe(1)

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i })
    userEvent.click(select)

    options = await screen.findAllByRole('button')
    expect(options.length).toBe(5)
    const labels = options.map((option) => option.textContent)
    expect(labels).toContain(OBJECTIVE_STATUS.NOT_STARTED)
    expect(labels).toContain(OBJECTIVE_STATUS.IN_PROGRESS)
    expect(labels).toContain(OBJECTIVE_STATUS.SUSPENDED)
    expect(labels).toContain(OBJECTIVE_STATUS.COMPLETE)
  })

  it('displays the correct number of options for in progress', async () => {
    const onUpdate = jest.fn()
    renderStatusDropdown(OBJECTIVE_STATUS.IN_PROGRESS, onUpdate)

    let options = await screen.findAllByRole('button')
    expect(options.length).toBe(1)

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i })
    userEvent.click(select)

    options = await screen.findAllByRole('button')
    expect(options.length).toBe(5)
    const labels = options.map((option) => option.textContent)
    expect(labels).toContain(OBJECTIVE_STATUS.NOT_STARTED)
    expect(labels).toContain(OBJECTIVE_STATUS.IN_PROGRESS)
    expect(labels).toContain(OBJECTIVE_STATUS.SUSPENDED)
    expect(labels).toContain(OBJECTIVE_STATUS.COMPLETE)
  })

  it('displays the correct number of options for suspended', async () => {
    const onUpdate = jest.fn()
    renderStatusDropdown(OBJECTIVE_STATUS.SUSPENDED, onUpdate)

    let options = await screen.findAllByRole('button')
    expect(options.length).toBe(1)

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i })
    userEvent.click(select)

    options = await screen.findAllByRole('button')
    expect(options.length).toBe(5)
    const labels = options.map((option) => option.textContent)
    expect(labels).toContain(OBJECTIVE_STATUS.NOT_STARTED)
    expect(labels).toContain(OBJECTIVE_STATUS.IN_PROGRESS)
    expect(labels).toContain(OBJECTIVE_STATUS.SUSPENDED)
    expect(labels).toContain(OBJECTIVE_STATUS.COMPLETE)
  })

  it('displays the correct number of options for complete', async () => {
    const onUpdate = jest.fn()
    renderStatusDropdown(OBJECTIVE_STATUS.COMPLETE, onUpdate)

    let options = await screen.findAllByRole('button')
    expect(options.length).toBe(1)

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i })
    userEvent.click(select)

    options = await screen.findAllByRole('button')
    expect(options.length).toBe(4)
    const labels = options.map((option) => option.textContent)
    expect(labels).not.toContain(OBJECTIVE_STATUS.NOT_STARTED)
    expect(labels).toContain(OBJECTIVE_STATUS.IN_PROGRESS)
    expect(labels).toContain(OBJECTIVE_STATUS.SUSPENDED)
    expect(labels).toContain(OBJECTIVE_STATUS.COMPLETE)
  })

  it('handles no status', async () => {
    renderStatusDropdown()

    let options = await screen.findAllByRole('button')
    expect(options.length).toBe(1)

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i })
    userEvent.click(select)

    options = await screen.findAllByRole('button')
    expect(options.length).toBe(5)
    const labels = options.map((option) => option.textContent)
    expect(labels).toContain(OBJECTIVE_STATUS.NOT_STARTED)
    expect(labels).toContain(OBJECTIVE_STATUS.IN_PROGRESS)
    expect(labels).toContain(OBJECTIVE_STATUS.SUSPENDED)
    expect(labels).toContain(OBJECTIVE_STATUS.COMPLETE)
  })

  it('handles weirdo statuses', async () => {
    renderStatusDropdown('Weirdo Status')

    let options = await screen.findAllByRole('button')
    expect(options.length).toBe(1)

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i })
    userEvent.click(select)

    options = await screen.findAllByRole('button')
    expect(options.length).toBe(5)
    const labels = options.map((option) => option.textContent)
    expect(labels).toContain(OBJECTIVE_STATUS.NOT_STARTED)
    expect(labels).toContain(OBJECTIVE_STATUS.IN_PROGRESS)
    expect(labels).toContain(OBJECTIVE_STATUS.SUSPENDED)
    expect(labels).toContain(OBJECTIVE_STATUS.COMPLETE)
  })

  it('handles force read only', async () => {
    renderStatusDropdown(OBJECTIVE_STATUS.COMPLETE, jest.fn(), true)

    const buttons = document.querySelector('button')
    expect(buttons).toBe(null)
  })

  it('calls update', async () => {
    const onUpdate = jest.fn()
    renderStatusDropdown(OBJECTIVE_STATUS.IN_PROGRESS, onUpdate)

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i })
    userEvent.click(select)

    const option = await screen.findByRole('button', { name: OBJECTIVE_STATUS.SUSPENDED })
    userEvent.click(option)

    expect(onUpdate).toHaveBeenCalledWith(OBJECTIVE_STATUS.SUSPENDED)
  })

  it('hides the not started option when onApprovedAR is true', async () => {
    const onUpdate = jest.fn()
    renderStatusDropdown(OBJECTIVE_STATUS.IN_PROGRESS, onUpdate, false, true)

    let options = await screen.findAllByRole('button')
    expect(options.length).toBe(1)

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i })
    userEvent.click(select)

    options = await screen.findAllByRole('button')
    expect(options.length).toBe(4)
    const labels = options.map((option) => option.textContent)
    expect(labels).not.toContain(OBJECTIVE_STATUS.NOT_STARTED)
    expect(labels).toContain(OBJECTIVE_STATUS.IN_PROGRESS)
    expect(labels).toContain(OBJECTIVE_STATUS.SUSPENDED)
    expect(labels).toContain(OBJECTIVE_STATUS.COMPLETE)
  })

  it('shows the not started option when onApprovedAR is false', async () => {
    const onUpdate = jest.fn()
    renderStatusDropdown(OBJECTIVE_STATUS.IN_PROGRESS, onUpdate, false, false)

    let options = await screen.findAllByRole('button')
    expect(options.length).toBe(1)

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i })
    userEvent.click(select)

    options = await screen.findAllByRole('button')
    expect(options.length).toBe(5)
    const labels = options.map((option) => option.textContent)
    expect(labels).toContain(OBJECTIVE_STATUS.NOT_STARTED)
    expect(labels).toContain(OBJECTIVE_STATUS.IN_PROGRESS)
    expect(labels).toContain(OBJECTIVE_STATUS.SUSPENDED)
    expect(labels).toContain(OBJECTIVE_STATUS.COMPLETE)
  })

  it('shows the not started option when onApprovedAR is true and currentStatus is "Not Started"', async () => {
    const onUpdate = jest.fn()
    renderStatusDropdown(OBJECTIVE_STATUS.NOT_STARTED, onUpdate, false, true)

    let options = await screen.findAllByRole('button')
    expect(options.length).toBe(1)

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i })
    userEvent.click(select)

    options = await screen.findAllByRole('button')
    expect(options.length).toBe(5)
    const labels = options.map((option) => option.textContent)
    expect(labels).toContain(OBJECTIVE_STATUS.NOT_STARTED)
    expect(labels).toContain(OBJECTIVE_STATUS.IN_PROGRESS)
    expect(labels).toContain(OBJECTIVE_STATUS.SUSPENDED)
    expect(labels).toContain(OBJECTIVE_STATUS.COMPLETE)
  })
})
