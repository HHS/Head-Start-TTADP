import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import CollabReportApproverTableDisplay from '../CollabReportApproverTableDisplay';

describe('CollabReportApproverTableDisplay', () => {
  it('returns null when approvers is null', () => {
    const { container } = render(<CollabReportApproverTableDisplay approvers={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when approvers is undefined', () => {
    const { container } = render(<CollabReportApproverTableDisplay />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders approvers when provided', () => {
    const approvers = [
      {
        user: { fullName: 'John Doe' },
        status: 'approved',
      },
    ];

    const { container } = render(<CollabReportApproverTableDisplay approvers={approvers} />);
    expect(container).not.toBeEmptyDOMElement();
  });
});
