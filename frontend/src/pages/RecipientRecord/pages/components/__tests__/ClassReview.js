import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';

import ClassReview from '../ClassReview';

const grantId = '1';

describe('ClassReview', () => {
  const renderClassReview = () => render(<ClassReview grantNumber={grantId} />);

  describe('emotional support', () => {
    afterEach(() => {
      fetchMock.restore();
    });

    it('above all thresholds', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '05/01/2023',
        ES: 6,
        CO: 0,
        IS: 0,
      });

      renderClassReview();
      expect(await screen.findByTestId('class-es')).toHaveTextContent('Above all thresholds');
    });

    it('below quality', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '05/01/2023',
        ES: 5.1,
        CO: 0,
        IS: 0,
      });

      renderClassReview();
      expect((await screen.findByTestId('class-es'))).toHaveTextContent('Below quality');
    });

    it('below competetive', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '05/01/2023',
        ES: 5.1,
        CO: 0,
        IS: 0,
      });

      renderClassReview();
      expect((await screen.findByTestId('class-es'))).toHaveTextContent('Below quality');
    });
  });

  describe('classroom organization', () => {
    afterEach(() => {
      fetchMock.restore();
    });

    it('above all thresholds', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '05/01/2023',
        ES: 0,
        CO: 6,
        IS: 0,
      });

      renderClassReview();
      expect(await screen.findByTestId('class-co')).toHaveTextContent('Above all thresholds');
    });

    it('below quality', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '05/01/2023',
        ES: 0,
        CO: 5.1,
        IS: 0,
      });

      renderClassReview();
      expect((await screen.findByTestId('class-co'))).toHaveTextContent('Below quality');
    });

    it('below competetive', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '05/01/2023',
        ES: 0,
        CO: 4.9,
        IS: 0,
      });

      renderClassReview();
      expect((await screen.findByTestId('class-co'))).toHaveTextContent('Below competetive');
    });
  });

  describe('instructional support', () => {
    afterEach(() => {
      fetchMock.restore();
    });

    it('above all thresholds', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '05/01/2023',
        ES: 0,
        CO: 0,
        IS: 3.1,
      });

      renderClassReview();
      expect(await screen.findByTestId('class-is')).toHaveTextContent('Above all thresholds');
    });

    it('below quality - after 2025-08-01', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '08/02/2025',
        ES: 0,
        CO: 0,
        IS: 2.5,
      });

      renderClassReview();
      expect((await screen.findByTestId('class-is'))).toHaveTextContent('Below quality');
    });

    it('below quality - between 2020-11-09 and 2025-07-31', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '01/01/2025',
        ES: 0,
        CO: 0,
        IS: 2.4,
      });

      renderClassReview();
      expect((await screen.findByTestId('class-is'))).toHaveTextContent('Below quality');
    });

    it('below competetive - after 2025-08-01', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '08/02/2025',
        ES: 0,
        CO: 0,
        IS: 2.4,
      });

      renderClassReview();
      expect((await screen.findByTestId('class-is'))).toHaveTextContent('Below competetive');
    });

    it('below competetive - between 2020-11-09 and 2025-07-31', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '01/01/2025',
        ES: 0,
        CO: 0,
        IS: 2.2,
      });

      renderClassReview();
      expect((await screen.findByTestId('class-is'))).toHaveTextContent('Below competetive');
    });
  });
});
