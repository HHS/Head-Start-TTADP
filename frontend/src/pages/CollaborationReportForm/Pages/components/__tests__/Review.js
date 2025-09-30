/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { REPORT_STATUSES } from '@ttahub/common';
import Review from '../Review';
import UserContext from '../../../../../UserContext';

// Mock child components
jest.mock('../ApproverReview', () => function MockApproverReview() {
  return <div data-testid="approver-review">ApproverReview Component</div>;
});

jest.mock('../CreatorSubmit', () => function MockCreatorSubmit() {
  return <div data-testid="creator-submit">CreatorSubmit Component</div>;
});

jest.mock('../../../../../components/Accordion', () => ({
  Accordion: function MockAccordion({ items }) {
    return (
      <div data-testid="accordion">
        {items && items.map((item) => (
          <div key={item.id} data-testid={`accordion-item-${item.id}`}>
            {item.title}
          </div>
        ))}
      </div>
    );
  },
}));

describe('Review Component', () => {
  const mockUser = {
    id: 1,
    fullName: 'Test User',
  };

  const defaultProps = {
    onFormReview: jest.fn(),
    onSubmit: jest.fn(),
    approverStatusList: [],
    pendingOtherApprovals: false,
    dateSubmitted: '2024-01-15',
    pages: [
      {
        state: 'Complete', review: false, label: 'Page 1', position: '1',
      },
      {
        state: 'In Progress', review: false, label: 'Page 2', position: '2',
      },
    ],
    availableApprovers: [
      { id: 1, name: 'Manager One' },
      { id: 2, name: 'Manager Two' },
    ],
    reviewItems: [
      {
        id: 'item1',
        title: 'Review Item 1',
        content: <div>Content 1</div>,
      },
      {
        id: 'item2',
        title: 'Review Item 2',
        content: <div>Content 2</div>,
      },
    ],
    isCreator: false,
    isCollaborator: false,
    isApprover: false,
    isSubmitted: false,
    onSaveForm: jest.fn(),
    onUpdatePage: jest.fn(),
    onSaveDraft: jest.fn(),
    isNeedsAction: false,
    pendingApprovalCount: 0,
    author: {
      fullName: 'Report Author',
    },
    approvers: [
      {
        status: REPORT_STATUSES.SUBMITTED,
        user: { fullName: 'Approver One' },
      },
    ],
  };

  const renderTest = (props = {}, userOverrides = {}, formValues = {}) => {
    const user = { ...mockUser, ...userOverrides };

    const TestWrapper = () => {
      const defaultFormValues = {
        pageState: {
          1: 'Complete',
          2: 'In Progress',
          3: 'Complete',
        },
        ...formValues,
      };

      const hookForm = useForm({
        mode: 'onChange',
        defaultValues: defaultFormValues,
      });

      return (
        <UserContext.Provider value={{ user }}>
          <FormProvider {...hookForm}>
            <Review {...defaultProps} {...props} />
          </FormProvider>
        </UserContext.Provider>
      );
    };

    return render(<TestWrapper />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the component with default heading', () => {
      renderTest();
      expect(screen.getByText('Review and submit')).toBeInTheDocument();
    });

    it('renders IndicatesRequiredField component', () => {
      renderTest();
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Component Selection', () => {
    it('renders ApproverReview component when isApprover is true', () => {
      renderTest({ isApprover: true });
      expect(screen.getByTestId('approver-review')).toBeInTheDocument();
      expect(screen.queryByTestId('creator-submit')).not.toBeInTheDocument();
    });

    it('renders CreatorSubmit component when isApprover is false', () => {
      renderTest({ isApprover: false });
      expect(screen.getByTestId('creator-submit')).toBeInTheDocument();
      expect(screen.queryByTestId('approver-review')).not.toBeInTheDocument();
    });
  });

  describe('TopAlert Component', () => {
    it('displays TopAlert when isSubmitted is true', () => {
      renderTest({
        isSubmitted: true,
        pendingApprovalCount: 1,
        isNeedsAction: false,
        approvers: [
          {
            status: null,
            user: { fullName: 'Approver One' },
          },

        ],
      });

      expect(screen.getByText(/Report Author has requested approval/)).toBeInTheDocument();
      expect(screen.getByText(/1 of 1 reviews pending/)).toBeInTheDocument();
    });

    it('displays needs action alert when isNeedsAction is true', () => {
      const needsActionApprovers = [
        {
          status: REPORT_STATUSES.NEEDS_ACTION,
          user: { fullName: 'Manager One' },
        },
        {
          status: REPORT_STATUSES.NEEDS_ACTION,
          user: { fullName: 'Manager Two' },
        },
      ];

      renderTest({
        isSubmitted: true,
        isNeedsAction: true,
        approvers: needsActionApprovers,
      });

      expect(screen.getByText(/Manager One and Manager Two are requesting changes to the Collaboration Report/)).toBeInTheDocument();
      expect(screen.getByText(/Please review any manager notes below and re-submit for approval/)).toBeInTheDocument();
    });

    it('does not display TopAlert when isSubmitted is false', () => {
      renderTest({ isSubmitted: false });
      expect(screen.queryByText(/has requested approval/)).not.toBeInTheDocument();
    });
  });

  describe('Review Items Accordion', () => {
    it('displays accordion when reviewItems are provided', () => {
      renderTest();
      expect(screen.getByTestId('accordion')).toBeInTheDocument();
      expect(screen.getByTestId('accordion-item-item1')).toBeInTheDocument();
      expect(screen.getByTestId('accordion-item-item2')).toBeInTheDocument();
      expect(screen.getByText('Review Item 1')).toBeInTheDocument();
      expect(screen.getByText('Review Item 2')).toBeInTheDocument();
    });

    it('does not display accordion when reviewItems is empty', () => {
      renderTest({ reviewItems: [] });
      expect(screen.queryByTestId('accordion')).not.toBeInTheDocument();
    });

    it('does not display accordion when reviewItems is null', () => {
      renderTest({ reviewItems: null });
      expect(screen.queryByTestId('accordion')).not.toBeInTheDocument();
    });
  });

  describe('Props Passed to Child Components', () => {
    it('passes correct props to child component', () => {
      const approverStatusList = [
        { user: { id: 1 }, status: 'approved', note: 'Good work' },
        { user: { id: 2 }, status: 'needs_action', note: 'Needs revision' },
      ];

      renderTest({
        isApprover: true,
        approverStatusList,
        isSubmitted: true,
        isNeedsAction: true,
      });

      expect(screen.getByTestId('approver-review')).toBeInTheDocument();
    });
  });

  describe('Page Completion Logic', () => {
    it('calculates incomplete pages correctly', () => {
      const pages = [
        { state: 'Complete', review: false, label: 'Complete Page' },
        { state: 'In Progress', review: false, label: 'Incomplete Page 1' },
        { state: 'Not Started', review: false, label: 'Incomplete Page 2' },
        { state: 'Complete', review: true, label: 'Review Page' },
      ];

      renderTest({ pages, isApprover: false });
      expect(screen.getByTestId('creator-submit')).toBeInTheDocument();
    });

    it('handles empty pages array', () => {
      renderTest({ pages: [] });
      expect(screen.getByText('Review and submit')).toBeInTheDocument();
    });
  });

  describe('User Context Integration', () => {
    it('filters approver status list based on current user', () => {
      const approverStatusList = [
        { user: { id: 1 }, status: 'approved', note: 'My note' },
        { user: { id: 2 }, status: 'needs_action', note: 'Other note' },
      ];

      renderTest({ approverStatusList, isApprover: true }, { id: 1 });
      expect(screen.getByTestId('approver-review')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null approverStatusList', () => {
      renderTest({ approverStatusList: null });
      expect(screen.getByText('Review and submit')).toBeInTheDocument();
    });

    it('handles empty approvers array in TopAlert', () => {
      renderTest({
        isSubmitted: true,
        isNeedsAction: true,
        approvers: [],
      });

      expect(screen.getByText(/Changes have been requested for the Collaboration Report/)).toBeInTheDocument();
    });

    it('handles approvers without user property', () => {
      const incompleteApprovers = [
        { status: REPORT_STATUSES.NEEDS_ACTION },
      ];

      renderTest({
        isSubmitted: true,
        isNeedsAction: true,
        approvers: incompleteApprovers,
      });

      // Should still render the alert even if some approvers don't have user data
      expect(screen.getByText(/Changes have been requested for the Collaboration Report/)).toBeInTheDocument();
    });
  });

  describe('TopAlert formatNeedsActionApprovers function', () => {
    it('returns empty string when no needs action approvers', () => {
      const approvers = [
        {
          status: REPORT_STATUSES.APPROVED,
          user: { fullName: 'Manager One' },
        },
      ];

      renderTest({
        isSubmitted: true,
        isNeedsAction: false,
        approvers,
      });

      expect(screen.getByText(/Report Author has requested approval/)).toBeInTheDocument();
    });

    it('returns single approver name', () => {
      const approvers = [
        {
          status: REPORT_STATUSES.NEEDS_ACTION,
          user: { fullName: 'Single Manager' },
        },
      ];

      renderTest({
        isSubmitted: true,
        isNeedsAction: true,
        approvers,
      });

      expect(screen.getByText(/Single Manager is requesting changes to the Collaboration Report/)).toBeInTheDocument();
    });
  });
});
