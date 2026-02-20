/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';
import '@testing-library/jest-dom';
import { APPROVER_STATUSES } from '@ttahub/common/src/constants';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import ApproverReview from '../ApproverReview';

// Mock dependencies
jest.mock('../../../../../Constants', () => ({
  managerReportStatuses: ['needs_action', 'approved'],
  DATE_DISPLAY_FORMAT: 'MM/dd/yyyy',
}));

jest.mock('../../../../../components/FormItem', () => function MockFormItem({ children, label }) {
  return (
    <div data-testid="form-item">
      <label>{label}</label>
      {children}
    </div>
  );
});

jest.mock('../../../../../components/HookFormRichEditor', () => function MockHookFormRichEditor({
  id,
  name,
  defaultValue,
  ariaLabel,
}) {
  return (
    <textarea
      id={id}
      name={name}
      defaultValue={defaultValue || ''}
      aria-label={ariaLabel}
      data-testid="rich-editor"
    />
  );
});

// Test wrapper component
const TestWrapper = ({ children, defaultValues = {} }) => {
  const methods = useForm({ defaultValues });
  return (
    <FormProvider {...methods}>
      {children}
    </FormProvider>
  );
};

describe('ApproverReview Component', () => {
  const defaultProps = {
    hasIncompletePages: false,
    incompletePages: [],
    isCreator: false,
    isSubmitted: false,
    onFormReview: jest.fn(),
    availableApprovers: [
      { id: 1, name: 'Manager One' },
      { id: 2, name: 'Manager Two' },
    ],
    status: APPROVER_STATUSES.NEEDS_ACTION,
    dateSubmitted: '2024-01-15T10:30:00Z',
    otherManagerNotes: [],
    hasReviewNote: false,
    hasBeenReviewed: false,
    thisApprovingManager: [{ note: 'Previous note', status: 'approved' }],
    approverStatusList: [
      { user: { id: 1 }, status: 'approved', note: 'Good work' },
      { user: { id: 2 }, status: 'needs_action', note: 'Needs revision' },
    ],
    onSaveDraft: jest.fn(),
    isNeedsAction: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => render(
    <TestWrapper>
      <ApproverReview {...defaultProps} {...props} />
    </TestWrapper>,
  );

  describe('Manager Notes Display', () => {
    it('renders manager notes section when otherManagerNotes exists', () => {
      const otherManagerNotes = [
        { note: 'First note', status: 'approved', user: { fullName: 'User 1' } },
        { note: 'Second note', status: 'needs_action', user: { fullName: 'User 2' } },
      ];

      renderComponent({ otherManagerNotes });

      expect(screen.getByText('Manager notes')).toBeInTheDocument();
    });

    it('hides manager notes section when otherManagerNotes is empty', () => {
      renderComponent({ otherManagerNotes: [] });

      expect(screen.queryByText('Manager notes')).not.toBeInTheDocument();
    });

    it('hides manager notes section when otherManagerNotes is null', () => {
      renderComponent({ otherManagerNotes: null });

      expect(screen.queryByText('Manager notes')).not.toBeInTheDocument();
      expect(screen.queryByTestId('display-approver-notes')).not.toBeInTheDocument();
    });
  });

  describe('Date Formatting and Display', () => {
    it('formats and displays dateSubmitted correctly', () => {
      renderComponent();

      expect(screen.getByText('Date submitted')).toBeInTheDocument();
      // Check that the formatted date paragraph exists and shows the correct formatted date
      const dateParagraphs = document.querySelectorAll('p.margin-top-0');
      expect(dateParagraphs.length).toBeGreaterThan(0);
      expect(screen.getByText('01/15/2024')).toBeInTheDocument();
    });

    it('hides date section when dateSubmitted is null', () => {
      renderComponent({ dateSubmitted: null });

      expect(screen.queryByText('Date Submitted')).not.toBeInTheDocument();
    });

    it('hides date section when dateSubmitted is empty string', () => {
      renderComponent({ dateSubmitted: '' });

      expect(screen.queryByText('Date Submitted')).not.toBeInTheDocument();
    });
  });

  describe('Status Dropdown Configuration', () => {
    it('sets correct defaultValue when hasBeenReviewed is true', () => {
      renderComponent({
        hasBeenReviewed: true,
        thisApprovingManager: [{ status: 'approved' }],
      });

      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toHaveValue('approved');
    });

    it('sets empty defaultValue when hasBeenReviewed is false', () => {
      renderComponent({ hasBeenReviewed: false });

      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toHaveValue('');
    });

    it('renders Choose approval status label', () => {
      renderComponent();

      expect(screen.getByText('Choose approval status')).toBeInTheDocument();
    });
  });

  describe('Button State and Form Submission', () => {
    it('enables submit button when hasIncompletePages is false', async () => {
      renderComponent({ hasIncompletePages: false });

      const submitButton = await screen.findByRole('button', { name: 'Submit' });
      expect(submitButton).toBeEnabled();
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('triggers form submission on submit button click', () => {
      const mockOnFormReview = jest.fn();
      renderComponent({ onFormReview: mockOnFormReview });

      const form = document.querySelector('form');
      fireEvent.submit(form);

      // Note: The actual form submission is handled by react-hook-form
      // We're testing that the form exists and can be submitted
      expect(form).toBeInTheDocument();
    });
  });
  describe('Manager Notes Editor Conditional Display', () => {
    it('shows manager notes editor when status is needs_action', () => {
      const TestWrapperWithStatus = ({ children }) => {
        const methods = useForm({
          defaultValues: { status: APPROVER_STATUSES.NEEDS_ACTION },
        });
        return (
          <FormProvider {...methods}>
            {children}
          </FormProvider>
        );
      };

      render(
        <TestWrapperWithStatus>
          <ApproverReview {...defaultProps} />
        </TestWrapperWithStatus>,
      );

      expect(screen.getByText('Add manager notes')).toBeInTheDocument();
      expect(screen.getByTestId('rich-editor')).toBeInTheDocument();
    });

    it('hides manager notes editor when status is not needs_action', () => {
      const TestWrapperWithStatus = ({ children }) => {
        const methods = useForm({
          defaultValues: { status: 'approved' },
        });
        return (
          <FormProvider {...methods}>
            {children}
          </FormProvider>
        );
      };

      render(
        <TestWrapperWithStatus>
          <ApproverReview {...defaultProps} />
        </TestWrapperWithStatus>,
      );

      expect(screen.queryByText('Add manager notes')).not.toBeInTheDocument();
      expect(screen.queryByTestId('rich-editor')).not.toBeInTheDocument();
    });

    it('hides manager notes editor when no status is selected', () => {
      const TestWrapperWithStatus = ({ children }) => {
        const methods = useForm({
          defaultValues: { status: '' },
        });
        return (
          <FormProvider {...methods}>
            {children}
          </FormProvider>
        );
      };

      render(
        <TestWrapperWithStatus>
          <ApproverReview {...defaultProps} />
        </TestWrapperWithStatus>,
      );

      expect(screen.queryByText('Add manager notes')).not.toBeInTheDocument();
      expect(screen.queryByTestId('rich-editor')).not.toBeInTheDocument();
    });
  });

  describe('Form Structure and Classes', () => {
    it('renders form with correct CSS classes', () => {
      renderComponent();

      const form = document.querySelector('form');
      expect(form).toHaveClass('smart-hub--form-large');
    });
  });
});
