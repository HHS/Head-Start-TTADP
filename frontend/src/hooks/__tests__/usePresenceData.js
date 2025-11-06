import { renderHook, act } from '@testing-library/react-hooks';
import usePresenceData from '../usePresenceData';

describe('usePresenceData', () => {
  let mockSetShouldAutoSave;

  beforeEach(() => {
    mockSetShouldAutoSave = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default presence data', () => {
    const { result } = renderHook(() => usePresenceData(mockSetShouldAutoSave));

    expect(result.current.presenceData).toEqual({
      hasMultipleUsers: false,
      otherUsers: [],
      tabCount: 0,
    });
    expect(typeof result.current.setPresenceData).toBe('function');
    expect(typeof result.current.handlePresenceUpdate).toBe('function');
  });

  it('should enable auto-save when no multiple users and tab count is 1 or less', () => {
    renderHook(() => usePresenceData(mockSetShouldAutoSave));

    expect(mockSetShouldAutoSave).toHaveBeenCalledWith(true);
  });

  it('should disable auto-save when hasMultipleUsers is true with other users', () => {
    const { result } = renderHook(() => usePresenceData(mockSetShouldAutoSave));

    act(() => {
      result.current.handlePresenceUpdate({
        hasMultipleUsers: true,
        otherUsers: [{ username: 'testuser' }],
        tabCount: 1,
      });
    });

    expect(mockSetShouldAutoSave).toHaveBeenCalledWith(false);
  });

  it('should disable auto-save when tab count is greater than 1', () => {
    const { result } = renderHook(() => usePresenceData(mockSetShouldAutoSave));

    act(() => {
      result.current.handlePresenceUpdate({
        hasMultipleUsers: false,
        otherUsers: [],
        tabCount: 2,
      });
    });

    expect(mockSetShouldAutoSave).toHaveBeenCalledWith(false);
  });

  it('should enable auto-save when hasMultipleUsers is true but no other users', () => {
    const { result } = renderHook(() => usePresenceData(mockSetShouldAutoSave));

    act(() => {
      result.current.handlePresenceUpdate({
        hasMultipleUsers: true,
        otherUsers: [],
        tabCount: 1,
      });
    });

    expect(mockSetShouldAutoSave).toHaveBeenCalledWith(true);
  });

  it('should handle other users without usernames', () => {
    const { result } = renderHook(() => usePresenceData(mockSetShouldAutoSave));

    act(() => {
      result.current.handlePresenceUpdate({
        hasMultipleUsers: true,
        otherUsers: [{ username: null }, { username: 'testuser' }],
        tabCount: 1,
      });
    });

    expect(mockSetShouldAutoSave).toHaveBeenCalledWith(false);
  });

  it('should deduplicate usernames in otherUsers array', () => {
    const { result } = renderHook(() => usePresenceData(mockSetShouldAutoSave));

    act(() => {
      result.current.handlePresenceUpdate({
        hasMultipleUsers: true,
        otherUsers: [
          { username: 'testuser' },
          { username: 'testuser' },
          { username: 'anotheruser' },
        ],
        tabCount: 1,
      });
    });

    expect(mockSetShouldAutoSave).toHaveBeenCalledWith(false);
  });

  it('should update presence data when handlePresenceUpdate is called', () => {
    const { result } = renderHook(() => usePresenceData(mockSetShouldAutoSave));

    const newData = {
      hasMultipleUsers: true,
      otherUsers: [{ username: 'testuser' }],
      tabCount: 2,
    };

    act(() => {
      result.current.handlePresenceUpdate(newData);
    });

    expect(result.current.presenceData).toEqual(newData);
  });

  it('should allow direct setPresenceData updates', () => {
    const { result } = renderHook(() => usePresenceData(mockSetShouldAutoSave));

    const newData = {
      hasMultipleUsers: false,
      otherUsers: [],
      tabCount: 3,
    };

    act(() => {
      result.current.setPresenceData(newData);
    });

    expect(result.current.presenceData).toEqual(newData);
    expect(mockSetShouldAutoSave).toHaveBeenCalledWith(false);
  });

  it('should handle complex scenario with multiple users and high tab count', () => {
    const { result } = renderHook(() => usePresenceData(mockSetShouldAutoSave));

    act(() => {
      result.current.handlePresenceUpdate({
        hasMultipleUsers: true,
        otherUsers: [
          { username: 'user1' },
          { username: 'user2' },
          { username: null },
        ],
        tabCount: 3,
      });
    });

    expect(mockSetShouldAutoSave).toHaveBeenCalledWith(false);
  });

  it('should re-enable auto-save when conditions change back to safe state', () => {
    const { result } = renderHook(() => usePresenceData(mockSetShouldAutoSave));

    // First disable auto-save
    act(() => {
      result.current.handlePresenceUpdate({
        hasMultipleUsers: true,
        otherUsers: [{ username: 'testuser' }],
        tabCount: 1,
      });
    });

    expect(mockSetShouldAutoSave).toHaveBeenCalledWith(false);

    // Then re-enable it
    act(() => {
      result.current.handlePresenceUpdate({
        hasMultipleUsers: false,
        otherUsers: [],
        tabCount: 1,
      });
    });

    expect(mockSetShouldAutoSave).toHaveBeenCalledWith(true);
  });
});
