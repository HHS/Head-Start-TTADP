/* eslint-disable jest/expect-expect */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';

import ClassReview from '../ClassReview';

const grantNumber = '1';
const regionId = 1;
const recipientId = 1;

const apiUrl = `/api/monitoring/class/${recipientId}/region/${regionId}/grant/${grantNumber}`;

const renderClassReview = () => render(
  <ClassReview
    grantNumber={grantNumber}
    regionId={regionId}
    recipientId={recipientId}
  />,
);

const testThreshold = async (area, score, expectedText, received = '05/01/2023') => {
  fetchMock.getOnce(apiUrl, {
    received,
    ES: area === 'ES' ? score : 0,
    CO: area === 'CO' ? score : 0,
    IS: area === 'IS' ? score : 0,
  });

  renderClassReview();
  expect(await screen.findByTestId(`class-${area.toLowerCase()}`)).toHaveTextContent(expectedText);
};

describe('ClassReview', () => {
  afterEach(() => {
    fetchMock.restore();
  });
  const renderClassReview = () => render(<ClassReview grantNumber={grantId} />);

  describe('emotional support', () => {
    afterEach(() => {
      fetchMock.restore();
    });

  describe('emotional support', () => {
    it('above all thresholds', () => testThreshold('ES', 6, 'Above all thresholds'));
    it('below quality', () => testThreshold('ES', 5.1, 'Below quality'));
    it('below competetive', () => testThreshold('ES', 5.1, 'Below quality'));
  });

  describe('classroom organization', () => {
    it('above all thresholds', () => testThreshold('CO', 6, 'Above all thresholds'));
    it('below quality', () => testThreshold('CO', 5.1, 'Below quality'));
    it('below competetive', () => testThreshold('CO', 4.9, 'Below competetive'));
  });

  describe('instructional support', () => {
    it('above all thresholds', () => testThreshold('IS', 3.1, 'Above all thresholds'));
    it('below quality - after 2025-08-01', () => testThreshold('IS', 2.5, 'Below quality'));
    it('below quality - between 2020-11-09 and 2025-07-31', () => testThreshold('IS', 2.4, 'Below quality'));
    it('below competetive - after 2025-08-01', () => testThreshold('IS', 2.4, 'Below competetive', '08/02/2025'));
    it('below competetive - between 2020-11-09 and 2025-07-31', () => testThreshold('IS', 2.2, 'Below competetive'));
  });
});
