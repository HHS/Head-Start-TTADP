import React from 'react';
import { render } from '@testing-library/react';
import IndicatorCounter from '../IndicatorCounter';

describe('IndicatorCounter', () => {
  it('renders the correct number of indicators', () => {
    render(<IndicatorCounter count={0} totalCount={5} />);

    const indicators = document.querySelectorAll('.ttahub--indicator-box');
    expect(indicators.length).toBe(5);
  });

  it('renders the correct number of filled indicators', () => {
    render(<IndicatorCounter count={3} totalCount={5} />);

    const filledIndicators = document.querySelectorAll('.ttahub--indicator-box-filled');
    expect(filledIndicators.length).toBe(3);
  });

  it('renders the correct number of empty indicators', () => {
    render(<IndicatorCounter count={3} totalCount={5} />);

    const emptyIndicators = document.querySelectorAll('.ttahub--indicator-box-empty');
    expect(emptyIndicators.length).toBe(2);
  });

  it('renders no filled indicators when count is 0', () => {
    render(<IndicatorCounter count={0} totalCount={5} />);

    const filledIndicators = document.querySelectorAll('.ttahub--indicator-box-filled');
    expect(filledIndicators.length).toBe(0);

    const emptyIndicators = document.querySelectorAll('.ttahub--indicator-box-empty');
    expect(emptyIndicators.length).toBe(5);
  });

  it('renders all filled indicators when count equals totalCount', () => {
    render(<IndicatorCounter count={5} totalCount={5} />);

    const filledIndicators = document.querySelectorAll('.ttahub--indicator-box-filled');
    expect(filledIndicators.length).toBe(5);

    const emptyIndicators = document.querySelectorAll('.ttahub--indicator-box-empty');
    expect(emptyIndicators.length).toBe(0);
  });

  it('handles zero totalCount gracefully', () => {
    render(<IndicatorCounter count={0} totalCount={0} />);

    const indicators = document.querySelectorAll('.ttahub--indicator-box');
    expect(indicators.length).toBe(0);
  });
});
