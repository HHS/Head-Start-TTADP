import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import TopicsInfoList from '../TopicsInfoList';

describe('TopicsInfoList', () => {
  const renderTopicsInfoList = () => {
    render(<TopicsInfoList />);
  };

  it('shows the read only view', async () => {
    renderTopicsInfoList();
    expect(await screen.findByText('Behavioral / Mental Health / Trauma')).toBeVisible();
    expect(await screen.findByText('Child behavior, child or family mental health/trauma.')).toBeVisible();

    expect(await screen.findByText('Fiscal / Budget')).toBeVisible();
    expect(await screen.findByText('Fiscal management system including use of federal assets, complying with regulations, internal controls, and helping recipient leaders collaborate as they develop budgets and address goals and priorities.')).toBeVisible();
  });
});
