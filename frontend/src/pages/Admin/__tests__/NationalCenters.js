import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import join from 'url-join'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import userEvent from '@testing-library/user-event'
import NationalCenters from '../NationalCenters'

describe('National Centers page', () => {
  const nationalCenterUrl = join('api', 'national-center')
  const nationalCenterAdminUrl = join('api', 'admin', 'national-center')
  beforeEach(() => {
    fetchMock.get(nationalCenterUrl, {
      centers: [
        { id: 1, name: 'DTL', users: [] },
        { id: 2, name: 'HBHS', users: [{ id: 1, name: 'User 1' }] },
        { id: 3, name: 'PFCE', users: [] },
        { id: 4, name: 'PFMO', users: [{ id: 4, name: 'User 4' }] },
      ],
      users: [
        {
          id: 1,
          name: 'User 1',
        },
        {
          id: 2,
          name: 'User 2',
        },
        {
          id: 3,
          name: 'User 3',
        },
        {
          id: 4,
          name: 'User 4',
        },
      ],
    })
  })

  afterEach(() => {
    fetchMock.restore()
  })
  it('renders without nationalCenterId match param', async () => {
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <NationalCenters match={{ params: {}, path: '', url: '' }} />
      </Router>
    )
    expect(await screen.findByText(/National Centers/i)).toBeVisible()
  })
  it('renders with nationalCenterId match param', async () => {
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <NationalCenters match={{ params: { nationalCenterId: '1' }, path: '', url: '' }} />
      </Router>
    )
    expect(await screen.findByText(/National Centers/i)).toBeVisible()
  })
  it('can fail to fetch centers', async () => {
    fetchMock.restore()
    fetchMock.get(nationalCenterUrl, 500)
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <NationalCenters match={{ params: {}, path: '', url: '' }} />
      </Router>
    )
    expect(await screen.findByText(/Error fetching national centers/i)).toBeVisible()
  })

  it('can create a new national center', async () => {
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <NationalCenters match={{ params: { nationalCenterId: 'new' }, path: '', url: '' }} />
      </Router>
    )
    expect(await screen.findByText(/National Centers/i)).toBeVisible()

    fetchMock.post(nationalCenterAdminUrl, { name: 'New Center', id: 5 })
    userEvent.type(screen.getByLabelText(/National center name/i), 'New Center')

    const dropdown = screen.getByTestId('user-dropdown')

    // Assert the dropdown doesn't contain entries for users already assigned to other centers.
    expect(screen.queryByText('User 1')).toBeNull()
    expect(screen.queryByText('User 4')).toBeNull()

    userEvent.selectOptions(dropdown, '2')
    expect(screen.getByText('User 2')).toBeVisible()

    userEvent.click(screen.getByText(/Save/i))

    expect(await screen.findByText('Center created successfully')).toBeVisible()
  })

  it("can't create a new national center without a user", async () => {
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <NationalCenters match={{ params: { nationalCenterId: 'new' }, path: '', url: '' }} />
      </Router>
    )
    expect(await screen.findByText(/National Centers/i)).toBeVisible()

    fetchMock.post(nationalCenterAdminUrl, { name: 'New Center', id: 5 })
    userEvent.type(screen.getByLabelText(/National center name/i), 'New Center without user')

    const dropdown = screen.getByTestId('user-dropdown')
    userEvent.selectOptions(dropdown, '0')

    userEvent.click(screen.getByText(/Save/i))

    expect(await screen.findByText(/please select a user\./i)).toBeVisible()

    userEvent.selectOptions(dropdown, '2')
    expect(screen.getByText('User 2')).toBeVisible()

    userEvent.click(screen.getByText(/Save/i))

    expect(await screen.findByText('Center created successfully')).toBeVisible()
  })

  it("can't update an existing national center without a user", async () => {
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <NationalCenters match={{ params: { nationalCenterId: '1' }, path: '', url: '' }} />
      </Router>
    )
    expect(await screen.findByText(/National Centers/i)).toBeVisible()

    fetchMock.put(join(nationalCenterAdminUrl, '1'), { name: 'New Center', id: 5 })
    userEvent.type(screen.getByLabelText(/National center name/i), '1')

    // set user dropdown list to the default value.
    const dropdown = screen.getByTestId('user-dropdown')
    userEvent.selectOptions(dropdown, '0')

    userEvent.click(screen.getByText(/Save/i))

    expect(await screen.findByText(/please select a user\./i)).toBeVisible()

    userEvent.selectOptions(dropdown, '2')
    expect(screen.getByText('User 2')).toBeVisible()

    userEvent.click(screen.getByText(/Save/i))

    expect(await screen.findByText('Center updated successfully')).toBeVisible()
  })

  it('creating a new national center with a user updates the list', async () => {
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <NationalCenters match={{ params: { nationalCenterId: 'new' }, path: '', url: '' }} />
      </Router>
    )
    expect(await screen.findByText(/National Centers/i)).toBeVisible()

    fetchMock.post(nationalCenterAdminUrl, { name: 'New Center', id: 5 })
    userEvent.type(screen.getByLabelText(/National center name/i), 'New Center')

    const dropdown = screen.getByTestId('user-dropdown')
    userEvent.selectOptions(dropdown, '2')
    expect(screen.getByText('User 2')).toBeVisible()

    // fetch mock get once for the initial render, and once for the update
    fetchMock.get(
      nationalCenterUrl,
      {
        centers: [
          { id: '1', name: 'DTL', users: [] },
          { id: '2', name: 'HBHS', users: [{ id: 1, name: 'User 1' }] },
          { id: '3', name: 'PFCE', users: [] },
          { id: '4', name: 'PFMO', users: [{ id: 4, name: 'User 4' }] },
          { id: '5', name: 'New Center', users: [{ id: 2, name: 'User 2' }] },
        ],
        users: [
          {
            id: 1,
            name: 'User 1',
          },
          {
            id: 2,
            name: 'User 2',
          },
          {
            id: 3,
            name: 'User 3',
          },
          {
            id: 4,
            name: 'User 4',
          },
        ],
      },
      { overwriteRoutes: true }
    )

    // Save with updated response.
    userEvent.click(screen.getByText(/Save/i))
    expect(await screen.findByText('Center created successfully')).toBeVisible()

    // Expect to see the new center in the list with the user.
    expect(screen.getByText('New Center (User 2)')).toBeVisible()

    // Verify list of users is updated.
    userEvent.click(screen.getByText('DTL'))

    // Verify 'dropdown' doesn't contain entries for users already assigned to other centers.
    expect(screen.queryByText('User 1')).toBeNull()
    expect(screen.queryByText('User 4')).toBeNull()
    expect(screen.queryByText('User 3')).not.toBeNull()
  })

  it('can update an existing national center', async () => {
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <NationalCenters match={{ params: { nationalCenterId: '1' }, path: '', url: '' }} />
      </Router>
    )
    expect(await screen.findByText(/National Centers/i)).toBeVisible()

    fetchMock.put(join(nationalCenterAdminUrl, '1'), { name: 'New Center', id: 5 })
    userEvent.type(screen.getByLabelText(/National center name/i), '1')

    const dropdown = screen.getByTestId('user-dropdown')

    // Assert the dropdown doesn't contain entries for users already assigned to other centers.
    expect(screen.queryByText('User 1')).toBeNull()
    expect(screen.queryByText('User 4')).toBeNull()

    userEvent.selectOptions(dropdown, '2')
    expect(screen.getByText('User 2')).toBeVisible()

    userEvent.click(screen.getByText(/Save/i))
    expect(await screen.findByText('Center updated successfully')).toBeVisible()
  })

  it('handles an error to create or update a national center', async () => {
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <NationalCenters match={{ params: { nationalCenterId: '1' }, path: '', url: '' }} />
      </Router>
    )
    expect(await screen.findByText(/National Centers/i)).toBeVisible()

    fetchMock.put(join(nationalCenterAdminUrl, '1'), 500)
    userEvent.type(screen.getByLabelText(/National center name/i), '1')

    const dropdown = screen.getByTestId('user-dropdown')
    userEvent.selectOptions(dropdown, '3')
    expect(screen.getByText('User 3')).toBeVisible()

    userEvent.click(screen.getByText(/Save/i))

    expect(await screen.findByText('Error saving national center')).toBeVisible()
  })

  it('you can delete a national center', async () => {
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <NationalCenters match={{ params: { nationalCenterId: '1' }, path: '', url: '' }} />
      </Router>
    )
    expect(await screen.findByText(/National Centers/i)).toBeVisible()

    fetchMock.delete(join(nationalCenterAdminUrl, '1'), { message: 'Center deleted successfully' })
    userEvent.click(screen.getByText('Delete'))

    userEvent.click(screen.getByText('Yes'))

    expect(await screen.findByText('Center deleted successfully')).toBeVisible()
  })

  it('handles an error to delete a national center', async () => {
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <NationalCenters match={{ params: { nationalCenterId: '1' }, path: '', url: '' }} />
      </Router>
    )
    expect(await screen.findByText(/National Centers/i)).toBeVisible()

    fetchMock.delete(join(nationalCenterAdminUrl, '1'), 500)
    userEvent.click(screen.getByText('Delete'))

    userEvent.click(screen.getByText('Yes'))

    expect(await screen.findByText('Error deleting national center')).toBeVisible()
  })
})
