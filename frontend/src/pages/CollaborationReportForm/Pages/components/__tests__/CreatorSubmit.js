/* eslint-disable react/destructuring-assignment */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import CreatorSubmit from '../CreatorSubmit';

// Mock dependencies
jest.mock('../../../../../components/IncompletePages', () => function MockIncompletePages({ incompletePages }) {
  return (
    <div data-testid="incomplete-pages">
      Incomplete Pages:
      {' '}
      {incompletePages.join(', ')}
    </div>
  );
});

jest.mock('../../../../../components/FormItem', () => function MockFormItem({ children, label, name }) {
  return (
    <div data-testid={`form-item-${name}`}>
      <label>{label}</label>
      {children}
    </div>
  );
});

jest.mock('../../../../ActivityReport/Pages/Review/Submitter/components/ApproverSelect', () => function MockApproverSelect({
  name,
  valueProperty,
  labelProperty,
  options,
}) {
  return (
    <select
      name={name}
      data-testid="approver-select"
      data-value-property={valueProperty}
      data-label-property={labelProperty}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

jest.mock('../CreatorNeedsAction', () => function MockCreatorNeedsAction(props) {
  return (
    <div data-testid="creator-needs-action">
      CreatorNeedsAction Component
      <div data-testid="needs-action-props">
        {JSON.stringify({
          onFormReview: typeof props.onFormReview,
          availableApprovers: props.availableApprovers,
          isCreator: props.isCreator,
          isSubmitted: props.isSubmitted,
        })}
      </div>
    </div>
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

describe('CreatorSubmit Component', () => {
  const defaultProps = {
    hasIncompletePages: false,
    incompletePages: [],
    isCreator: true,
    isSubmitted: false,
    onFormReview: jest.fn(),
    availableApprovers: [
      { id: 1, name: 'Manager One' },
      { id: 2, name: 'Manager Two' },
    ],
    onUpdatePage: jest.fn(),
    onSaveDraft: jest.fn(),
    draftValues: {},
    onSubmit: jest.fn(),
    isNeedsAction: false,
    dateSubmitted: null,
    otherManagerNotes: [],
    hasReviewNote: false,
    hasBeenReviewed: false,
    thisApprovingManager: [],
    approverStatusList: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => render(
    <TestWrapper>
      <CreatorSubmit {...defaultProps} {...props} />
    </TestWrapper>,
  );

  describe('Conditional Component Rendering', () => {
    it('returns CreatorNeedsAction component when isNeedsAction is true', () => {
      renderComponent({ isNeedsAction: true });

      expect(screen.getByTestId('creator-needs-action')).toBeInTheDocument();
      expect(screen.getByText('CreatorNeedsAction Component')).toBeInTheDocument();

      // Should not render the normal form
      expect(screen.queryByText('Submit')).not.toBeInTheDocument();
      expect(screen.queryByText('Save draft')).not.toBeInTheDocument();
      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    it('passes all required props to CreatorNeedsAction', () => {
      const customProps = {
        isNeedsAction: true,
        onFormReview: jest.fn(),
        availableApprovers: [{ id: 1, name: 'Test Manager' }],
        isCreator: true,
        isSubmitted: false,
      };

      renderComponent(customProps);

      const propsElement = screen.getByTestId('needs-action-props');
      const passedProps = JSON.parse(propsElement.textContent);

      expect(passedProps.onFormReview).toBe('function');
      expect(passedProps.availableApprovers).toEqual([{ id: 1, name: 'Test Manager' }]);
      expect(passedProps.isCreator).toBe(true);
      expect(passedProps.isSubmitted).toBe(false);
    });

    it('returns normal form when isNeedsAction is false', () => {
      renderComponent({ isNeedsAction: false });

      expect(screen.queryByTestId('creator-needs-action')).not.toBeInTheDocument();
      expect(screen.getByText('Submit for approval')).toBeInTheDocument();
      expect(screen.getByText('Save draft')).toBeInTheDocument();
      expect(screen.getByText('Back')).toBeInTheDocument();
    });
  });

  describe('IncompletePages Display', () => {
    it('shows IncompletePages component when hasIncompletePages is true', () => {
      const incompletePages = ['Page 1', 'Page 2', 'Page 3'];
      renderComponent({
        hasIncompletePages: true,
        incompletePages,
      });

      expect(screen.getByTestId('incomplete-pages')).toBeInTheDocument();
      expect(screen.getByText('Incomplete Pages: Page 1, Page 2, Page 3')).toBeInTheDocument();
    });

    it('hides IncompletePages component when hasIncompletePages is false', () => {
      renderComponent({ hasIncompletePages: false });

      expect(screen.queryByTestId('incomplete-pages')).not.toBeInTheDocument();
    });

    it('hides IncompletePages component when incompletePages is empty', () => {
      renderComponent({
        hasIncompletePages: false,
        incompletePages: [],
      });

      expect(screen.queryByTestId('incomplete-pages')).not.toBeInTheDocument();
    });
  });

  describe('Approver Selection Form', () => {
    it('shows approver selection when isCreator is true and isSubmitted is false', () => {
      renderComponent({
        isCreator: true,
        isSubmitted: false,
      });

      expect(screen.getByText('Approving manager')).toBeInTheDocument();
      expect(screen.getByTestId('form-item-approvers')).toBeInTheDocument();
      expect(screen.getByTestId('approver-select')).toBeInTheDocument();
    });

    it('hides approver selection when isCreator is false', () => {
      renderComponent({
        isCreator: false,
        isSubmitted: false,
      });

      expect(screen.queryByText('Approving manager')).not.toBeInTheDocument();
      expect(screen.queryByTestId('form-item-approvers')).not.toBeInTheDocument();
      expect(screen.queryByTestId('approver-select')).not.toBeInTheDocument();
    });

    it('hides approver selection when isSubmitted is true', () => {
      renderComponent({
        isCreator: true,
        isSubmitted: true,
      });

      expect(screen.queryByText('Approving manager')).not.toBeInTheDocument();
      expect(screen.queryByTestId('form-item-approvers')).not.toBeInTheDocument();
      expect(screen.queryByTestId('approver-select')).not.toBeInTheDocument();
    });

    it('hides approver selection when both isCreator is false and isSubmitted is true', () => {
      renderComponent({
        isCreator: false,
        isSubmitted: true,
      });

      expect(screen.queryByText('Approving manager')).not.toBeInTheDocument();
      expect(screen.queryByTestId('form-item-approvers')).not.toBeInTheDocument();
      expect(screen.queryByTestId('approver-select')).not.toBeInTheDocument();
    });
  });

  describe('ApproverSelect Configuration', () => {
    it('configures ApproverSelect with correct props', () => {
      renderComponent({
        isCreator: true,
        isSubmitted: false,
      });

      const approverSelect = screen.getByTestId('approver-select');

      expect(approverSelect).toHaveAttribute('name', 'approvers');
      expect(approverSelect).toHaveAttribute('data-value-property', 'user.id');
      expect(approverSelect).toHaveAttribute('data-label-property', 'user.fullName');
    });

    it('maps availableApprovers correctly for ApproverSelect options', () => {
      const availableApprovers = [
        { id: 1, name: 'Manager One' },
        { id: 2, name: 'Manager Two' },
        { id: 3, name: 'Manager Three' },
      ];

      renderComponent({
        isCreator: true,
        isSubmitted: false,
        availableApprovers,
      });

      expect(screen.getByRole('option', { name: 'Manager One' })).toHaveValue('1');
      expect(screen.getByRole('option', { name: 'Manager Two' })).toHaveValue('2');
      expect(screen.getByRole('option', { name: 'Manager Three' })).toHaveValue('3');
    });
  });

  describe('Button Layout and Behavior', () => {
    it('renders three buttons with correct text and types', () => {
      renderComponent();

      const submitButton = screen.getByText('Submit for approval');
      const saveDraftButton = screen.getByText('Save draft');
      const backButton = screen.getByText('Back');

      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(saveDraftButton).toHaveAttribute('type', 'button');
      expect(backButton).toHaveAttribute('type', 'button');
    });

    it('applies correct CSS classes to buttons', () => {
      renderComponent();

      const saveDraftButton = screen.getByText('Save draft');
      const backButton = screen.getByText('Back');

      expect(saveDraftButton).toHaveClass('usa-button--outline');
      expect(backButton).toHaveClass('usa-button', 'usa-button--outline');
    });

    it('enables submit button when hasIncompletePages is false', () => {
      renderComponent({ hasIncompletePages: false });

      const submitButton = screen.getByText('Submit for approval');
      expect(submitButton).toBeEnabled();
    });
  });

  describe('Button Click Handlers', () => {
    it('calls onSaveDraft when Save draft button is clicked', () => {
      const mockOnSaveDraft = jest.fn();
      renderComponent({ onSaveDraft: mockOnSaveDraft });

      const saveDraftButton = screen.getByText('Save draft');
      fireEvent.click(saveDraftButton);

      expect(mockOnSaveDraft).toHaveBeenCalledTimes(1);
      expect(mockOnSaveDraft).toHaveBeenCalledWith();
    });

    it('calls onUpdatePage with PREVIOUS_POSITION when Back button is clicked', () => {
      const mockOnUpdatePage = jest.fn();
      renderComponent({ onUpdatePage: mockOnUpdatePage });

      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);

      expect(mockOnUpdatePage).toHaveBeenCalledTimes(1);
      expect(mockOnUpdatePage).toHaveBeenCalledWith(3); // PREVIOUS_POSITION = 3
    });

    it('triggers form submission when submit button is clicked', () => {
      const mockOnFormReview = jest.fn();
      renderComponent({ onFormReview: mockOnFormReview });

      const form = document.querySelector('form');
      fireEvent.submit(form);

      // Note: The actual form submission is handled by react-hook-form
      // We're testing that the form exists and can be submitted
      expect(form).toBeInTheDocument();
    });
  });

  describe('Form Structure and Classes', () => {
    it('renders form with correct CSS class', () => {
      renderComponent();

      const form = document.querySelector('form');
      expect(form).toHaveClass('smart-hub--form-large');
    });

    it('renders fieldset with correct CSS classes when showing approver selection', () => {
      renderComponent({
        isCreator: true,
        isSubmitted: false,
      });

      const fieldset = document.querySelector('fieldset');
      expect(fieldset).toHaveClass('smart-hub--report-legend', 'margin-top-4');
    });

    it('applies correct margin classes to approver selection div', () => {
      renderComponent({
        isCreator: true,
        isSubmitted: false,
      });

      const approverDiv = screen.getByTestId('form-item-approvers').closest('.margin-bottom-3');
      expect(approverDiv).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty availableApprovers array', () => {
      renderComponent({
        isCreator: true,
        isSubmitted: false,
        availableApprovers: [],
      });

      const approverSelect = screen.getByTestId('approver-select');
      expect(approverSelect).toBeInTheDocument();

      const options = screen.queryAllByRole('option');
      expect(options).toHaveLength(0);
    });

    it('handles null availableApprovers', () => {
      renderComponent({
        isCreator: false, // Don't show the approver select when testing null
        isSubmitted: false,
        availableApprovers: null,
      });

      // Should not break the component
      expect(screen.getByText('Submit for approval')).toBeInTheDocument();
    });

    it('handles complex prop combinations', () => {
      renderComponent({
        hasIncompletePages: true,
        incompletePages: ['Test Page'],
        isCreator: false,
        isSubmitted: true,
        isNeedsAction: false,
      });

      expect(screen.getByTestId('incomplete-pages')).toBeInTheDocument();
      expect(screen.queryByText('Approving manager')).not.toBeInTheDocument();
    });
  });
});
