import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GoalCardContextMenu from '../GoalCardContextMenu';

const menuItems = (label = 'one', onClick = () => {}) => [
  {
    label,
    onClick,
  },
  {
    label: 'two',
    onClick: () => {},
  },
];

describe('GoalCardContextMenu', () => {
  it('hides the menu by default', async () => {
    render(<GoalCardContextMenu menuItems={menuItems()} label="label" />);
    const buttons = screen.queryAllByTestId('actions-button');
    await waitFor(() => expect(buttons.length).toEqual(1));
    expect(await screen.findByLabelText('label')).toBeVisible();
  });

  describe('when the menu is open', () => {
    it('displays all menu items', async () => {
      render(<GoalCardContextMenu menuItems={menuItems()} label="label" />);
      const button = await screen.findByTestId('actions-button');
      userEvent.click(button);

      expect(await screen.findByText('one')).toBeVisible();
      expect(await screen.findByText('two')).toBeVisible();
    });

    it("calls the menu item's onClick", async () => {
      const onClick = jest.fn();
      render(<GoalCardContextMenu menuItems={menuItems('one', onClick)} label="label" />);
      const button = await screen.findByTestId('actions-button');
      userEvent.click(button);

      const oneButton = await screen.findByText('one');
      userEvent.click(oneButton);
      await waitFor(() => expect(onClick).toHaveBeenCalled());
    });

    it('can be closed by pressing escape', async () => {
      const onClick = jest.fn();
      render(<GoalCardContextMenu menuItems={menuItems('one', onClick)} label="label" />);
      const button = await screen.findByTestId('actions-button');
      userEvent.click(button);
      expect(await screen.findByText('one')).toBeVisible();
      userEvent.type(button, '{esc}', { skipClick: true });
      await waitFor(() => expect(screen.queryByText('one')).toBeNull());
    });

    it('can be shifted right', async () => {
      render(<GoalCardContextMenu left={false} menuItems={menuItems('one')} label="label" />);
      const button = await screen.findByTestId('actions-button');
      userEvent.click(button);
      const menu = await screen.findByTestId('menu');
      expect(menu).not.toHaveClass('smart-hub--menu__left');
    });

    it('can be shifted up', async () => {
      render(<GoalCardContextMenu up left={false} menuItems={menuItems('one')} label="label" />);
      const button = await screen.findByTestId('actions-button');
      userEvent.click(button);
      const menu = await screen.findByTestId('menu');
      expect(menu).toHaveClass('smart-hub--menu__up');
    });

    it('can be shifted up and left', async () => {
      render(<GoalCardContextMenu up menuItems={menuItems('one')} label="label" />);
      const button = await screen.findByTestId('actions-button');
      userEvent.click(button);
      const menu = await screen.findByTestId('menu');
      expect(menu).toHaveClass('smart-hub--menu__left_and_up');
    });

    it('ignores keypresses that are not escape', async () => {
      const onClick = jest.fn();
      render(<GoalCardContextMenu menuItems={menuItems('one', onClick)} label="label" />);
      const button = await screen.findByTestId('actions-button');
      userEvent.click(button);
      expect(await screen.findByText('one')).toBeVisible();
      userEvent.type(button, 'a', { skipClick: true });
      expect(await screen.findByText('one')).toBeVisible();
    });

    it('hides the menu on blur', async () => {
      render(
        <>
          <GoalCardContextMenu menuItems={menuItems()} label="label" />
          <div data-testid="other" />
          );
        </>,
      );
      const button = await screen.findByTestId('actions-button');
      userEvent.click(button);

      const other = await screen.findByTestId('other');
      userEvent.click(other);

      await waitFor(() => expect(screen.queryByText('one')).toBeNull());
      await waitFor(() => expect(screen.queryByText('two')).toBeNull());
    });
  });
});
