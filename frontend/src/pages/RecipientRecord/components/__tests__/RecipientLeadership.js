import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import RecipientLeadership from '../RecipientLeadership'

describe('RecipientLeadership', () => {
  const recipientUrl = '/api/recipient/1/region/12/leadership'
  const renderRecipientLeadership = () => {
    render(
      <div data-testid="recipient-leadership-container">
        <RecipientLeadership recipientId={1} regionId={12} />
      </div>
    )
  }

  beforeEach(() => fetchMock.restore())

  it('renders the recipient summary appropriately', async () => {
    fetchMock.get(recipientUrl, [
      {
        id: 1,
        fullName: 'Frog Person',
        fullRole: 'Frog Stuff',
        email: 'frog@pond.net',
        effectiveDate: new Date(),
        nameAndRole: 'Frog Person - Frog Stuff',
      },
      {
        id: 2,
        fullName: 'Frog Person',
        fullRole: 'Frog Stuff',
        email: 'frog@pond.net',
        effectiveDate: new Date(),
        nameAndRole: 'Frog Person - Frog Stuff',
      },
    ])
    renderRecipientLeadership()
    expect(fetchMock.called(recipientUrl, { method: 'get' })).toBe(true)

    expect(await screen.findByText(/frog stuff/i)).toBeInTheDocument()
  })

  it('will sort goals', async () => {
    fetchMock.get(recipientUrl, [
      {
        id: 1,
        fullName: 'Frog Person',
        fullRole: 'Frog Stuff',
        email: 'frog@pond.net',
        effectiveDate: new Date(),
        nameAndRole: 'Frog Person - Frog Stuff',
      },
      {
        id: 2,
        fullName: 'Frog Person',
        fullRole: 'Frog Commander',
        email: 'frog@pond.net',
        effectiveDate: new Date(),
        nameAndRole: 'Frog Person - Frog Commander',
      },
    ])
    renderRecipientLeadership()
    expect(fetchMock.called(recipientUrl, { method: 'get' })).toBe(true)

    expect(await screen.findByText(/frog stuff/i)).toBeInTheDocument()
    expect(await screen.findByText(/frog commander/i)).toBeInTheDocument()
  })

  it('handles null effective dates', async () => {
    fetchMock.get(recipientUrl, [
      {
        id: 1,
        fullName: 'Frog Person',
        fullRole: 'Frog Stuff',
        email: 'frog@pond.net',
        effectiveDate: null,
        nameAndRole: 'Frog Person - Frog Stuff',
      },
    ])
    renderRecipientLeadership()
    expect(fetchMock.called(recipientUrl, { method: 'get' })).toBe(true)

    expect(await screen.findByText(/frog stuff/i)).toBeInTheDocument()
    expect(await screen.findByText('unavailable')).toBeInTheDocument()
  })

  it('handles undefined effective dates', async () => {
    fetchMock.get(recipientUrl, [
      {
        id: 1,
        fullName: 'Frog Person',
        fullRole: 'Frog Stuff',
        email: 'frog@pond.net',
        nameAndRole: 'Frog Person - Frog Stuff',
      },
    ])
    renderRecipientLeadership()
    expect(fetchMock.called(recipientUrl, { method: 'get' })).toBe(true)

    expect(await screen.findByText(/frog stuff/i)).toBeInTheDocument()
    expect(await screen.findByText('unavailable')).toBeInTheDocument()
  })

  it('handles errors', async () => {
    fetchMock.get(recipientUrl, 500)
    renderRecipientLeadership()
    expect(fetchMock.called(recipientUrl, { method: 'get' })).toBe(true)
    expect(await screen.findByRole('heading', { name: 'Recipient leadership' })).toBeInTheDocument()
  })
})
