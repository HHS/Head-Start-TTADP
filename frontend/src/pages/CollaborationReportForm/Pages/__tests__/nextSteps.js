/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import nextStepsPage, { isPageComplete } from '../nextSteps';

// Mock dependencies
jest.mock('react-helmet', () => ({
  Helmet: function MockHelmet({ children }) {
    return <div data-testid="helmet">{children}</div>;
  },
}));

jest.mock('../../../ActivityReport/Pages/Review/ReviewPage', () => function MockReviewPage({ sections, path }) {
  return (
    <div data-testid="review-page">
      <div data-testid="review-page-path">{path}</div>
      <div data-testid="review-page-sections">{JSON.stringify(sections)}</div>
    </div>
  );
});

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
      <button onClick={onContinue} type="button" data-testid="continue-btn">Continue</button>
      <button onClick={onSaveDraft} type="button" data-testid="save-draft-btn">Save Draft</button>
      <button onClick={() => onUpdatePage(1)} type="button" data-testid="update-page-btn">Update Page</button>
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

describe('nextSteps Page', () => {
  const mockAlert = () => <div data-testid="alert">Alert Component</div>;
  const mockOnContinue = jest.fn();
  const mockOnSaveDraft = jest.fn();
  const mockOnUpdatePage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Page Object Structure', () => {
    it('exports correct page metadata', () => {
      expect(nextStepsPage.position).toBe(3);
      expect(nextStepsPage.label).toBe('Next steps');
      expect(nextStepsPage.path).toBe('next-steps');
      expect(nextStepsPage.review).toBe(false);
    });

    it('exports reviewSection function', () => {
      expect(typeof nextStepsPage.reviewSection).toBe('function');
    });

    it('exports render function', () => {
      expect(typeof nextStepsPage.render).toBe('function');
    });
  });

  describe('isPageComplete Function', () => {
    it('returns true if at least one valid step', () => {
      const hookForm = {
        getValues: () => ({
          steps: [
            { collabStepDetail: 'Step 1 detail', collabStepCompleteDate: '2024-01-15' },
          ],
        }),
      };

      expect(isPageComplete(hookForm)).toBe(true);
    });

    it('returns false if steps is undefined', () => {
      const hookForm = {
        getValues: () => ({
          steps: undefined,
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });
  });

  describe('NextSteps Component', () => {
    it('renders Helmet with correct title', () => {
      render(
        <TestWrapper>
          {nextStepsPage.render(
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
      expect(screen.getByText('Next Steps')).toBeInTheDocument();
    });

    it('renders Alert component', () => {
      render(
        <TestWrapper>
          {nextStepsPage.render(
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
          {nextStepsPage.render(
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
      expect(screen.getByTestId('nav-path')).toHaveTextContent('next-steps');
      expect(screen.getByTestId('nav-position')).toHaveTextContent('3');
      expect(screen.getByTestId('nav-loading')).toHaveTextContent('true');
    });

    it('passes function props to NavigatorButtons correctly', () => {
      render(
        <TestWrapper>
          {nextStepsPage.render(
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

  describe('getNextStepsSections Function', () => {
    it('transforms steps data correctly', () => {
      const steps = [
        {
          collabStepDetail: 'First step detail',
          collabStepCompleteDate: '2024-01-15',
        },
        {
          collabStepDetail: 'Second step detail',
          collabStepCompleteDate: '2024-02-15',
        },
      ];

      render(
        <TestWrapper defaultValues={{ steps }}>
          {nextStepsPage.reviewSection()}
        </TestWrapper>,
      );

      const reviewPage = screen.getByTestId('review-page');
      expect(reviewPage).toBeInTheDocument();
      expect(screen.getByTestId('review-page-path')).toHaveTextContent('next-steps');

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      expect(sectionsData).toHaveLength(1);
      // needs to be false to prevent two edit buttons showing
      expect(sectionsData[0].isEditSection).toBe(false);
      expect(sectionsData[0].anchor).toBe('next-steps');
      expect(sectionsData[0].items).toHaveLength(4); // 2 steps × 2 items each
    });

    it('handles empty steps array', () => {
      render(
        <TestWrapper defaultValues={{ steps: [] }}>
          {nextStepsPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      const { items } = sectionsData[0];
      expect(items).toHaveLength(2); // 1 step with "none provided" values

      expect(items[0]).toEqual({
        label: 'Step 1',
        name: 'step',
        customValue: { step: 'None provided' },
      });
      expect(items[1]).toEqual({
        label: 'Anticipated completion',
        name: 'date',
        customValue: { date: 'None provided' },
      });
    });

    it('handles null steps', () => {
      render(
        <TestWrapper defaultValues={{ steps: null }}>
          {nextStepsPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      expect(sectionsData[0].items).toHaveLength(2); // 1 step with "none provided" values
    });

    it('creates correct step items structure', () => {
      const steps = [
        {
          collabStepDetail: 'Test step',
          collabStepCompleteDate: '2024-01-15',
        },
      ];

      render(
        <TestWrapper defaultValues={{ steps }}>
          {nextStepsPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      const { items } = sectionsData[0];

      expect(items[0]).toEqual({
        label: 'Step 1',
        name: 'step',
        customValue: { step: 'Test step' },
      });
      expect(items[1]).toEqual({
        label: 'Anticipated completion',
        name: 'date',
        customValue: { date: '2024-01-15' },
      });
    });

    it('creates correct step numbering for multiple steps', () => {
      const steps = [
        { collabStepDetail: 'First', collabStepCompleteDate: '2024-01-15' },
        { collabStepDetail: 'Second', collabStepCompleteDate: '2024-02-15' },
        { collabStepDetail: 'Third', collabStepCompleteDate: '2024-03-15' },
      ];

      render(
        <TestWrapper defaultValues={{ steps }}>
          {nextStepsPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      const { items } = sectionsData[0];

      expect(items[0].label).toBe('Step 1');
      expect(items[2].label).toBe('Step 2');
      expect(items[4].label).toBe('Step 3');
    });
  });

  describe('ReviewSection Component', () => {
    it('uses useFormContext watch correctly', () => {
      const steps = [
        { collabStepDetail: 'Watch test', collabStepCompleteDate: '2024-01-15' },
      ];

      render(
        <TestWrapper defaultValues={{ steps }}>
          {nextStepsPage.reviewSection()}
        </TestWrapper>,
      );

      expect(screen.getByTestId('review-page')).toBeInTheDocument();
      expect(screen.getByTestId('review-page-path')).toHaveTextContent('next-steps');
    });

    it('renders ReviewPage with correct props', () => {
      const steps = [
        { collabStepDetail: 'Review test', collabStepCompleteDate: '2024-01-15' },
      ];

      render(
        <TestWrapper defaultValues={{ steps }}>
          {nextStepsPage.reviewSection()}
        </TestWrapper>,
      );

      const reviewPage = screen.getByTestId('review-page');
      expect(reviewPage).toBeInTheDocument();
      expect(screen.getByTestId('review-page-path')).toHaveTextContent('next-steps');
    });
  });

  describe('Edge Cases', () => {
    it('handles steps with missing properties', () => {
      const steps = [
        { collabStepDetail: 'Only detail' },
        { collabStepCompleteDate: '2024-01-15' },
        {},
      ];

      render(
        <TestWrapper defaultValues={{ steps }}>
          {nextStepsPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      const { items } = sectionsData[0];

      expect(items).toHaveLength(6); // 3 steps × 2 items each
      expect(items[0].customValue.step).toBe('Only detail');
      expect(items[1].customValue.date).toBeUndefined();
      expect(items[2].customValue.step).toBeUndefined();
      expect(items[3].customValue.date).toBe('2024-01-15');
    });

    it('handles undefined steps in form data', () => {
      render(
        <TestWrapper defaultValues={{}}>
          {nextStepsPage.reviewSection()}
        </TestWrapper>,
      );

      const sectionsData = JSON.parse(screen.getByTestId('review-page-sections').textContent);
      const { items } = sectionsData[0];
      expect(items).toHaveLength(2); // 1 step with "none provided" values

      expect(items[0]).toEqual({
        label: 'Step 1',
        name: 'step',
        customValue: { step: 'None provided' },
      });
      expect(items[1]).toEqual({
        label: 'Anticipated completion',
        name: 'date',
        customValue: { date: 'None provided' },
      });
    });
  });
});
