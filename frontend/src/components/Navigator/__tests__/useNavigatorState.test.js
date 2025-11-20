import { renderHook } from '@testing-library/react-hooks';
import useNavigatorState from '../useNavigatorState';
import {
  IN_PROGRESS, COMPLETE,
} from '../constants';

const GOALS_AND_OBJECTIVES_POSITION = 2;

describe('useNavigatorState', () => {
  let mockHookForm;
  let mockPage;
  let mockGoalsAndObjectivesPage;

  beforeEach(() => {
    // Reset all mocks before each test
    mockHookForm = {
      getValues: jest.fn(),
      formState: {
        isDirty: false,
        isValid: true,
      },
      setValue: jest.fn(),
      watch: jest.fn().mockReturnValue({}),
    };

    mockPage = {
      position: 1,
      review: false,
      isPageComplete: jest.fn(),
    };

    mockGoalsAndObjectivesPage = {
      isPageComplete: jest.fn(),
    };
  });

  describe('recalculatePageState', () => {
    it('should mark goals page as complete when isPageComplete returns true', () => {
      // Setup
      mockHookForm.watch.mockReturnValue({
        [GOALS_AND_OBJECTIVES_POSITION]: IN_PROGRESS,
      });
      mockGoalsAndObjectivesPage.isPageComplete.mockReturnValue(true);

      // Render hook
      const { result } = renderHook(() => useNavigatorState({
        page: mockPage,
        goalsAndObjectivesPage: mockGoalsAndObjectivesPage,
        hookForm: mockHookForm,
      }));

      // Execute and verify
      const newState = result.current.newNavigatorState();
      expect(newState[GOALS_AND_OBJECTIVES_POSITION]).toBe(COMPLETE);
    });

    it('should mark goals page as in progress when on goals page and previously complete', () => {
      // Setup
      mockPage.position = GOALS_AND_OBJECTIVES_POSITION;
      mockHookForm.watch.mockReturnValue({
        [GOALS_AND_OBJECTIVES_POSITION]: COMPLETE,
      });
      mockGoalsAndObjectivesPage.isPageComplete.mockReturnValue(false);

      // Render hook
      const { result } = renderHook(() => useNavigatorState({
        page: mockPage,
        goalsAndObjectivesPage: mockGoalsAndObjectivesPage,
        hookForm: mockHookForm,
      }));

      // Execute and verify
      const newState = result.current.newNavigatorState();
      expect(newState[GOALS_AND_OBJECTIVES_POSITION]).toBe(IN_PROGRESS);
    });

    it('should preserve current state when not on goals page and not complete', () => {
      // Setup
      const currentState = IN_PROGRESS;
      mockHookForm.watch.mockReturnValue({
        [GOALS_AND_OBJECTIVES_POSITION]: currentState,
      });
      mockGoalsAndObjectivesPage.isPageComplete.mockReturnValue(false);

      // Render hook
      const { result } = renderHook(() => useNavigatorState({
        page: mockPage,
        goalsAndObjectivesPage: mockGoalsAndObjectivesPage,
        hookForm: mockHookForm,
      }));

      // Execute and verify
      const newState = result.current.newNavigatorState();
      expect(newState[GOALS_AND_OBJECTIVES_POSITION]).toBe(currentState);
    });
  });

  describe('updateGoalsObjectivesPageState', () => {
    it('should not update state if no savedData provided', () => {
      // Render hook
      const { result } = renderHook(() => useNavigatorState({
        page: mockPage,
        goalsAndObjectivesPage: mockGoalsAndObjectivesPage,
        hookForm: mockHookForm,
      }));

      // Execute
      result.current.updateGoalsObjectivesPageState(null);

      // Verify setValue was not called
      expect(mockHookForm.setValue).not.toHaveBeenCalled();
    });

    it('should update pageState to COMPLETE when goals page is complete', () => {
      // Setup
      const savedData = {
        pageState: { [GOALS_AND_OBJECTIVES_POSITION]: IN_PROGRESS },
      };
      mockGoalsAndObjectivesPage.isPageComplete.mockReturnValue(true);

      // Render hook
      const { result } = renderHook(() => useNavigatorState({
        page: mockPage,
        goalsAndObjectivesPage: mockGoalsAndObjectivesPage,
        hookForm: mockHookForm,
      }));

      // Execute
      result.current.updateGoalsObjectivesPageState(savedData);

      // Verify
      expect(mockHookForm.setValue).toHaveBeenCalledWith('pageState', {
        [GOALS_AND_OBJECTIVES_POSITION]: COMPLETE,
      });
    });

    it('should update pageState to IN_PROGRESS when goals page is incomplete', () => {
      // Setup
      const savedData = {
        pageState: { [GOALS_AND_OBJECTIVES_POSITION]: COMPLETE },
      };
      mockGoalsAndObjectivesPage.isPageComplete.mockReturnValue(false);

      // Render hook
      const { result } = renderHook(() => useNavigatorState({
        page: mockPage,
        goalsAndObjectivesPage: mockGoalsAndObjectivesPage,
        hookForm: mockHookForm,
      }));

      // Execute
      result.current.updateGoalsObjectivesPageState(savedData);

      // Verify
      expect(mockHookForm.setValue).toHaveBeenCalledWith('pageState', {
        [GOALS_AND_OBJECTIVES_POSITION]: IN_PROGRESS,
      });
    });
  });

  describe('newNavigatorState', () => {
    it('should return recalculated state for goals page or review', () => {
      // Setup
      mockPage.review = true;
      const mockState = { [GOALS_AND_OBJECTIVES_POSITION]: IN_PROGRESS };
      mockHookForm.watch.mockReturnValue(mockState);

      // Render hook
      const { result } = renderHook(() => useNavigatorState({
        page: mockPage,
        goalsAndObjectivesPage: mockGoalsAndObjectivesPage,
        hookForm: mockHookForm,
      }));

      // Execute and verify
      const newState = result.current.newNavigatorState();
      expect(newState).toEqual(mockState);
    });

    it('should mark current page as complete when isPageComplete returns true', () => {
      // Setup
      const currentPosition = 3;
      mockPage.position = currentPosition;
      mockPage.isPageComplete = jest.fn().mockReturnValue(true);
      mockHookForm.watch.mockReturnValue({
        [currentPosition]: IN_PROGRESS,
      });

      // Render hook
      const { result } = renderHook(() => useNavigatorState({
        page: mockPage,
        goalsAndObjectivesPage: mockGoalsAndObjectivesPage,
        hookForm: mockHookForm,
      }));

      // Execute and verify
      const newState = result.current.newNavigatorState();
      expect(newState[currentPosition]).toBe(COMPLETE);
    });

    it('should mark current page as in progress when previously complete but now invalid', () => {
      // Setup
      const currentPosition = 3;
      mockPage.position = currentPosition;
      mockPage.isPageComplete = jest.fn().mockReturnValue(false);
      mockHookForm.watch.mockReturnValue({
        [currentPosition]: COMPLETE,
      });

      // Render hook
      const { result } = renderHook(() => useNavigatorState({
        page: mockPage,
        goalsAndObjectivesPage: mockGoalsAndObjectivesPage,
        hookForm: mockHookForm,
      }));

      // Execute and verify
      const newState = result.current.newNavigatorState();
      expect(newState[currentPosition]).toBe(IN_PROGRESS);
    });

    it('should use form validity when page has no isPageComplete function', () => {
      // Setup
      const currentPosition = 3;
      mockPage.position = currentPosition;
      mockPage.isPageComplete = null;
      mockHookForm.formState.isValid = true;
      mockHookForm.watch.mockReturnValue({
        [currentPosition]: IN_PROGRESS,
      });

      // Render hook
      const { result } = renderHook(() => useNavigatorState({
        page: mockPage,
        goalsAndObjectivesPage: mockGoalsAndObjectivesPage,
        hookForm: mockHookForm,
      }));

      // Execute and verify
      const newState = result.current.newNavigatorState();
      expect(newState[currentPosition]).toBe(COMPLETE);
    });

    it('should consider form dirty state when determining in progress status', () => {
      // Setup
      const currentPosition = 3;
      mockPage.position = currentPosition;
      mockHookForm.formState.isDirty = true;
      mockHookForm.watch.mockReturnValue({
        [currentPosition]: IN_PROGRESS,
      });

      // Render hook
      const { result } = renderHook(() => useNavigatorState({
        page: mockPage,
        goalsAndObjectivesPage: mockGoalsAndObjectivesPage,
        hookForm: mockHookForm,
      }));

      // Execute and verify
      const newState = result.current.newNavigatorState();
      expect(newState[currentPosition]).toBe(IN_PROGRESS);
    });
  });
});
