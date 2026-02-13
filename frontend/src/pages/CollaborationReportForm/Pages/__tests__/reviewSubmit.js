/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { REPORT_STATUSES } from '@ttahub/common'
import reviewSubmitPage, { ReviewSubmit } from '../reviewSubmit'
import UserContext from '../../../../UserContext'

// Mock dependencies
jest.mock(
  '../../../../components/Container',
  () =>
    function MockContainer({ children, skipTopPadding, className, skipBottomPadding, paddingY }) {
      return (
        <div
          data-testid="container"
          data-skip-top-padding={skipTopPadding}
          data-skip-bottom-padding={skipBottomPadding}
          data-padding-y={paddingY}
          className={className}
        >
          {children}
        </div>
      )
    }
)

jest.mock(
  '../components/Review',
  () =>
    function MockReview({
      author,
      approvers,
      isCreator,
      isSubmitted,
      isApproved,
      isNeedsAction,
      isApprover,
      pendingOtherApprovals,
      dateSubmitted,
      onFormReview,
      pages,
      availableApprovers,
      reviewItems,
      onSaveForm,
      onSaveDraft,
      onUpdatePage,
      pendingApprovalCount,
    }) {
      return (
        <div data-testid="review-component">
          <div data-testid="review-author">{author ? author.name : 'No author'}</div>
          <div data-testid="review-approvers">{approvers ? approvers.length : 0} approvers</div>
          <div data-testid="review-is-creator">{isCreator ? 'true' : 'false'}</div>
          <div data-testid="review-is-submitted">{isSubmitted ? 'true' : 'false'}</div>
          <div data-testid="review-is-approved">{isApproved ? 'true' : 'false'}</div>
          <div data-testid="review-is-needs-action">{isNeedsAction ? 'true' : 'false'}</div>
          <div data-testid="review-is-approver">{isApprover ? 'true' : 'false'}</div>
          <div data-testid="review-pending-other-approvals">{pendingOtherApprovals ? 'true' : 'false'}</div>
          <div data-testid="review-date-submitted">{dateSubmitted || 'No date'}</div>
          <div data-testid="review-pending-approval-count">{pendingApprovalCount}</div>
          <div data-testid="review-available-approvers">{availableApprovers ? availableApprovers.length : 0} available</div>
          <div data-testid="review-items">{reviewItems ? reviewItems.length : 0} items</div>
          <div data-testid="review-pages">{pages ? pages.length : 0} pages</div>
          <button type="button" onClick={onFormReview} data-testid="form-review-btn">
            Review
          </button>
          <button type="button" onClick={onSaveForm} data-testid="save-form-btn">
            Save Form
          </button>
          <button type="button" onClick={onSaveDraft} data-testid="save-draft-btn">
            Save Draft
          </button>
          <button type="button" onClick={() => onUpdatePage(1)} data-testid="update-page-btn">
            Update Page
          </button>
        </div>
      )
    }
)

jest.mock('../pages', () => [
  {
    path: 'page1',
    label: 'Page 1',
    reviewSection: () => <div>Page 1 Review</div>,
  },
  {
    path: 'page2',
    label: 'Page 2',
    reviewSection: () => <div>Page 2 Review</div>,
  },
])

// Test wrapper component
const TestWrapper = ({ children, user = { id: 1 } }) => <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>

describe('reviewSubmit Page', () => {
  const defaultProps = {
    onReview: jest.fn(),
    formData: {
      calculatedStatus: REPORT_STATUSES.DRAFT,
      submissionStatus: REPORT_STATUSES.DRAFT,
      approvers: [],
      submittedAt: null,
      author: { id: 1, name: 'Test Author' },
      userId: 1,
      collabReportSpecialists: [],
    },
    error: '',
    isPendingApprover: false,
    availableApprovers: [
      { id: 1, name: 'Manager One' },
      { id: 2, name: 'Manager Two' },
    ],
    reviewItems: [
      { id: 'item1', title: 'Item 1', content: <div>Content 1</div> },
      { id: 'item2', title: 'Item 2', content: <div>Content 2</div> },
    ],
    onUpdatePage: jest.fn(),
    onSaveForm: jest.fn(),
    onSaveDraft: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Page Object Structure', () => {
    it('exports correct page metadata', () => {
      expect(reviewSubmitPage.position).toBe(4)
      expect(reviewSubmitPage.label).toBe('Review and submit')
      expect(reviewSubmitPage.path).toBe('review')
      expect(reviewSubmitPage.review).toBe(true)
    })

    it('exports render function', () => {
      expect(typeof reviewSubmitPage.render).toBe('function')
    })

    it('render function returns ReviewSubmit component', () => {
      const mockAdditionalData = { approvers: [] }
      const result = reviewSubmitPage.render(
        defaultProps.formData,
        jest.fn(),
        mockAdditionalData,
        jest.fn(),
        false,
        false,
        jest.fn(),
        [],
        null,
        null,
        jest.fn(),
        jest.fn()
      )

      expect(result.type.name).toBe('ReviewSubmit')
    })
  })

  describe('User Role Calculations', () => {
    it('correctly identifies creator when userId matches user.id', () => {
      render(
        <TestWrapper user={{ id: 1 }}>
          <ReviewSubmit {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-is-creator')).toHaveTextContent('true')
    })

    it('correctly identifies non-creator when userId does not match user.id', () => {
      render(
        <TestWrapper user={{ id: 2 }}>
          <ReviewSubmit {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-is-creator')).toHaveTextContent('false')
    })

    it('correctly identifies approver when user.id is in approvers list', () => {
      const formDataWithApprovers = {
        ...defaultProps.formData,
        approvers: [
          { user: { id: 1 }, status: 'needs_action' },
          { user: { id: 2 }, status: 'approved' },
        ],
      }

      render(
        <TestWrapper user={{ id: 1 }}>
          <ReviewSubmit {...defaultProps} formData={formDataWithApprovers} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-is-approver')).toHaveTextContent('true')
    })

    it('correctly identifies non-approver when user.id is not in approvers list', () => {
      const formDataWithApprovers = {
        ...defaultProps.formData,
        approvers: [
          { user: { id: 2 }, status: 'needs_action' },
          { user: { id: 3 }, status: 'approved' },
        ],
      }

      render(
        <TestWrapper user={{ id: 1 }}>
          <ReviewSubmit {...defaultProps} formData={formDataWithApprovers} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-is-approver')).toHaveTextContent('false')
    })
  })

  describe('Status Calculations', () => {
    it('correctly identifies submitted status', () => {
      const formDataSubmitted = {
        ...defaultProps.formData,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      }

      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} formData={formDataSubmitted} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-is-submitted')).toHaveTextContent('true')
    })

    it('correctly identifies approved status', () => {
      const formDataApproved = {
        ...defaultProps.formData,
        calculatedStatus: REPORT_STATUSES.APPROVED,
      }

      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} formData={formDataApproved} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-is-approved')).toHaveTextContent('true')
    })

    it('correctly identifies needs action status', () => {
      const formDataNeedsAction = {
        ...defaultProps.formData,
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
      }

      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} formData={formDataNeedsAction} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-is-needs-action')).toHaveTextContent('true')
    })
  })

  describe('Pending Approval Calculations', () => {
    it('calculates pendingOtherApprovals correctly when needs action and not pending approver', () => {
      const formDataNeedsAction = {
        ...defaultProps.formData,
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
      }

      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} formData={formDataNeedsAction} isPendingApprover={false} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-pending-other-approvals')).toHaveTextContent('true')
    })

    it('calculates pendingOtherApprovals correctly when submitted and not pending approver', () => {
      const formDataSubmitted = {
        ...defaultProps.formData,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      }

      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} formData={formDataSubmitted} isPendingApprover={false} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-pending-other-approvals')).toHaveTextContent('true')
    })

    it('calculates pendingApprovalCount correctly', () => {
      const formDataWithPendingApprovals = {
        ...defaultProps.formData,
        approvers: [
          { user: { id: 1 }, status: null },
          { user: { id: 2 }, status: 'needs_action' },
          { user: { id: 3 }, status: 'approved' },
        ],
      }

      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} formData={formDataWithPendingApprovals} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-pending-approval-count')).toHaveTextContent('2')
    })

    it('handles null approvers for pendingApprovalCount', () => {
      const formDataNullApprovers = {
        ...defaultProps.formData,
        approvers: null,
      }

      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} formData={formDataNullApprovers} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-pending-approval-count')).toHaveTextContent('0')
    })
  })

  describe('Error Display', () => {
    it('displays error alert when error prop is provided', () => {
      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} error="Something went wrong" />
        </TestWrapper>
      )

      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      const errorAlert = document.querySelector('.usa-alert--error')
      expect(errorAlert).toBeInTheDocument()
    })

    it('does not display error alert when error prop is empty', () => {
      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} error="" />
        </TestWrapper>
      )

      expect(screen.queryByText('Error')).not.toBeInTheDocument()
    })

    it('does not display error alert when error prop is null', () => {
      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} error={null} />
        </TestWrapper>
      )

      expect(screen.queryByText('Error')).not.toBeInTheDocument()
    })
  })

  describe('Props Passed to Review Component', () => {
    it('passes all required props to Review component', () => {
      const formDataComplete = {
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        collabReportSpecialists: [],
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        approvers: [{ user: { id: 1 }, status: 'needs_action' }],
        submittedAt: '2024-01-15T10:30:00Z',
        author: { id: 2, name: 'Test Author' },
        userId: 1,
      }

      render(
        <TestWrapper user={{ id: 1 }}>
          <ReviewSubmit {...defaultProps} formData={formDataComplete} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-author')).toHaveTextContent('Test Author')
      expect(screen.getByTestId('review-approvers')).toHaveTextContent('1 approvers')
      expect(screen.getByTestId('review-is-creator')).toHaveTextContent('true')
      expect(screen.getByTestId('review-is-submitted')).toHaveTextContent('true')
      expect(screen.getByTestId('review-is-needs-action')).toHaveTextContent('true')
      expect(screen.getByTestId('review-is-approver')).toHaveTextContent('true')
      expect(screen.getByTestId('review-date-submitted')).toHaveTextContent('2024-01-15T10:30:00Z')
      expect(screen.getByTestId('review-available-approvers')).toHaveTextContent('2 available')
      expect(screen.getByTestId('review-items')).toHaveTextContent('2 items')
    })

    it('passes function props correctly to Review component', () => {
      const mockOnReview = jest.fn()
      const mockOnSaveForm = jest.fn()
      const mockOnSaveDraft = jest.fn()
      const mockOnUpdatePage = jest.fn()

      render(
        <TestWrapper>
          <ReviewSubmit
            {...defaultProps}
            onReview={mockOnReview}
            onSaveForm={mockOnSaveForm}
            onSaveDraft={mockOnSaveDraft}
            onUpdatePage={mockOnUpdatePage}
          />
        </TestWrapper>
      )

      const reviewBtn = screen.getByTestId('form-review-btn')
      const saveFormBtn = screen.getByTestId('save-form-btn')
      const saveDraftBtn = screen.getByTestId('save-draft-btn')
      const updatePageBtn = screen.getByTestId('update-page-btn')

      reviewBtn.click()
      saveFormBtn.click()
      saveDraftBtn.click()
      updatePageBtn.click()

      expect(mockOnReview).toHaveBeenCalledTimes(1)
      expect(mockOnSaveForm).toHaveBeenCalledTimes(1)
      expect(mockOnSaveDraft).toHaveBeenCalledTimes(1)
      expect(mockOnUpdatePage).toHaveBeenCalledTimes(1)
    })
  })

  describe('Container Configuration', () => {
    it('renders Container with correct props', () => {
      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} />
        </TestWrapper>
      )

      const container = screen.getByTestId('container')
      expect(container).toHaveAttribute('data-skip-top-padding', 'true')
      expect(container).toHaveAttribute('data-skip-bottom-padding', 'true')
      expect(container).toHaveAttribute('data-padding-y', '0')
      expect(container).toHaveClass('margin-bottom-0', 'padding-top-2', 'padding-bottom-5')
    })
  })

  describe('Edge Cases', () => {
    it('handles null author gracefully', () => {
      const formDataNullAuthor = {
        ...defaultProps.formData,
        author: null,
      }

      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} formData={formDataNullAuthor} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-author')).toHaveTextContent('No author')
    })

    it('handles empty approvers array', () => {
      const formDataEmptyApprovers = {
        ...defaultProps.formData,
        approvers: [],
      }

      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} formData={formDataEmptyApprovers} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-approvers')).toHaveTextContent('0 approvers')
      expect(screen.getByTestId('review-is-approver')).toHaveTextContent('false')
    })

    it('handles undefined approvers', () => {
      const formDataUndefinedApprovers = {
        ...defaultProps.formData,
        approvers: undefined,
      }

      render(
        <TestWrapper>
          <ReviewSubmit {...defaultProps} formData={formDataUndefinedApprovers} />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-is-approver')).toHaveTextContent('false')
      expect(screen.getByTestId('review-pending-approval-count')).toHaveTextContent('0')
    })

    it('handles complex approval status combinations', () => {
      const formDataComplex = {
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        collabReportSpecialists: [],
        approvers: [
          { user: { id: 1 }, status: 'approved' },
          { user: { id: 2 }, status: 'needs_action' },
          { user: { id: 3 }, status: null },
        ],
        submittedAt: '2024-01-15T10:30:00Z',
        author: { id: 4, name: 'Author Name' },
        userId: 2,
      }

      render(
        <TestWrapper user={{ id: 2 }}>
          <ReviewSubmit {...defaultProps} formData={formDataComplex} isPendingApprover />
        </TestWrapper>
      )

      expect(screen.getByTestId('review-is-creator')).toHaveTextContent('true')
      expect(screen.getByTestId('review-is-submitted')).toHaveTextContent('true')
      expect(screen.getByTestId('review-is-needs-action')).toHaveTextContent('true')
      expect(screen.getByTestId('review-is-approver')).toHaveTextContent('true')
      expect(screen.getByTestId('review-pending-other-approvals')).toHaveTextContent('false')
      expect(screen.getByTestId('review-pending-approval-count')).toHaveTextContent('2')
    })
  })
})
