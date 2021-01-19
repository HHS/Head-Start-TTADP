import '@testing-library/jest-dom';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  render, screen,
} from '@testing-library/react';

import SideNav from '../SideNav';
import {
  NOT_STARTED, IN_PROGRESS, COMPLETE, SUBMITTED,
} from '../../constants';

describe('SideNav', () => {
  const renderNav = (state, path = '/path') => {
    const history = createMemoryHistory();
    const pages = [
      {
        label: 'test',
        state,
        path: 'test',
      },
      {
        label: 'second',
        state: '',
        path: 'second',
      },
    ];
    history.push(path);
    render(
      <Router history={history} initialEntries={path}>
        <SideNav
          pages={pages}
          skipTo="skip"
          skipToMessage="message"
        />
      </Router>,
    );
    return history;
  };

  describe('displays the correct status', () => {
    it('not started', () => {
      renderNav(NOT_STARTED);
      const notStarted = screen.getByText('Not started');
      expect(notStarted).toHaveClass('smart-hub--tag-not-started');
      expect(notStarted).toBeVisible();
    });

    it('in progress', () => {
      renderNav(IN_PROGRESS);
      const inProgress = screen.getByText('In progress');
      expect(inProgress).toHaveClass('smart-hub--tag-in-progress');
      expect(inProgress).toBeVisible();
    });

    it('complete', () => {
      renderNav(COMPLETE);
      const complete = screen.getByText('Complete');
      expect(complete).toHaveClass('smart-hub--tag-complete');
      expect(complete).toBeVisible();
    });

    it('submitted', () => {
      renderNav(SUBMITTED);
      const submitted = screen.getByText('Submitted');
      expect(submitted).toHaveClass('smart-hub--tag-submitted');
      expect(submitted).toBeVisible();
    });
  });

  it('clicking a nav item navigates to that item', () => {
    const history = renderNav(NOT_STARTED);
    const notStarted = screen.getByText('Not started');
    userEvent.click(notStarted);
    expect(history.location.pathname).toBe('/test');
  });

  it('the currently selected page has the current class', () => {
    renderNav(SUBMITTED, '/test');
    const submitted = screen.getByRole('link', { name: 'test' });
    expect(submitted).toHaveClass('smart-hub--navigator-link-active');
  });
});
