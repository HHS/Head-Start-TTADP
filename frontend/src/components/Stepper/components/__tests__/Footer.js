import '@testing-library/jest-dom';
import { screen, render } from '@testing-library/react';
import React from 'react';

import Footer from '../Footer';

describe('Footer', () => {
  it('if first is true the previous button is disabled', () => {
    render(<Footer first last={false} valid onPreviousStep={() => {}} />);
    expect(screen.getByText('Previous')).toBeDisabled();
  });

  describe('if last is false', () => {
    beforeEach(() => {
      render(<Footer first last={false} valid onPreviousStep={() => {}} />);
    });

    it('the Next button is shown', () => {
      const next = screen.queryByText('Next');
      expect(next).toBeDefined();
    });

    it('the Submit button is hidden', () => {
      expect(screen.queryByText('Submit')).toBeNull();
    });
  });

  describe('if last is true', () => {
    beforeEach(() => {
      render(<Footer first={false} last valid onPreviousStep={() => {}} />);
    });

    it('the Submit button is shown', () => {
      const submit = screen.queryByText('Submit');
      expect(submit).toBeDefined();
    });

    it('the Next button is hidden', () => {
      expect(screen.queryByText('Next')).toBeNull();
    });
  });

  describe('if valid is false', () => {
    it('the Next button is disabled', () => {
      render(<Footer first last={false} valid={false} onPreviousStep={() => {}} />);
      expect(screen.getByText('Next')).toBeDisabled();
    });

    it('the Submit button is disabled', () => {
      render(<Footer first last valid={false} onPreviousStep={() => {}} />);
      expect(screen.getByText('Submit')).toBeDisabled();
    });
  });
});
