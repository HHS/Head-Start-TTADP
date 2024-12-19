/* eslint-disable jest/expect-expect */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';

import ClassReview from '../ClassReview';
import { GrantDataProvider } from '../../GrantDataContext';
import { mockRSSData } from '../../../../../testHelpers';

const grantNumber = '1';
const regionId = 1;
const recipientId = 1;

const apiUrl = `/api/monitoring/class/${recipientId}/region/${regionId}/grant/${grantNumber}`;

const renderClassReview = () => render(
  <GrantDataProvider>
    <ClassReview
      grantNumber={grantNumber}
      regionId={regionId}
      recipientId={recipientId}
    />
  </GrantDataProvider>,
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

  afterAll(() => {
    fetchMock.restore();
  });

  describe('emotional support', () => {
    beforeEach(() => {
      fetchMock.get('/api/feeds/item?tag=ttahub-class-thresholds', mockRSSData());
    });
    afterEach(() => {
      fetchMock.restore();
    });

    describe('emotional support', () => {
      it('above all thresholds', () => testThreshold('ES', 6, 'Above all thresholds'));
      it('below quality', () => testThreshold('ES', 5.1, 'Below quality'));
      it('below competitive', () => testThreshold('ES', 5.1, 'Below quality'));
    });

    describe('classroom organization', () => {
      it('above all thresholds', () => testThreshold('CO', 6, 'Above all thresholds'));
      it('below quality', () => testThreshold('CO', 5.1, 'Below quality'));
      it('below competitive', () => testThreshold('CO', 4.9, 'Below competitive'));
    });

    describe('instructional support', () => {
      it('above all thresholds', () => testThreshold('IS', 3.1, 'Above all thresholds'));
      it('below quality - after 2025-08-01', () => testThreshold('IS', 2.5, 'Below quality'));
      it('below quality - between 2020-11-09 and 2025-07-31', () => testThreshold('IS', 2.4, 'Below quality'));
      it('below competitive - after 2027-08-01', () => testThreshold('IS', 2.4, 'Below competitive', '08/02/2027'));
      it('below competitive - between 2020-11-09 and 2025-07-31', () => testThreshold('IS', 2.2, 'Below competitive'));
    });
  });
});
