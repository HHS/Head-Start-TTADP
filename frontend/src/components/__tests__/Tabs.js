import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import { SCOPE_IDS } from '@ttahub/common'
import Tabs from '../Tabs'
import UserContext from '../../UserContext'

const history = createMemoryHistory()

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

const testTabs = [
  { key: 'Test Tab 1', value: 'test-tab-1' },
  { key: 'Test Tab 2', value: 'test-tab-2' },
  { key: 'Test Tab 3', value: 'test-tab-3' },
]

describe('Tabs', () => {
  const renderTabs = (backLink = null, user = DEFAULT_USER) => {
    render(
      <Router history={history}>
        <UserContext.Provider value={{ user }}>
          <Tabs tabs={testTabs} ariaLabel="test label" backLink={backLink} />
        </UserContext.Provider>
      </Router>
    )
  }

  it('renders the correct tabs', () => {
    renderTabs()
    expect(screen.getByText('Test Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Test Tab 2')).toBeInTheDocument()
    expect(screen.getByText('Test Tab 3')).toBeInTheDocument()
  })

  it('calls the appropriate link when a tab is clicked', () => {
    renderTabs()
    const tab2 = screen.getByRole('link', { name: /test tab 2/i })
    fireEvent.click(tab2)
    expect(history.location.pathname).toBe('/training-reports/test-tab-2')
  })

  it('does not show the icon if there is no back link', () => {
    renderTabs()
    expect(screen.queryByTestId('back-link-icon')).not.toBeInTheDocument()
  })

  it('does not show the icon if the back link is a fragment', () => {
    renderTabs(<></>)
    expect(screen.queryByTestId('back-link-icon')).not.toBeInTheDocument()
  })

  it('shows the icon if the backlink is a <Link>', () => {
    renderTabs(<a href="/">Back</a>)
    expect(screen.queryByTestId('back-link-icon')).toBeInTheDocument()
  })
})
