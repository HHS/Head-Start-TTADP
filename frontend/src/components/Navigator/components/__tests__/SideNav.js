import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  render, screen,
} from '@testing-library/react';
import moment from 'moment';

import SideNav from '../SideNav';
import {
  NOT_STARTED, IN_PROGRESS, COMPLETE,
} from '../../constants';

import { REPORT_STATUSES } from '../../../../Constants';
import NetworkContext from '../../../../NetworkContext';

describe('SideNav', () => {
  const saveDataDefaults = {
    connectionActive: true,
    savedToStorage: new Date().toISOString(),
    lastSaveTime: moment(),
  };

  const renderNav = (
    state,
    onNavigation = () => {},
    current = false,
    errorMessage = null,
    saveData = saveDataDefaults,
  ) => {
    const pages = [
      {
        label: 'test',
        state,
        current,
        onNavigation,
      },
      {
        label: 'second',
        state: '',
        current,
        onNavigation,
      },
    ];

    const { connectionActive, lastSaveTime, savedToStorage } = saveData;

    render(
      <NetworkContext.Provider value={{ connectionActive }}>
        <SideNav
          pages={pages}
          skipTo="skip"
          skipToMessage="message"
          errorMessage={errorMessage}
          lastSaveTime={lastSaveTime}
          savedToStorage={savedToStorage}
        />
      </NetworkContext.Provider>,
    );
  };

  describe('displays the correct status', () => {
    it('not started', () => {
      renderNav(NOT_STARTED);
      const notStarted = screen.getByText('Not Started');
      expect(notStarted).toHaveClass('smart-hub--tag-not-started');
      expect(notStarted).toBeVisible();
    });

    it('in progress', () => {
      renderNav(IN_PROGRESS);
      const inProgress = screen.getByText('In Progress');
      expect(inProgress).toHaveClass('smart-hub--tag-in-progress');
      expect(inProgress).toBeVisible();
    });

    it('complete', () => {
      renderNav(COMPLETE);
      const complete = screen.getByText('Complete');
      expect(complete).toHaveClass('smart-hub--tag-complete');
      expect(complete).toBeVisible();
    });

    it('approved', () => {
      renderNav(REPORT_STATUSES.APPROVED);
      const complete = screen.getByText('Approved');
      expect(complete).toHaveClass('smart-hub--tag-approved');
      expect(complete).toBeVisible();
    });

    it('needs action', () => {
      renderNav(REPORT_STATUSES.NEEDS_ACTION);
      const complete = screen.getByText('Needs Action');
      expect(complete).toHaveClass('smart-hub--tag-needs-action');
      expect(complete).toBeVisible();
    });

    it('submitted', () => {
      renderNav(REPORT_STATUSES.SUBMITTED);
      const submitted = screen.getByText('Submitted');
      expect(submitted).toHaveClass('smart-hub--tag-submitted');
      expect(submitted).toBeVisible();
    });
  });

  it('displays error message', async () => {
    renderNav(REPORT_STATUSES.SUBMITTED, () => {}, false, 'error');
    const alert = await screen.findByTestId('alert');
    expect(alert).toBeVisible();
  });

  it('displays two success messages', async () => {
    renderNav(REPORT_STATUSES.DRAFT, () => {}, false, null);
    const alert = await screen.findByTestId('alert');

    expect(alert).toBeVisible();
    const reggies = [
      new RegExp('this report was last saved to your local backup', 'i'),
      new RegExp('this report was last saved to our network', 'i'),
    ];

    const reggiesMeasured = reggies.map((r) => alert.textContent.match(r));
    expect(reggiesMeasured.length).toBe(2);
    expect(reggiesMeasured[0].length).toBe(1);
    expect(reggiesMeasured[1].length).toBe(1);
  });

  it('displays success message for network save', async () => {
    const saveData = {
      connectionActive: true,
      savedToStorage: null,
      lastSaveTime: moment(),
    };

    renderNav(REPORT_STATUSES.DRAFT, () => {}, false, null, saveData);
    const alert = await screen.findByTestId('alert');

    expect(alert).toBeVisible();
    const reggies = [
      new RegExp('this report was last saved to your local backup', 'i'),
      new RegExp('this report was last saved to our network', 'i'),
    ];

    const reggiesMeasured = reggies.map((r) => alert.textContent.match(r));
    expect(reggiesMeasured.length).toBe(2);
    expect(reggiesMeasured[0]).toBe(null);
    expect(reggiesMeasured[1].length).toBe(1);
  });

  it('displays success message for local storage save', async () => {
    const saveData = {
      connectionActive: true,
      savedToStorage: new Date().toISOString(),
      lastSaveTime: null,
    };

    renderNav(REPORT_STATUSES.DRAFT, () => {}, false, null, saveData);
    const alert = await screen.findByTestId('alert');

    expect(alert).toBeVisible();
    const reggies = [
      new RegExp('this report was last saved to your local backup', 'i'),
      new RegExp('this report was last saved to our network', 'i'),
    ];

    const reggiesMeasured = reggies.map((r) => alert.textContent.match(r));
    expect(reggiesMeasured.length).toBe(2);
    expect(reggiesMeasured[0].length).toBe(1);
    expect(reggiesMeasured[1]).toBe(null);
  });

  it('clicking a nav item calls onNavigation', () => {
    const onNav = jest.fn();
    renderNav(NOT_STARTED, onNav);
    const notStarted = screen.getByText('Not Started');
    userEvent.click(notStarted);
    expect(onNav).toHaveBeenCalled();
  });

  it('the currently selected page has the current class', () => {
    renderNav(REPORT_STATUSES.SUBMITTED, () => {}, true);
    const submitted = screen.getByRole('button', { name: 'test Submitted' });
    expect(submitted).toHaveClass('smart-hub--navigator-link-active');
  });
});
