import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import ResourceRepeater from '../ResourceRepeater';

describe('ResourceRepeater', () => {
  it('shows the regular view', async () => {
    render(<ResourceRepeater
      error={<></>}
      resources={[
        { key: 1, value: 'http://www.resources.com', onAnyReport: false },
        { key: 1, value: 'http://www.resources2.com', onAnyReport: true },
      ]}
      setResources={jest.fn()}
      validateResources={jest.fn()}
      status="In Progress"
      isOnReport={false}
      isLoading={false}
      goalStatus="In Progress"
    />);

    expect(await screen.findByText('Resource links')).toBeVisible();
    const resources1 = document.querySelector('input[value=\'http://www.resources.com\']');
    expect(resources1).not.toBeNull();
    const resources2 = await screen.findByText('http://www.resources2.com');
    expect(resources2).toBeVisible();
    expect(resources2.tagName).toBe('A');
  });

  it('shows the read only view', async () => {
    render(<ResourceRepeater
      error={<></>}
      resources={[
        { key: 1, value: 'http://www.resources.com', onAnyReport: false },
        { key: 1, value: 'http://www.resources2.com', onAnyReport: true },
      ]}
      setResources={jest.fn()}
      validateResources={jest.fn()}
      status="In Progress"
      isOnReport
      isLoading={false}
      goalStatus="Not Started"
    />);

    expect(await screen.findByText('Resource links')).toBeVisible();
    const resources1 = document.querySelector('input[value=\'http://www.resources.com\']');
    expect(resources1).toBeNull();
    const resources2 = await screen.findByText('http://www.resources2.com');
    expect(resources2).toBeVisible();
    expect(resources2.tagName).toBe('A');
  });
});
