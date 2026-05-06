import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';
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

  it('renders needs_action icon for needs_action status', () => {
    const approvers = [
      { user: { fullName: 'Jane Doe' }, status: 'needs_action' },
    ];
    const { container } = render(<CollabReportApproverTableDisplay approvers={approvers} />);
    expect(container).not.toBeEmptyDOMElement();
  });
});
