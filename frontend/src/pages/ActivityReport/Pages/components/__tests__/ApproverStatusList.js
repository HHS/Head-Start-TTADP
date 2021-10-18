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
      {
        id: 1, status: 'approved', note: '', User: { id: 1, fullName: 'Test Approver1' },
      },
      {
        id: 2, status: 'submitted', note: '', User: { id: 2, fullName: 'Test Approver2' },
      },
      {
        id: 3, status: 'needs_action', note: '', User: { id: 3, fullName: 'Test Approver3' },
      },
    ];

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
