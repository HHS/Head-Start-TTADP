/* eslint-disable max-len */
import { renderHook, act } from '@testing-library/react-hooks';
import useAsyncWidgetExport from '../useAsyncWidgetExport';
import { blobToCsvDownload, checkboxesToIds } from '../../utils';
import { IS, NOOP } from '../../Constants';

jest.mock('../../utils', () => ({
  blobToCsvDownload: jest.fn(),
  checkboxesToIds: jest.fn(),
}));

describe('useAsyncWidgetExport', () => {
  const mockFetcher = jest.fn();
  const mockCheckboxes = [{ id: 1 }, { id: 2 }];
  const mockExportName = 'test-export';
  const mockSortConfig = { sortBy: 'name', direction: 'asc' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call fetcher with correct parameters when exportType is "selected"', async () => {
    checkboxesToIds.mockReturnValue([1, 2]);
    const { result } = renderHook(() => useAsyncWidgetExport(mockCheckboxes, mockExportName, mockSortConfig, mockFetcher));

    await act(async () => {
      await result.current.exportRows('selected');
    });

    expect(mockFetcher).toHaveBeenCalledWith(
      'name',
      'asc',
      0,
      false,
      [{ topic: 'id', condition: IS, query: [1, 2] }],
      'csv',
    );
    expect(blobToCsvDownload).toHaveBeenCalled();
  });

  it('should call fetcher with correct parameters when exportType is not "selected"', async () => {
    const { result } = renderHook(() => useAsyncWidgetExport(mockCheckboxes, mockExportName, mockSortConfig, mockFetcher));

    await act(async () => {
      await result.current.exportRows('all');
    });

    expect(mockFetcher).toHaveBeenCalledWith(
      'name',
      'asc',
      0,
      false,
      [],
      'csv',
    );
    expect(blobToCsvDownload).toHaveBeenCalled();
  });

  it('should handle fetcher error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(NOOP);
    mockFetcher.mockRejectedValue(new Error('Fetch error'));

    const { result } = renderHook(() => useAsyncWidgetExport(mockCheckboxes, mockExportName, mockSortConfig, mockFetcher));

    await act(async () => {
      await result.current.exportRows('all');
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Fetch error'));
    consoleErrorSpy.mockRestore();
  });
});
