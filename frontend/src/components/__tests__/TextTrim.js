import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act,
} from '@testing-library/react';
import TextTrim from '../TextTrim';

describe('TextTrim', () => {
  const mockGetComputedStyle = () => ({
    paddingLeft: '10px',
    paddingRight: '10px',
  });

  beforeAll(() => {
    window.getComputedStyle = mockGetComputedStyle;
  });

  beforeEach(() => {
    // Reset all mocked offsetWidth values before each test
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        return 100;
      },
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  const renderTextTrim = (text) => {
    render(<div data-testid="text-trim-container"><TextTrim text={text} /></div>);
  };

  it('renders text without tooltip when text fits container', async () => {
    // Mock element widths to simulate text fitting in container
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        if (this.className && this.className.includes('text-trim-tooltip')) return 50;
        return 100;
      },
    });

    renderTextTrim('Short text');

    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
    expect(screen.getByText('Short text', { selector: 'span[style*="display: block"]' })).toBeVisible();
  });

  it('renders tooltip when text is truncated', async () => {
    // Mock element widths to simulate text overflow
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(function mock() {
        if (this.style.visibility === 'hidden') return 150;
        if (this.className.includes('text-trim-tooltip')) return 50;
        return 100;
      });

    const longText = 'This is a very long text that should definitely get truncated in the container';
    renderTextTrim(longText);

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent(longText);
  });

  it('handles empty text properly', () => {
    renderTextTrim('');
    // Look specifically for the visible text span
    expect(screen.getByText('', { selector: 'span[style*="display: block"]' })).toBeInTheDocument();
  });

  it('updates truncation on window resize', async () => {
    // Initially mock text as fitting
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(() => 100);

    renderTextTrim('Resizable text');

    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();

    // Mock text as overflowing after resize
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(function mock() {
        if (this.style.visibility === 'hidden') return 150;
        if (this.className.includes('text-trim-tooltip')) return 50;
        return 100;
      });

    // Trigger resize event
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('calculates available width correctly accounting for padding', () => {
    // Mock element widths including container with padding
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(function mock() {
        if (this.style.visibility === 'hidden') return 150;
        if (this.className.includes('text-trim-tooltip')) return 50;
        return 120; // Container width including padding
      });

    const text = 'Text to test padding calculation';
    renderTextTrim(text);

    // With 10px padding on each side (from mockGetComputedStyle),
    // available width should be 100px (120px - 20px padding)
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('cleans up resize event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = render(<TextTrim text="Test cleanup" />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
