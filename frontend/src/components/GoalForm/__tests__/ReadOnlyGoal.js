import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReadOnlyGoal, { parseObjectValuesOrString } from '../ReadOnlyGoal'

describe('ReadOnlyGoal', () => {
  describe('parseObjectValuesOrString', () => {
    it('is invincible', () => {
      const obj = {
        a: 'a',
        b: 'b',
      }
      expect(parseObjectValuesOrString(obj)).toBe('a, b')
      expect(parseObjectValuesOrString('a')).toBe('a')
      expect(parseObjectValuesOrString(1)).toBe('')
      expect(parseObjectValuesOrString(null)).toBe('')
      expect(parseObjectValuesOrString(undefined)).toBe('')
      expect(parseObjectValuesOrString()).toBe('')

      expect(parseObjectValuesOrString({})).toBe('')
      expect(parseObjectValuesOrString(['a', 'b'])).toBe('a, b')
      expect(parseObjectValuesOrString([])).toBe('')
      expect(parseObjectValuesOrString(() => {})).toBe('')
    })
  })

  const createdGoal = {
    name: 'Sample goal',
    grant: {},
    objectives: [],
    endDate: null,
    id: 1,
    prompts: [
      {
        title: 'All about this goal',
        ordinal: 1,
        response: ['vivid', 'ambitious', 'specific'],
      },
    ],
  }

  const renderReadOnlyGoal = (hideEdit = false, onRemove = jest.fn(), goal = createdGoal) => {
    render(<ReadOnlyGoal onEdit={jest.fn()} onRemove={onRemove} hideEdit={hideEdit} goal={goal} index={0} />)
  }

  it('can render with a goal', async () => {
    renderReadOnlyGoal()
    expect(await screen.findByRole('heading', { name: /goal summary/i })).toBeVisible()
    expect(await screen.findByText('Sample goal')).toBeVisible()

    const contextButton = await screen.findByRole('button')
    userEvent.click(contextButton)
    const menu = await screen.findByTestId('menu')
    expect(menu.querySelectorAll('li').length).toBe(2)
  })

  it('shows the correct menu items when hide edit is passed', async () => {
    renderReadOnlyGoal(true)
    const contextButton = await screen.findByRole('button')
    userEvent.click(contextButton)
    const menu = await screen.findByTestId('menu')
    expect(menu.querySelectorAll('li').length).toBe(1)
  })

  it('calls on remove', async () => {
    const onRemove = jest.fn()
    renderReadOnlyGoal(false, onRemove)

    const contextButton = await screen.findByRole('button')
    userEvent.click(contextButton)
    const menu = await screen.findByTestId('menu')
    const removeButton = within(menu).getByText('Remove')
    userEvent.click(removeButton)

    expect(onRemove).toHaveBeenCalledWith({
      endDate: null,
      grant: {},
      id: 1,
      name: 'Sample goal',
      objectives: [],
      prompts: [
        {
          title: 'All about this goal',
          ordinal: 1,
          response: ['vivid', 'ambitious', 'specific'],
        },
      ],
    })
  })

  it('correctly shows the root cause for each grant on the goal', async () => {
    renderReadOnlyGoal(false, jest.fn(), {
      ...createdGoal,
      prompts: [
        {
          title: 'Root cause',
          grantDisplayName: 'Grant 1',
          ordinal: 1,
          response: ['response1'],
        },
        {
          title: 'Root cause',
          grantDisplayName: 'Grant 2',
          ordinal: 2,
          response: ['response2', 'response3'],
        },
      ],
    })
    expect(await screen.findByText('Root cause')).toBeVisible()
    expect(await screen.findByText('Grant 1')).toBeVisible()
    expect(await screen.findByText('response1')).toBeVisible()
    expect(await screen.findByText('Grant 2')).toBeVisible()
    expect(await screen.findByText(/response2, response3/i)).toBeVisible()
  })

  it('correctly tests the on remove function', async () => {
    const onRemove = jest.fn()
    renderReadOnlyGoal(false, onRemove)

    const contextButton = await screen.findByRole('button')
    userEvent.click(contextButton)
    const menu = await screen.findByTestId('menu')
    const removeButton = within(menu).getByText('Remove')
    userEvent.click(removeButton)

    expect(onRemove).toHaveBeenCalledWith({
      endDate: null,
      grant: {},
      id: 1,
      name: 'Sample goal',
      objectives: [],
      prompts: [
        {
          title: 'All about this goal',
          ordinal: 1,
          response: ['vivid', 'ambitious', 'specific'],
        },
      ],
    })
  })
})
