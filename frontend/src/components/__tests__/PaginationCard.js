import '@testing-library/jest-dom'
import React from 'react'
import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PaginationCard from '../PaginationCard'

describe('PaginationCard', () => {
  const renderPaginationCard = (handlePageChange = () => {}, totalCount = 30, offSet = 10) => {
    render(<PaginationCard currentPage={2} totalCount={totalCount} offset={offSet} perPage={10} handlePageChange={handlePageChange} />)
  }

  it('renders correctly', async () => {
    renderPaginationCard()
    expect(await screen.findByText(/11-20 of 30/i)).toBeVisible()
    expect(await screen.findByRole('button', { name: /next page/i })).toBeVisible()
    expect(await screen.findByRole('button', { name: /previous page/i })).toBeVisible()
  })

  it('handles page change', async () => {
    const changePage = jest.fn()
    renderPaginationCard(changePage)

    // Next button.
    const nextPageBtn = await screen.findByRole('button', { name: /next page/i })
    userEvent.click(nextPageBtn)
    await waitFor(() => expect(changePage).toHaveBeenCalled())

    // Page button.
    const pageButton = await screen.findByRole('button', { name: /page 2/i })
    userEvent.click(pageButton)
    await waitFor(() => expect(changePage).toHaveBeenCalled())

    // Previous button.
    const previousPageBtn = await screen.findByRole('button', { name: /previous page/i })
    userEvent.click(previousPageBtn)
    await waitFor(() => expect(changePage).toHaveBeenCalled())
  })

  it('handles when off set is greater than total records', async () => {
    renderPaginationCard(() => {}, 9, 10)
    expect(await screen.findByText(/0-9 of 9/i)).toBeVisible()
  })
})
