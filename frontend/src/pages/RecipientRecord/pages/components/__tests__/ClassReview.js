import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';

import ClassReview from '../ClassReview';

const grantId = '1';

describe('ClassReview', () => {
  const renderClassReview = () => render(<ClassReview grantId={grantId} />);

  describe('emotional support', () => {
    afterEach(() => {
      fetchMock.restore();
    });

    it('above all thresholds', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '05/01/2023',
        ES: 6,
        CO: 3,
        IS: 7,
      });

      renderClassReview();
      expect(await screen.findByTestId('class-es')).toHaveTextContent('Above all thresholds');
    });

    it('below quality', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '05/01/2023',
        ES: 5.1,
        CO: 3,
        IS: 7,
      });

      renderClassReview();
      expect((await screen.findByTestId('class-es'))).toHaveTextContent('Below quality');
    });

    it('below competetive', async () => {
      fetchMock.getOnce(`/api/monitoring/class/${grantId}`, {
        received: '05/01/2023',
        ES: 5.1,
        CO: 3,
        IS: 7,
      });

      renderClassReview();
      expect((await screen.findByTestId('class-es'))).toHaveTextContent('Below quality');
    });
  });
});
