/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import CreatorNeedsAction from '../CreatorNeedsAction'

// Mock the custom hook
const mockUseExistingApprovers = jest.fn()
jest.mock('../../../../../hooks/useExistingApprovers', () => () => mockUseExistingApprovers())

// Test wrapper component
const TestWrapper = ({ children, defaultValues = {} }) => {
  const methods = useForm({ defaultValues })
  return <FormProvider {...methods}>{children}</FormProvider>
}

describe('CreatorNeedsAction Component', () => {
  const defaultProps = {
    onFormReview: jest.fn(),
    availableApprovers: [
      { id: 1, name: 'Manager One' },
      { id: 2, name: 'Manager Two' },
      { id: 3, name: 'Manager Three' },
    ],
    hasIncompletePages: false,
    incompletePages: [],
    isCreator: true,
    isSubmitted: false,
    onUpdatePage: jest.fn(),
    onSaveDraft: jest.fn(),
    onSubmit: jest.fn(),
    isNeedsAction: true,
    dateSubmitted: null,
    otherManagerNotes: [],
    hasReviewNote: false,
    hasBeenReviewed: false,
    thisApprovingManager: [],
    approverStatusList: [],
  }

  const mockInitialValue = [
    { user: { id: 1 }, status: 'approved', note: 'Good work' },
    { user: { id: 2 }, status: 'needs_action', note: 'Needs changes' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseExistingApprovers.mockReturnValue({
      initialValue: mockInitialValue,
    })
  })

  const renderComponent = (props = {}) =>
    render(
      <TestWrapper>
        <CreatorNeedsAction {...defaultProps} {...props} />
      </TestWrapper>
    )

  describe('Three Section Layout', () => {
    it('renders approval status section with correct heading', () => {
      renderComponent()

      const approvalStatusHeading = screen.getByText('Approval status')
      expect(approvalStatusHeading).toBeInTheDocument()
      expect(approvalStatusHeading.tagName).toBe('H3')
      expect(approvalStatusHeading).toHaveClass('usa-prose', 'margin-top-0', 'margin-bottom-1')
    })

    it('renders manager notes section with correct heading', () => {
      renderComponent()

      const managerNotesHeading = screen.getByText('Manager notes')
      expect(managerNotesHeading).toBeInTheDocument()
      expect(managerNotesHeading.tagName).toBe('H3')
      expect(managerNotesHeading).toHaveClass('usa-prose', 'margin-top-0', 'margin-bottom-1')
    })

    it('renders additional approvers section with correct heading', () => {
      renderComponent()

      expect(screen.getByText('Add additional approvers')).toBeInTheDocument()
    })
  })

  describe('useExistingApprovers Hook Integration', () => {
    it('handles empty initialValue from hook', () => {
      mockUseExistingApprovers.mockReturnValue({
        initialValue: [],
      })

      renderComponent()

      expect(screen.queryByText('Approver Status:')).not.toBeInTheDocument()
      expect(screen.queryByText('Approver Notes:')).not.toBeInTheDocument()
    })
  })
})
