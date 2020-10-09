/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import Pager from '../Pager';

const renderPager = (pages, fromNextStep, onNextStep = () => {}, onPreviousStep = () => {}) => {
  render(
    <Pager
      pages={pages}
      firstStep
      lastStep
      fromNextStep={fromNextStep}
      onNextStep={onNextStep}
      onPreviousStep={onPreviousStep}
      data={{}}
    />,
  );
};

describe('Pager', () => {
  it('starts with the last page if "fromNextStep" is true', () => {
    const pages = [
      () => (<div>first page</div>),
      () => (<div>last page</div>),
    ];
    renderPager(pages, true);
    expect(screen.getByText('last page')).toBeDefined();
  });

  describe('onNextPage', () => {
    const pages = [
      ({ onNextStep }) => (<div onClick={onNextStep}>first page</div>),
      ({ onNextStep }) => (<div onClick={onNextStep}>last page</div>),
    ];

    it('pages forward when not on the last page', () => {
      renderPager(pages, false);
      const first = screen.getByText('first page');
      fireEvent.click(first);
      expect(screen.getByText('last page')).toBeDefined();
    });

    it('calls onNextStep if on the last page', () => {
      const mockOnNextStep = jest.fn();
      renderPager(pages, true, mockOnNextStep);
      const last = screen.getByText('last page');
      fireEvent.click(last);
      expect(mockOnNextStep).toHaveBeenCalled();
    });
  });

  describe('onPreviousPage', () => {
    const pages = [
      ({ onPreviousStep }) => (<div onClick={onPreviousStep}>first page</div>),
      ({ onPreviousStep }) => (<div onClick={onPreviousStep}>last page</div>),
    ];

    it('pages backwards when not on the first page', () => {
      renderPager(pages, true);
      const last = screen.getByText('last page');
      fireEvent.click(last);
      expect(screen.getByText('first page')).toBeDefined();
    });

    it('calls onPreviousStep if on the first page', () => {
      const mockOnPreviousStep = jest.fn();
      renderPager(pages, false, () => {}, mockOnPreviousStep);
      const first = screen.getByText('first page');
      fireEvent.click(first);
      expect(mockOnPreviousStep).toHaveBeenCalled();
    });
  });
});
