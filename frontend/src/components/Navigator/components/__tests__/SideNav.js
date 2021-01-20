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
  const renderNav = (state, onNavigation = () => {}, current = false) => {
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

    render(
      <SideNav
        pages={pages}
        skipTo="skip"
        skipToMessage="message"
      />,
    );
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

  it('clicking a nav item calls onNavigation', () => {
    const onNav = jest.fn();
    renderNav(NOT_STARTED, onNav);
    const notStarted = screen.getByText('Not started');
    userEvent.click(notStarted);
    expect(onNav).toHaveBeenCalled();
  });

  it('the currently selected page has the current class', () => {
    renderNav(SUBMITTED, () => {}, true);
    const submitted = screen.getByRole('button', { name: 'test' });
    expect(submitted).toHaveClass('smart-hub--navigator-link-active');
  });
});
