import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SCOPE_IDS } from '@ttahub/common'
import RecipientTabs from '../RecipientTabs'
import UserContext from '../../../../UserContext'

const DEFAULT_USER = {
  name: 'test@test.com',
  homeRegionId: 1,
  permissions: [
    {
      scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
      regionId: 1,
    },
  ],
  flags: [],
}

describe('RecipientTabs', () => {
  const renderRecipientTabs = (backLink = null, user = DEFAULT_USER) => {
    render(
      <MemoryRouter>
        <UserContext.Provider value={{ user }}>
          <RecipientTabs region="1" recipientId="1" backLink={backLink} />
        </UserContext.Provider>
      </MemoryRouter>
    )
  }

  it('does not show the icon if there is no back link', () => {
    renderRecipientTabs()
    expect(screen.queryByTestId('back-link-icon')).not.toBeInTheDocument()
  })

  it('does not show the icon if the backlink is a fragment', () => {
    renderRecipientTabs(<></>)
    expect(screen.queryByTestId('back-link-icon')).not.toBeInTheDocument()
  })

  it('shows the icon if the backlink is a <Link>', () => {
    renderRecipientTabs(<a href="/">Back</a>)
    expect(screen.queryByTestId('back-link-icon')).toBeInTheDocument()
  })
})
