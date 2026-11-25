import { renderHook } from '@testing-library/react-hooks';
import html2canvas from 'html2canvas';
import useMediaCapture from '../useMediaCapture';

jest.mock('moment', () => () => ({
  format: jest.fn(() => '2023-10-10'),
}));
jest.mock('html2canvas');

describe('useMediaCapture', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    html2canvas.mockResolvedValue({
      toDataURL: jest.fn(() => 'data:image/png;base64,test'),
    });
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    html2canvas.mockRejectedValue(new Error('test error'));

    const reference = { current: document.createElement('div') };
    const { result } = renderHook(() => useMediaCapture(reference));

    await result.current();

    expect(consoleSpy).toHaveBeenCalledWith(new Error('test error'));

    consoleSpy.mockRestore();
  });

  it('captures the full width of horizontally overflowing content', async () => {
    const reference = { current: document.createElement('div') };
    const scrollContainer = document.createElement('div');
    reference.current.appendChild(scrollContainer);
    Object.defineProperties(scrollContainer, {
      clientWidth: { value: 800 },
      scrollWidth: { value: 6000 },
    });
    Object.defineProperties(reference.current, {
      clientWidth: { value: 800 },
      scrollWidth: { value: 6000 },
    });

    const { result } = renderHook(() => useMediaCapture(reference));
    await result.current();

    const [, options] = html2canvas.mock.calls[0];
    options.onclone(document, reference.current);

    expect(scrollContainer.style.overflowX).toBe('visible');
    expect(scrollContainer.style.width).toBe('6000px');
    expect(reference.current.style.width).toBe('6000px');
  });
});
