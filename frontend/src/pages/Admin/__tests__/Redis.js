import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fetchMock from 'fetch-mock'
import join from 'url-join'
import Redis from '../Redis'

const infoUrl = join('/', 'api', 'admin', 'redis', 'info')
const flushUrl = join('/', 'api', 'admin', 'redis', 'flush')

describe('Redis', () => {
  const oldWindowConfirm = window.confirm
  global.window.confirm = () => true
  const renderRedis = () => {
    render(<Redis />)
  }

  afterEach(() => fetchMock.restore())

  afterAll(() => {
    global.window.confirm = oldWindowConfirm
  })

  it('renders redis page and fetches info', async () => {
    fetchMock.get(infoUrl, { info: 'info' })
    act(() => {
      renderRedis()
    })

    expect(await screen.findByText('info')).toBeInTheDocument()
    expect(fetchMock.called(infoUrl)).toBe(true)
  })

  it('handles errors to fetch info', async () => {
    fetchMock.get(infoUrl, 500)
    act(() => {
      renderRedis()
    })

    expect(fetchMock.called(infoUrl)).toBe(true)
  })

  it('flushes the cache', async () => {
    fetchMock.get(infoUrl, { info: 'info' })
    fetchMock.post(flushUrl, { info: 'info' })
    act(() => {
      renderRedis()
    })

    const button = await screen.findByRole('button', { name: 'Flush redis cache' })
    userEvent.click(button)

    expect(fetchMock.called(infoUrl)).toBe(true)
    expect(fetchMock.called(flushUrl)).toBe(true)
    expect(await screen.findByText(/info/i)).toBeInTheDocument()
  })

  it('handles an error to flush the cache', async () => {
    fetchMock.get(infoUrl, { info: 'info' })
    fetchMock.post(flushUrl, 500)
    act(() => {
      renderRedis()
    })

    const button = await screen.findByRole('button', { name: 'Flush redis cache' })
    userEvent.click(button)

    expect(fetchMock.called(infoUrl)).toBe(true)
    expect(fetchMock.called(flushUrl)).toBe(true)
    expect(await screen.findByText(/info/i)).toBeInTheDocument()
  })

  it('handles users rejecting the confirm dialog', async () => {
    fetchMock.get(infoUrl, { info: 'info' })
    fetchMock.post(flushUrl, { info: 'info' })
    global.window.confirm = () => false
    act(() => {
      renderRedis()
    })

    const button = await screen.findByRole('button', { name: 'Flush redis cache' })
    userEvent.click(button)

    expect(fetchMock.called(infoUrl)).toBe(true)
    expect(fetchMock.called(flushUrl)).toBe(false)
    expect(await screen.findByText(/info/i)).toBeInTheDocument()
  })
})
