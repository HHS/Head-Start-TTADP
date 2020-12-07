import '@testing-library/jest-dom';
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
  const renderNav = (state, current, onNavigation = () => {}) => {
    const pages = [
      {
        label: 'test',
        current,
        state,
      },
      {
        label: 'second',
        current: false,
        state: '',
      },
    ];
    render(
      <SideNav
        pages={pages}
        onNavigation={onNavigation}
        skipTo="skip"
        skipToMessage="message"
      />,
    );
  };

  describe('displays the correct status', () => {
    it('not started', () => {
      renderNav(NOT_STARTED, false);
      const notStarted = screen.getByText('Not started');
      expect(notStarted).toHaveClass('smart-hub--tag-not-started');
      expect(notStarted).toBeVisible();
    });

    it('in progress', () => {
      renderNav(IN_PROGRESS, false);
      const inProgress = screen.getByText('In progress');
      expect(inProgress).toHaveClass('smart-hub--tag-in-progress');
      expect(inProgress).toBeVisible();
    });

    it('complete', () => {
      renderNav(COMPLETE, false);
      const complete = screen.getByText('Complete');
      expect(complete).toHaveClass('smart-hub--tag-complete');
      expect(complete).toBeVisible();
    });

    it('submitted', () => {
      renderNav(SUBMITTED, false);
      const submitted = screen.getByText('Submitted');
      expect(submitted).toHaveClass('smart-hub--tag-submitted');
      expect(submitted).toBeVisible();
    });
  });

  it('clicking a nav item calls "onNavigation" with the selected index', () => {
    const onNavigation = jest.fn();
    renderNav(NOT_STARTED, false, onNavigation);
    const notStarted = screen.getByText('Not started');
    userEvent.click(notStarted);
    expect(onNavigation).toHaveBeenCalledWith(0);
  });

  it('the currently selected page has the current class', () => {
    renderNav(SUBMITTED, true);
    const submitted = screen.getByRole('button', { name: 'test Submitted' });
    expect(submitted).toHaveClass('smart-hub--navigator-link-active');
  });
});
