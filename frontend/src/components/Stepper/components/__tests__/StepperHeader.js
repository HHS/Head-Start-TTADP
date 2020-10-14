import '@testing-library/jest-dom';
import { screen, render } from '@testing-library/react';
import React from 'react';

import StepperHeader from '../StepperHeader';

describe('StepperHeader', () => {
  beforeEach(() => {
    render(<StepperHeader currentStep={1} totalSteps={10} label="Test Step" />);
  });

  describe('displays the correct information', () => {
    it('step', () => {
      const heading = screen.getByRole('heading');
      expect(heading).toHaveTextContent('1 of 10');
      expect(heading).toHaveTextContent('Test Step');
    });
  });
});
