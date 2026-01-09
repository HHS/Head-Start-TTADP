/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import supportingInformationPage from '../supportingInformation';

const { reviewSection } = supportingInformationPage;
const ReviewSection = () => reviewSection();

// Mock dependencies
jest.mock('react-helmet', () => ({
  Helmet: function MockHelmet({ children }) {
    return <div data-testid="helmet">{children}</div>;
  },
}));

jest.mock('../../../../components/Navigator/components/NavigatorButtons', () => function MockNavigatorButtons({
  isAppLoading,
  onContinue,
  onSaveDraft,
  onUpdatePage,
  path,
  position,
}) {
  return (
    <div data-testid="navigator-buttons">
      <div data-testid="nav-path">{path}</div>
      <div data-testid="nav-position">{position}</div>
      <div data-testid="nav-loading">{isAppLoading.toString()}</div>
      <button type="button" onClick={onContinue} data-testid="continue-btn">Continue</button>
      <button type="button" onClick={onSaveDraft} data-testid="save-draft-btn">Save Draft</button>
      <button type="button" onClick={() => onUpdatePage(1)} data-testid="update-page-btn">Update Page</button>
    </div>
  );
});

jest.mock('../../../../Constants', () => ({
  COLLAB_REPORT_DATA: {
    census_data: 'Census data',
    child_abuse_and_neglect: 'Child abuse and neglect',
    homelessness: 'Homelessness',
    other: 'Other',
  },
}));

// Test wrapper component
const TestWrapper = ({ children, defaultValues = {} }) => {
  const mergedDefaultValues = {
    reportGoals: [],
    dataUsed: [],
    ...defaultValues,
  };
  const methods = useForm({ defaultValues: mergedDefaultValues });
  return (
    <FormProvider {...methods}>
      {children}
    </FormProvider>
  );
};

describe('CR Supporting Information Page', () => {
  const mockAlert = () => <div data-testid="alert">Alert Component</div>;
  const mockOnContinue = jest.fn();
  const mockOnSaveDraft = jest.fn();
  const mockOnUpdatePage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Page Object Structure', () => {
    it('exports correct page metadata', () => {
      expect(supportingInformationPage.position).toBe(2);
      expect(supportingInformationPage.label).toBe('Supporting information');
      expect(supportingInformationPage.path).toBe('supporting-information');
      expect(supportingInformationPage.review).toBe(false);
    });

    it('exports reviewSection function', () => {
      expect(typeof supportingInformationPage.reviewSection).toBe('function');
    });

    it('exports render function', () => {
      expect(typeof supportingInformationPage.render).toBe('function');
    });
  });

  describe('SupportingInformation Component', () => {
    it('renders Helmet with correct title', () => {
      render(
        <TestWrapper>
          {supportingInformationPage.render(
            {},
            {},
            1,
            false,
            mockOnContinue,
            mockOnSaveDraft,
            mockOnUpdatePage,
            false,
            '',
            jest.fn(),
            mockAlert,
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId('helmet')).toBeInTheDocument();
      expect(screen.getByText('Supporting information')).toBeInTheDocument();
    });

    it('renders Alert component', () => {
      render(
        <TestWrapper>
          {supportingInformationPage.render(
            {},
            {},
            1,
            false,
            mockOnContinue,
            mockOnSaveDraft,
            mockOnUpdatePage,
            false,
            '',
            jest.fn(),
            mockAlert,
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });

    it('renders NavigatorButtons with correct props', () => {
      render(
        <TestWrapper>
          {supportingInformationPage.render(
            {},
            {},
            1,
            true, // isAppLoading
            mockOnContinue,
            mockOnSaveDraft,
            mockOnUpdatePage,
            false,
            '',
            jest.fn(),
            mockAlert,
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId('navigator-buttons')).toBeInTheDocument();
      expect(screen.getByTestId('nav-path')).toHaveTextContent('supporting-information');
      expect(screen.getByTestId('nav-position')).toHaveTextContent('2');
      expect(screen.getByTestId('nav-loading')).toHaveTextContent('true');
    });

    it('passes function props to NavigatorButtons correctly', () => {
      render(
        <TestWrapper>
          {supportingInformationPage.render(
            {},
            {},
            1,
            false,
            mockOnContinue,
            mockOnSaveDraft,
            mockOnUpdatePage,
            false,
            '',
            jest.fn(),
            mockAlert,
          )}
        </TestWrapper>,
      );

      const continueBtn = screen.getByTestId('continue-btn');
      const saveDraftBtn = screen.getByTestId('save-draft-btn');
      const updatePageBtn = screen.getByTestId('update-page-btn');

      continueBtn.click();
      saveDraftBtn.click();
      updatePageBtn.click();

      expect(mockOnContinue).toHaveBeenCalledTimes(1);
      expect(mockOnSaveDraft).toHaveBeenCalledTimes(1);
      expect(mockOnUpdatePage).toHaveBeenCalledTimes(1);
      expect(mockOnUpdatePage).toHaveBeenCalledWith(1);
    });

    it('renders correctly', async () => {
      const formData = {
        goals: [{ label: 'Test Goal', value: 'test_goal' }],
        dataUsed: [{ label: 'Census Data', value: 'census_data' }, { label: 'Other', value: 'other' }],
        otherDataUsed: 'Custom Data',
        participants: [{ label: 'Head Start Recipients', value: 'Head Start Recipients' }, { label: 'Other', value: 'Other' }],
        otherParticipants: 'Custom Participant',
      };

      render(
        <TestWrapper defaultValues={formData}>
          {supportingInformationPage.render(
            {},
            {},
            1,
            false,
            mockOnContinue,
            mockOnSaveDraft,
            mockOnUpdatePage,
            false,
            '',
            jest.fn(),
            mockAlert,
          )}
        </TestWrapper>,
      );

      expect(screen.getByText('Supporting information')).toBeInTheDocument();

      // Check Participants exists
      const participantsSelect = screen.getByText('Who participated in the activity?');
      expect(participantsSelect).toBeInTheDocument();
      userEvent.click(participantsSelect);
      expect(screen.getByText('Head Start Recipients')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
      userEvent.click(screen.getByText('Other'));
      const otherParticipantsInput = screen.getByText('Others who participated').closest('fieldset').querySelector('input');
      expect(otherParticipantsInput).toBeInTheDocument();

      // Check Data Collected/Shared exists
      const dataUsed = screen.getByText('Did you collect, use, and/or share data during this activity?');
      expect(dataUsed).toBeInTheDocument();

      // Check Goals exists
      const goalsSelect = screen.getByText('Does the content of this activity help recipients in your region support their goals?');
      expect(goalsSelect).toBeInTheDocument();
    });
  });

  describe('ReviewSection Component', () => {
    it('renders correctly', () => {
      const formData = {
        goals: [{ label: 'Test Goal', value: 'test_goal' }],
        dataUsed: [{ label: 'Census Data', value: 'census_data' }, { label: 'Other', value: 'other' }],
        otherDataUsed: 'Custom Data',
        participants: [{ label: 'State', value: 'State' }, { label: 'Other', value: 'Other' }],
        otherParticipants: 'Custom Participant',
      };

      render(
        <TestWrapper defaultValues={formData}>
          <ReviewSection />
        </TestWrapper>,
      );

      const participantsSection = screen.getByText('Participants');
      expect(participantsSection).toBeInTheDocument();
      const participantsText = screen.getByText('State, Other: Custom Participant');
      expect(participantsText).toBeInTheDocument();

      const dataSection = screen.getByText('Data collected/shared');
      expect(dataSection).toBeInTheDocument();
      const dataText = screen.getByText('Census Data, Other: Custom Data');
      expect(dataText).toBeInTheDocument();

      const goalsSection = screen.getByText('Supporting goals');
      expect(goalsSection).toBeInTheDocument();
      const goalsText = screen.getByText('Test Goal');
      expect(goalsText).toBeInTheDocument();
    });

    it('handles empty fields gracefully', () => {
      const formData = {
        goals: [],
        dataUsed: [],
        otherDataUsed: '',
        participants: [],
        otherParticipants: '',
      };

      render(
        <TestWrapper defaultValues={formData}>
          <ReviewSection />
        </TestWrapper>,
      );

      const participantsSection = screen.getByText('Participants');
      expect(participantsSection).toBeInTheDocument();
      const participantsText = screen.getByText('None provided');
      expect(participantsText).toBeInTheDocument();

      const dataSection = screen.getByText('Data collected/shared');
      expect(dataSection).toBeInTheDocument();
      const dataText = screen.getAllByText('None')[0];
      expect(dataText).toBeInTheDocument();

      const goalsSection = screen.getByText('Supporting goals');
      expect(goalsSection).toBeInTheDocument();
      const goalsText = screen.getAllByText('None')[1];
      expect(goalsText).toBeInTheDocument();
    });
  });
});
