import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent,
} from '@testing-library/react';
import ResourceRepeater from '../ResourceRepeater';

describe('ResourceRepeater', () => {
  it('shows the regular view', async () => {
    render(<ResourceRepeater
      error={<></>}
      resources={[
        { key: 1, value: 'http://www.resources.com' },
        { key: 2, value: 'http://www.resources2.com' },
      ]}
      setResources={jest.fn()}
      validateResources={jest.fn()}
      status="In Progress"
      isOnReport={false}
      isLoading={false}
      goalStatus="In Progress"
      userCanEdit
    />);

    expect(await screen.findByText(/Did you use any other TTA resources that are available as a link/i)).toBeVisible();
    const resources1 = document.querySelector('input[value=\'http://www.resources.com\']');
    expect(resources1).not.toBeNull();
    const resources2 = document.querySelector('input[value=\'http://www.resources2.com\']');
    expect(resources2).toBeVisible();
    expect(screen.queryAllByText('Copy & paste web address of TTA resource used for this objective. Usually an ECLKC page.').length).toBe(2);
  });

  it('calls validateResources() when a resource is removed', async () => {
    const validateResourcesMock = jest.fn();
    const resources = [
      { key: 1, value: 'http://www.resources.com' },
      { key: 2, value: 'http://www.resources2.com' },
    ];

    render(<ResourceRepeater
      error={<></>}
      resources={resources}
      setResources={jest.fn()}
      validateResources={validateResourcesMock}
      status="In Progress"
      isOnReport={false}
      isLoading={false}
      goalStatus="In Progress"
      userCanEdit
    />);

    const removeButton = screen.getByRole('button', { name: /remove resource 1/i });
    fireEvent.click(removeButton);

    expect(validateResourcesMock).toHaveBeenCalled();
  });

  it('render with alternate tool tip', async () => {
    render(<ResourceRepeater
      error={<></>}
      resources={[
        { key: 1, value: 'http://www.resources.com' },
        { key: 2, value: 'http://www.resources2.com' },
      ]}
      setResources={jest.fn()}
      validateResources={jest.fn()}
      status="In Progress"
      isOnReport={false}
      isLoading={false}
      goalStatus="In Progress"
      userCanEdit
      toolTipText="Copy & paste web address of TTA resource you'll use for this objective. Usually an ECLKC page."
    />);

    expect(await screen.findByText(/Did you use any other TTA resources that are available as a link/i)).toBeVisible();
    expect(screen.queryAllByText("Copy & paste web address of TTA resource you'll use for this objective. Usually an ECLKC page.").length).toBe(2);
  });

  it('calls validateOnRemove() when a resource is removed', async () => {
    const validateOnRemoveMock = jest.fn();
    const resources = [
      { key: 1, value: 'http://www.resources.com' },
      { key: 2, value: 'http://www.resources2.com' },
    ];

    render(<ResourceRepeater
      error={<></>}
      resources={resources}
      setResources={jest.fn()}
      validateResources={jest.fn()}
      status="In Progress"
      isOnReport={false}
      isLoading={false}
      goalStatus="In Progress"
      userCanEdit
      validateOnRemove={validateOnRemoveMock}
    />);

    const removeButton = screen.getByRole('button', { name: /remove resource 1/i });
    fireEvent.click(removeButton);

    expect(validateOnRemoveMock).toHaveBeenCalled();
  });
});
