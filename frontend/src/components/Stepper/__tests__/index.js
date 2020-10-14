/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import Stepper from '../index';

// expect(screen.queryAllByRole('link').length).not.toBe(0);
describe('Stepper', () => {
  describe('with several steps', () => {
    const steps = [
      {
        label: 'first',
        pages: ({ onNextStep }) => (<div onClick={onNextStep}>First Page</div>),
      },
      {
        label: 'second',
        pages: ({ onNextStep, onPreviousStep }) => (
          <>
            <div onClick={onPreviousStep}>Second Page</div>
            <div onClick={onNextStep}>Next</div>
          </>
        ),
      },
      {
        label: 'third',
        pages: [
          () => (<div>Page 1</div>),
          () => (<div />),
        ],
      },
    ];

    beforeEach(() => {
      render(<Stepper steps={steps} onSubmit={() => {}} />);
    });

    it('displays the first page', () => {
      expect(screen.getByText('First Page')).toBeDefined();
    });

    it('can change the step to the next step', () => {
      const next = screen.getByText('First Page');
      fireEvent.click(next);
      expect(screen.getByText('Second Page')).toBeDefined();
    });

    it('can change the step to the previous step', () => {
      const next = screen.getByText('First Page');
      fireEvent.click(next);
      const previous = screen.getByText('Second Page');
      fireEvent.click(previous);
      expect(screen.getByText('First Page')).toBeDefined();
    });

    it('uses the pager when the step has multiple pages', () => {
      const next = screen.getByText('First Page');
      fireEvent.click(next);
      const toPager = screen.getByText('Next');
      fireEvent.click(toPager);
      expect(screen.getByText('Page 1')).toBeDefined();
    });
  });

  describe('with a single step', () => {
    it('nextStep submits data', () => {
      const mockSubmit = jest.fn();
      const steps = [{ label: 'test', pages: ({ onNextStep }) => <div onClick={onNextStep}>step</div> }];
      render(<Stepper steps={steps} onSubmit={mockSubmit} />);
      const step = screen.getByText('step');
      fireEvent.click(step);
      expect(mockSubmit).toHaveBeenCalled();
    });
  });
});
