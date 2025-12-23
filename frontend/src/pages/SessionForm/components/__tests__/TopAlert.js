/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import TopAlert from '../TopAlert';

describe('TopAlert', () => {
  it('displays needs action variant', async () => {
    const props = {
      approver: { fullName: 'Jane Doe' },
      isNeedsAction: true,
      submitter: 'John Smith',
    };

    act(() => {
      render(<TopAlert {...props} />);
    });

    expect(await screen.findByText(/Please review any manager notes below and resubmit for approval/i)).toBeVisible();
  });

  it('displays review variant', async () => {
    const props = {
      approver: { fullName: 'Jane Doe' },
      isNeedsAction: false,
      submitter: 'John Smith',
    };

    act(() => {
      render(<TopAlert {...props} />);
    });

    expect(await screen.findByText(/Please review all information, then select an approval status/i)).toBeVisible();
  });
});
