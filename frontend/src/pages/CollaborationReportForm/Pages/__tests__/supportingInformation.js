/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import supportingInformationPage from '../supportingInformation';

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

jest.mock('../../../ActivityReport/Pages/Review/ReviewPage', () => function MockReviewPage({ sections, path, isCustomValue }) {
  return (
    <div data-testid="review-page">
      <div data-testid="review-page-path">{path}</div>
      <div data-testid="review-page-custom-value">{isCustomValue.toString()}</div>
      <div data-testid="review-page-sections">{JSON.stringify(sections)}</div>
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
  });

  describe('ReviewSection Component', () => {
    it('processes goals correctly', () => {
      const formData = {
        goals: [
          { label: 'Goal 1', value: 'goal_1' },
          { label: 'Goal 2', value: 'goal_2' },
          { label: 'Goal 3', value: 'goal_3' },
        ],
        dataUsed: [],
      };

      render(
        <TestWrapper defaultValues={formData}>
          {supportingInformationPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      const goalsItem = sectionsData[0].items.find((item) => item.name === 'goals');
      expect(goalsItem.customValue.goals).toBe('Goal 1, Goal 2, Goal 3');
    });

    it('processes dataUsed with COLLAB_REPORT_DATA lookup', () => {
      const formData = {
        goals: [],
        dataUsed: [
          { label: 'Census data', value: 'census_data' },
          { label: 'Homelessness', value: 'homelessness' },
        ],
      };

      render(
        <TestWrapper defaultValues={formData}>
          {supportingInformationPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      const dataItem = sectionsData[0].items.find((item) => item.name === 'data');
      expect(dataItem.customValue.data).toBe('Census data, Homelessness');
    });

    it('handles "other" data type with otherDataUsed', () => {
      const formData = {
        goals: [],
        dataUsed: [
          { label: 'Census data', value: 'census_data' },
          { label: 'Other', value: 'other' },
        ],
        otherDataUsed: 'Custom data type',
      };

      render(
        <TestWrapper defaultValues={formData}>
          {supportingInformationPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      const dataItem = sectionsData[0].items.find((item) => item.name === 'data');
      expect(dataItem.customValue.data).toBe('Census data, Other: Custom data type');
    });

    it('handles unknown data types gracefully', () => {
      const formData = {
        goals: [],
        dataUsed: [
          { label: 'unknown_data', value: 'unknown_data' },
          { label: 'Census data', value: 'census_data' },
        ],
      };

      render(
        <TestWrapper defaultValues={formData}>
          {supportingInformationPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      const dataItem = sectionsData[0].items.find((item) => item.name === 'data');
      expect(dataItem.customValue.data).toBe(', Census data');
    });

    it('builds sections structure correctly', () => {
      const formData = {
        goals: [{ label: 'Test Goal', value: 'test_goal' }],
        dataUsed: [{ label: 'census_data', value: 'census_data' }],
        participants: ['State', 'Other'],
      };

      render(
        <TestWrapper defaultValues={formData}>
          {supportingInformationPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      expect(sectionsData).toHaveLength(1);
      expect(sectionsData[0].anchor).toBe('support-information');
      expect(sectionsData[0].items).toHaveLength(3);

      const { items } = sectionsData[0];
      expect(items[0].label).toBe('Participants');
      expect(items[0].name).toBe('participants');
      expect(items[1].label).toBe('Data collected/shared');
      expect(items[1].name).toBe('data');
      expect(items[2].label).toBe('Supporting goals');
      expect(items[2].name).toBe('goals');
    });

    it('renders ReviewPage with correct props', () => {
      const formData = {
        goals: [],
        dataUsed: [],
      };

      render(
        <TestWrapper defaultValues={formData}>
          {supportingInformationPage.reviewSection()}
        </TestWrapper>,
      );

      expect(screen.getByTestId('review-page')).toBeInTheDocument();
      expect(screen.getByTestId('review-page-path')).toHaveTextContent('supporting-information');
      expect(screen.getByTestId('review-page-custom-value')).toHaveTextContent('true');
    });
  });

  describe('Data Processing Edge Cases', () => {
    it('handles empty goals array', () => {
      const formData = {
        reportGoals: [],
        dataUsed: [],
      };

      render(
        <TestWrapper defaultValues={formData}>
          {supportingInformationPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      const goalsItem = sectionsData[0].items.find((item) => item.name === 'goals');
      expect(goalsItem.customValue.goals).toBe('None provided');
    });

    it('handles empty dataUsed array', () => {
      const formData = {
        reportGoals: [],
        dataUsed: [],
      };

      render(
        <TestWrapper defaultValues={formData}>
          {supportingInformationPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      const dataItem = sectionsData[0].items.find((item) => item.name === 'data');
      expect(dataItem.customValue.data).toBe('None provided');
    });

    it('handles null/undefined form data', () => {
      render(
        <TestWrapper defaultValues={{}}>
          {supportingInformationPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      const goalsItem = sectionsData[0].items.find((item) => item.name === 'goals');
      const dataItem = sectionsData[0].items.find((item) => item.name === 'data');

      expect(goalsItem.customValue.goals).toBe('None provided');
      expect(dataItem.customValue.data).toBe('None provided');
    });
  });

  describe('Participants Section', () => {
    it('always includes participants item with empty customValue', () => {
      const formData = {
        reportGoals: [],
        dataUsed: [],
        participants: [],
      };

      render(
        <TestWrapper defaultValues={formData}>
          {supportingInformationPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      const participantsItem = sectionsData[0].items.find((item) => item.name === 'participants');
      expect(participantsItem.label).toBe('Participants');
      expect(participantsItem.customValue.participants).toBe('None provided');
    });
  });
});
