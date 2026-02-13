import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import PaginationCard from '../PaginationCard'

jest.mock('react-responsive', () => ({
  useMediaQuery: jest.fn(() => false), // Default to desktop
}))

jest.mock('../../utils', () => ({
  getPageInfo: jest.fn(
    (offset, totalCount, currentPage, perPage) => `Showing ${offset + 1}-${Math.min(offset + perPage, totalCount)} of ${totalCount} items`
  ),
}))

describe('PaginationCard', () => {
  const mockHandlePageChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('hideCountHeaderOnEmpty prop behavior', () => {
    it('should show count header when hideCountHeaderOnEmpty is false and totalCount is 0', () => {
      render(
        <PaginationCard
          currentPage={1}
          totalCount={0}
          offset={0}
          perPage={10}
          handlePageChange={mockHandlePageChange}
          hideCountHeaderOnEmpty={false}
        />
      )

      const countHeader = screen.getByTestId('pagination-card-count-header')
      expect(countHeader).toBeInTheDocument()
    })

    it('should hide count header when hideCountHeaderOnEmpty is true and totalCount is 0', () => {
      render(<PaginationCard currentPage={1} totalCount={0} offset={0} perPage={10} handlePageChange={mockHandlePageChange} hideCountHeaderOnEmpty />)

      const countHeader = screen.queryByTestId('pagination-card-count-header')
      expect(countHeader).not.toBeInTheDocument()
    })

    it('should show count header when hideCountHeaderOnEmpty is true but totalCount is greater than 0', () => {
      render(
        <PaginationCard currentPage={1} totalCount={50} offset={0} perPage={10} handlePageChange={mockHandlePageChange} hideCountHeaderOnEmpty />
      )

      const countHeader = screen.getByTestId('pagination-card-count-header')
      expect(countHeader).toBeInTheDocument()
    })

    it('should show count header when hideCountHeaderOnEmpty is false and totalCount is greater than 0', () => {
      render(
        <PaginationCard
          currentPage={1}
          totalCount={50}
          offset={0}
          perPage={10}
          handlePageChange={mockHandlePageChange}
          hideCountHeaderOnEmpty={false}
        />
      )

      const countHeader = screen.getByTestId('pagination-card-count-header')
      expect(countHeader).toBeInTheDocument()
    })
  })

  describe('basic rendering', () => {
    it('should render pagination when there are multiple pages', () => {
      render(<PaginationCard currentPage={1} totalCount={100} offset={0} perPage={10} handlePageChange={mockHandlePageChange} />)

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('should not render pagination when there is only one page', () => {
      render(<PaginationCard currentPage={1} totalCount={5} offset={0} perPage={10} handlePageChange={mockHandlePageChange} />)

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })

    it('should render per page dropdown when perPageChange is provided', () => {
      const mockPerPageChange = jest.fn()
      render(
        <PaginationCard
          currentPage={1}
          totalCount={100}
          offset={0}
          perPage={10}
          handlePageChange={mockHandlePageChange}
          perPageChange={mockPerPageChange}
        />
      )

      expect(screen.getByTestId('perPage')).toBeInTheDocument()
      expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    })

    it('should not render per page dropdown when perPageChange is false', () => {
      render(
        <PaginationCard currentPage={1} totalCount={100} offset={0} perPage={10} handlePageChange={mockHandlePageChange} perPageChange={false} />
      )

      expect(screen.queryByTestId('perPage')).not.toBeInTheDocument()
    })
  })

  describe('hideInfo prop', () => {
    it('should hide info section when hideInfo is true and there are less than 2 pages', () => {
      const { container } = render(
        <PaginationCard currentPage={1} totalCount={5} offset={0} perPage={10} handlePageChange={mockHandlePageChange} hideInfo />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should show info section when hideInfo is false', () => {
      render(<PaginationCard currentPage={1} totalCount={100} offset={0} perPage={10} handlePageChange={mockHandlePageChange} hideInfo={false} />)

      expect(screen.getByTestId('pagination-card-count-header')).toBeInTheDocument()
    })

    it('should show pagination when hideInfo is true but there are multiple pages', () => {
      render(<PaginationCard currentPage={1} totalCount={100} offset={0} perPage={10} handlePageChange={mockHandlePageChange} hideInfo />)

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have correct aria-label for pagination', () => {
      render(
        <PaginationCard
          currentPage={1}
          totalCount={100}
          offset={0}
          perPage={10}
          handlePageChange={mockHandlePageChange}
          accessibleLandmarkName="Test Pagination"
        />
      )

      const navigation = screen.getByRole('navigation')
      expect(navigation).toHaveAttribute('aria-label', 'Test Pagination')
    })

    it('should have correct aria-label for per page dropdown', () => {
      const mockPerPageChange = jest.fn()
      render(
        <PaginationCard
          currentPage={1}
          totalCount={100}
          offset={0}
          perPage={10}
          handlePageChange={mockHandlePageChange}
          perPageChange={mockPerPageChange}
        />
      )

      const dropdown = screen.getByTestId('perPage')
      expect(dropdown).toHaveAttribute('aria-label', 'Select per page')
    })
  })

  describe('edge cases', () => {
    it('should handle zero total count correctly', () => {
      render(<PaginationCard currentPage={1} totalCount={0} offset={0} perPage={10} handlePageChange={mockHandlePageChange} />)

      expect(screen.getByTestId('pagination-card-count-header')).toBeInTheDocument()
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })

    it('should handle large total counts', () => {
      render(<PaginationCard currentPage={5} totalCount={1000} offset={40} perPage={10} handlePageChange={mockHandlePageChange} />)

      expect(screen.getByTestId('pagination-card-count-header')).toBeInTheDocument()
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('should apply custom pagination className', () => {
      render(
        <PaginationCard
          currentPage={1}
          totalCount={100}
          offset={0}
          perPage={10}
          handlePageChange={mockHandlePageChange}
          paginationClassName="custom-pagination-class"
        />
      )

      const navigation = screen.getByRole('navigation')
      expect(navigation).toHaveClass('custom-pagination-class')
    })
  })
})
