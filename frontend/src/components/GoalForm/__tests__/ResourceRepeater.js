import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import ResourceRepeater from '../ResourceRepeater';

describe('ResourceRepeater', () => {
  const createdResources = [
    { key: 1, value: 'resource 1', isOnApprovedReport: false },
    { key: 2, value: 'resource 2', isOnApprovedReport: true },
  ];

  const renderReadOnly = () => {
    render((
      <ResourceRepeater
        resources={createdResources}
        setResources={jest.fn()}
        validateResources={jest.fn()}
        error={<></>}
        isOnReport={false}
        isOnApprovedReport={false}
        status="Not Started"
        isLoading={false}
      />
    ));
  };

  it('can render with resources', async () => {
    renderReadOnly();
    expect(await screen.findByRole('textbox', { name: /resource 1/i })).toBeVisible();
    expect(await screen.findByText(/resource 2/i)).toBeVisible();
  });
});
