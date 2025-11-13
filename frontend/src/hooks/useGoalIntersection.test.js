import { renderHook, act } from '@testing-library/react-hooks';
import useGoalIntersection from './useGoalIntersection';

describe('useGoalIntersection', () => {
  let mockIntersectionObserver;
  let observerCallback;

  const mockGoals = [
    { id: 1, name: 'Improve program quality (health services)', status: 'In Progress' },
    { id: 2, name: 'Increase enrollment (family engagement)', status: 'Draft' },
    { id: 3, name: 'Enhance staff capacity (professional development)', status: 'In Progress' },
  ];

  beforeEach(() => {
    observerCallback = null;

    // Mock IntersectionObserver
    mockIntersectionObserver = jest.fn((callback) => {
      observerCallback = callback;
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    });

    global.IntersectionObserver = mockIntersectionObserver;

    // Mock DOM elements with data-goal-index attribute
    document.querySelectorAll = jest.fn(() => [
      { getAttribute: () => '0' },
      { getAttribute: () => '1' },
      { getAttribute: () => '2' },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null values when no goals are provided', () => {
    const { result } = renderHook(() => useGoalIntersection([]));

    expect(result.current.currentGoalIndex).toBeNull();
    expect(result.current.totalGoals).toBe(0);
    expect(result.current.goalLabel).toBeNull();
    expect(result.current.isVisible).toBe(false);
  });

  it('initializes with correct total goals count', () => {
    const { result } = renderHook(() => useGoalIntersection(mockGoals));

    expect(result.current.totalGoals).toBe(3);
  });

  it('creates IntersectionObserver with default options', () => {
    renderHook(() => useGoalIntersection(mockGoals));

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        threshold: 0.4,
        rootMargin: '-80px 0px -40% 0px',
      }),
    );
  });

  it('creates IntersectionObserver with custom options', () => {
    const customOptions = {
      threshold: 0.5,
      rootMargin: '-100px 0px 0px 0px',
    };

    renderHook(() => useGoalIntersection(mockGoals, customOptions));

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        threshold: 0.5,
        rootMargin: '-100px 0px 0px 0px',
      }),
    );
  });

  it('extracts parenthetical text from goal name', () => {
    const { result } = renderHook(() => useGoalIntersection(mockGoals));

    // Simulate intersection with first goal
    const mockEntries = [
      {
        target: { getAttribute: () => '0' },
        isIntersecting: true,
        intersectionRatio: 0.8,
      },
    ];

    act(() => {
      observerCallback(mockEntries);
    });

    expect(result.current.currentGoalIndex).toBe(1); // 1-based index
    expect(result.current.goalLabel).toBe('health services');
  });

  it('returns null for goal label when no parentheses in name', () => {
    const goalsWithoutParentheses = [
      { id: 1, name: 'Improve program quality', status: 'In Progress' },
    ];

    const { result } = renderHook(() => useGoalIntersection(goalsWithoutParentheses));

    const mockEntries = [
      {
        target: { getAttribute: () => '0' },
        isIntersecting: true,
        intersectionRatio: 0.8,
      },
    ];

    act(() => {
      observerCallback(mockEntries);
    });

    expect(result.current.goalLabel).toBeNull();
  });

  it('converts 0-based index to 1-based for currentGoalIndex', () => {
    const { result } = renderHook(() => useGoalIntersection(mockGoals));

    // Simulate intersection with second goal (index 1)
    const mockEntries = [
      {
        target: { getAttribute: () => '1' },
        isIntersecting: true,
        intersectionRatio: 0.8,
      },
    ];

    act(() => {
      observerCallback(mockEntries);
    });

    expect(result.current.currentGoalIndex).toBe(2); // 1-based
  });

  it('sets isVisible to true when a goal is intersecting', () => {
    const { result } = renderHook(() => useGoalIntersection(mockGoals));

    // Initially not visible
    expect(result.current.isVisible).toBe(false);

    const mockEntries = [
      {
        target: { getAttribute: () => '0' },
        isIntersecting: true,
        intersectionRatio: 0.8,
      },
    ];

    act(() => {
      observerCallback(mockEntries);
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('handles multiple goals intersecting and selects highest ratio', () => {
    const { result } = renderHook(() => useGoalIntersection(mockGoals));

    // Simulate multiple goals visible, second has highest ratio
    const mockEntries = [
      {
        target: { getAttribute: () => '0' },
        isIntersecting: true,
        intersectionRatio: 0.3,
      },
      {
        target: { getAttribute: () => '1' },
        isIntersecting: true,
        intersectionRatio: 0.8,
      },
      {
        target: { getAttribute: () => '2' },
        isIntersecting: true,
        intersectionRatio: 0.2,
      },
    ];

    act(() => {
      observerCallback(mockEntries);
    });

    expect(result.current.currentGoalIndex).toBe(2); // Index 1 (second goal) in 1-based
    expect(result.current.goalLabel).toBe('family engagement');
  });

  it('handles goal scrolling out of view', () => {
    const { result } = renderHook(() => useGoalIntersection(mockGoals));

    // Goal enters view
    act(() => {
      observerCallback([
        {
          target: { getAttribute: () => '0' },
          isIntersecting: true,
          intersectionRatio: 0.8,
        },
      ]);
    });

    // Goal exits view
    act(() => {
      observerCallback([
        {
          target: { getAttribute: () => '0' },
          isIntersecting: false,
          intersectionRatio: 0,
        },
      ]);
    });

    expect(result.current.currentGoalIndex).toBeNull();
  });
});
