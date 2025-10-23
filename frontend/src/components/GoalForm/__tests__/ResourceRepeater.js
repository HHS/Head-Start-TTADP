import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import ResourceRepeater from '../ResourceRepeater';
import { OBJECTIVE_STATUS } from '../../../Constants';

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
      status={OBJECTIVE_STATUS.IN_PROGRESS}
      isOnReport={false}
      isLoading={false}
      goalStatus={GOAL_STATUS.IN_PROGRESS}
      userCanEdit
    />);

    expect(await screen.findByText(/Did you use any other TTA resources that are available as a link/i)).toBeVisible();
    const resources1 = document.querySelector('input[value=\'http://www.resources.com\']');
    expect(resources1).not.toBeNull();
    const resources2 = document.querySelector('input[value=\'http://www.resources2.com\']');
    expect(resources2).toBeVisible();
    expect(screen.queryAllByText('Copy & paste web address of TTA resource used for this objective. Usually a HeadStart.gov page.').length).toBe(2);
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
      status={OBJECTIVE_STATUS.IN_PROGRESS}
      isOnReport={false}
      isLoading={false}
      goalStatus={GOAL_STATUS.IN_PROGRESS}
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
      status={OBJECTIVE_STATUS.IN_PROGRESS}
      isOnReport={false}
      isLoading={false}
      goalStatus={GOAL_STATUS.IN_PROGRESS}
      userCanEdit
      toolTipText="Copy & paste web address of TTA resource you'll use for this objective. Usually a HeadStart.gov page."
    />);

    expect(await screen.findByText(/Did you use any other TTA resources that are available as a link/i)).toBeVisible();
    expect(screen.queryAllByText("Copy & paste web address of TTA resource you'll use for this objective. Usually a HeadStart.gov page.").length).toBe(2);
  });

  it('cannot add a resource if the first is blank', async () => {
    const setResources = jest.fn();
    render(<ResourceRepeater
      error={<></>}
      resources={[
        { key: 1, value: '' },
      ]}
      setResources={setResources}
      validateResources={jest.fn()}
      status={OBJECTIVE_STATUS.IN_PROGRESS}
      isOnReport={false}
      isLoading={false}
      goalStatus={GOAL_STATUS.IN_PROGRESS}
      userCanEdit
    />);

    const addButton = screen.getByRole('button', { name: /add new resource/i });
    act(() => {
      userEvent.click(addButton);
    });

    expect(setResources).not.toHaveBeenCalled();
    const urlInputs = document.querySelectorAll('input[type="url"]');
    expect(urlInputs.length).toBe(1);
  });
  it('cannot add a resource if there is an error', async () => {
    const setResources = jest.fn();
    render(<ResourceRepeater
      error={<span className="usa-error">This is an error</span>}
      resources={[
        { key: 1, value: 'garbelasdf' },
      ]}
      setResources={setResources}
      validateResources={jest.fn()}
      status={OBJECTIVE_STATUS.IN_PROGRESS}
      isOnReport={false}
      isLoading={false}
      goalStatus={GOAL_STATUS.IN_PROGRESS}
      userCanEdit
    />);

    const addButton = screen.getByRole('button', { name: /add new resource/i });
    act(() => {
      userEvent.click(addButton);
    });

    expect(setResources).not.toHaveBeenCalled();
    const urlInputs = document.querySelectorAll('input[type="url"]');
    expect(urlInputs.length).toBe(1);
  });
});
