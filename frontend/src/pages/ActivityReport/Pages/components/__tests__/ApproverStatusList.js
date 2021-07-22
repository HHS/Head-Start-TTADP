/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import {
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import ApproverStatusList from '../ApproverStatusList';

describe('Approver Status List', () => {
  it('renders correctly with data', async () => {
    const approverStatus = [
      { approver: 'Test Approver1', status: 'approved' },
      { approver: 'Test Approver2', status: 'submitted' },
      { approver: 'Test Approver3', status: 'needs_action' }];

    render(<ApproverStatusList approverStatus={approverStatus} />);
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBe(3);

    const statusValues = items.map((item) => item.textContent);

    expect(statusValues).toMatchInlineSnapshot(`
      Array [
        "Approved by Test Approver1",
        "Pending Approval from Test Approver2",
        "Needs Action from Test Approver3",
      ]
    `);

    await expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders correctly without data', async () => {
    const approverStatus = [];
    render(<ApproverStatusList approverStatus={approverStatus} />);
    const list = screen.getByRole('list');
    expect(list.childNodes.length).toBe(0);
    await expect(document.querySelector('svg')).toBeNull();
  });
});
