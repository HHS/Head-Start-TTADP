/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

import SomeGoalsHaveNoPromptResponse from '../SomeGoalsHaveNoPromptResponse'

describe('SomeGoalsHaveNoPromptResponse', () => {
  // eslint-disable-next-line react/prop-types
  const RenderSomeGoalsHaveNoPromptResponse = (props) => (
    <MemoryRouter>
      <SomeGoalsHaveNoPromptResponse
        promptsMissingResponses={['prompt1', 'prompt2']}
        goalsMissingResponses={[{ goalIds: [1, 2] }, { goalIds: [3] }]}
        regionId={1}
        onSaveDraft={jest.fn()}
        {...props}
      />
    </MemoryRouter>
  )

  const url = '/api/goals/region/1/incomplete?goalIds=1&goalIds=2&goalIds=3'

  afterEach(() => {
    fetchMock.restore()
    jest.clearAllMocks()
  })

  it('displays the message and fetches the data', async () => {
    fetchMock.get(url, [
      {
        id: 1,
        recipientId: 1,
        regionId: 1,
        recipientName: 'recipient1',
        grantNumber: 'grant1',
      },
      {
        id: 2,
        recipientId: 1,
        regionId: 1,
        recipientName: 'recipient1',
        grantNumber: 'grant1',
      },
      {
        id: 3,
        recipientId: 1,
        regionId: 1,
        recipientName: 'recipient1',
        grantNumber: 'grant1',
      },
    ])
    const onSaveDraft = jest.fn()
    render(<RenderSomeGoalsHaveNoPromptResponse onSaveDraft={onSaveDraft} />)
    const item = await screen.findByText('Some goals are incomplete')
    expect(item).toBeVisible()
    expect(fetchMock.called(url)).toBeTruthy()
    const summary = screen.getByText('Incomplete goals')
    expect(summary).toBeVisible()
    const link = await screen.findByText('recipient1 grant1 1')
    expect(link).toBeVisible()
    const link2 = await screen.findByText('recipient1 grant1 2')
    expect(link2).toBeVisible()
    const link3 = await screen.findByText('recipient1 grant1 3')
    expect(link3).toBeVisible()

    const summaryElement = document.querySelector('summary')
    expect(summaryElement).toBeTruthy()

    const detailsElement = document.querySelector('details')
    expect(detailsElement).toBeTruthy()

    const reset = await screen.findByText('Refresh list of goals')
    act(() => {
      userEvent.click(reset)
    })

    expect(onSaveDraft).toHaveBeenCalledTimes(1)
  })

  it('handles error to fetch', async () => {
    fetchMock.get(url, 500)
    act(() => {
      render(<RenderSomeGoalsHaveNoPromptResponse />)
    })
    expect(fetchMock.called(url)).toBeTruthy()
    const item = await screen.findByText('Some goals are incomplete')
    expect(item).toBeVisible()
    const summary = screen.queryAllByText('Incomplete goals')
    expect(summary.length).toBe(0)
  })

  it('handles empty result', async () => {
    fetchMock.get(url, [])
    act(() => {
      render(<RenderSomeGoalsHaveNoPromptResponse />)
    })
    expect(fetchMock.called(url)).toBeTruthy()
    const item = await screen.findByText('Some goals are incomplete')
    expect(item).toBeVisible()
    const summary = screen.queryAllByText('Incomplete goals')
    expect(summary.length).toBe(0)
  })

  it('does not fetch with no region', async () => {
    render(<RenderSomeGoalsHaveNoPromptResponse regionId={null} />)
    const item = screen.queryByText('Some goals are incomplete')
    expect(item).toBe(null)
    const summary = screen.queryAllByText('Complete your goals')
    expect(summary.length).toBe(0)
    expect(fetchMock.called()).toBeFalsy()
  })

  it('does not fetch with no ids', async () => {
    render(<RenderSomeGoalsHaveNoPromptResponse goalsMissingResponses={[]} />)
    const item = screen.queryByText('Some goals are incomplete')
    expect(item).toBe(null)
    const summary = screen.queryAllByText('Complete your goals')
    expect(summary.length).toBe(0)
    expect(fetchMock.called()).toBeFalsy()
  })
})
