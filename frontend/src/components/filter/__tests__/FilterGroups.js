import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import selectEvent from 'react-select-event'
import fetchMock from 'fetch-mock'
import FilterGroups from '../FilterGroups'
import MyGroupsProvider from '../../MyGroupsProvider'

describe('FilterGroups', () => {
  const renderFilterGroups = (onApply) => {
    fetchMock.get('/api/groups', [
      {
        id: 1,
        name: 'group1',
        grants: [
          {
            id: 1,
            name: 'grant1',
          },
        ],
        isPublic: false,
      },
    ])

    render(
      <MyGroupsProvider authenticated>
        <FilterGroups onApply={onApply} inputId="screams" query={[]} />
      </MyGroupsProvider>
    )
  }

  it('calls the onapply handler', async () => {
    const onApply = jest.fn()
    act(() => {
      renderFilterGroups(onApply)
    })

    const select = await screen.findByText(/Select group to filter by/i)
    await selectEvent.select(select, ['group1'])
    expect(onApply).toHaveBeenCalledWith([1])
  })
})
