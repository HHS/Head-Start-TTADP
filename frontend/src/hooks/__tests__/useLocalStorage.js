import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import useLocalStorage, { setConnectionActiveWithError } from '../useLocalStorage'
import { mockWindowProperty } from '../../testHelpers'
import { HTTPError } from '../../fetchers'

describe('setConnectionActiveWithError', () => {
  it('returns if the error is 404', async () => {
    const e = new HTTPError(404, 'not found')
    const setConnectionActive = jest.fn()

    const connection = setConnectionActiveWithError(e, setConnectionActive)

    expect(connection).toBe(true)
  })

  it('returns if the error is 403', async () => {
    const e = new HTTPError(403, 'unauthorized')
    const setConnectionActive = jest.fn()

    const connection = setConnectionActiveWithError(e, setConnectionActive)

    expect(connection).toBe(true)
  })

  describe('return false otherwise', () => {
    it('if HTTPError 500', async () => {
      const e = new HTTPError(500, 'server error')
      const setConnectionActive = jest.fn()

      const connection = setConnectionActiveWithError(e, setConnectionActive)

      expect(connection).toBe(false)
    })

    it('if other error', async () => {
      const e = new Error('test')
      const setConnectionActive = jest.fn()

      const connection = setConnectionActiveWithError(e, setConnectionActive)

      expect(connection).toBe(false)
    })
  })
})

const StorageTest = () => {
  const [storage, setStorage] = useLocalStorage('test', 'this')

  return (
    <>
      <h1>{storage}</h1>
      <input type="text" onChange={(e) => setStorage(e.target.value)} />
    </>
  )
}

const renderStorageTest = () => render(<StorageTest />)

describe('useLocalStorage', () => {
  const setItem = jest.fn()
  const getItem = jest.fn()

  mockWindowProperty('localStorage', {
    setItem,
    getItem,
    removeItem: jest.fn(),
  })

  it('saves state to local storage', async () => {
    renderStorageTest()

    const textBox = await screen.findByRole('textbox')

    userEvent.type(textBox, 'hello')

    expect(setItem).toHaveBeenCalled()
  })
})
