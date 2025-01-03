import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Drawer from '../Drawer';

// eslint-disable-next-line react/prop-types
jest.mock('focus-trap-react', () => ({ children }) => <>{children}</>);

describe('Drawer', () => {
  // Create a ref for the trigger element which opens the drawer:
  const triggerRef = React.createRef();
  const clickTargetRef = React.createRef();

  const renderDrawer = (sticky = false) => (
    <div>
      <div
        ref={clickTargetRef}
      >
        click target
      </div>
      <div>
        <button
          type="button"
          ref={triggerRef}
          onClick={() => {}}
        >
          Open
        </button>
      </div>
      <Drawer
        title="Hello"
        footer="Footer"
        triggerRef={triggerRef}
        stickyHeader={sticky}
        stickyFooter={sticky}
      >
        Content
      </Drawer>
    </div>
  );

  it('should open the drawer when the trigger is clicked', async () => {
    render(renderDrawer());

    expect(screen.queryByText('Content')).not.toBeVisible();

    act(() => {
      const button = screen.getByRole('button', { name: 'Open' });
      userEvent.click(button);
    });

    expect(screen.getByText('Content')).toBeVisible();
  });

  it('should close when the escape key is pressed', async () => {
    render(renderDrawer());

    act(() => {
      const button = screen.getByRole('button', { name: 'Open' });
      userEvent.click(button);
    });

    expect(screen.getByText('Content')).toBeVisible();

    act(() => {
      userEvent.keyboard('{esc}');
    });

    expect(screen.queryByText('Content')).not.toBeVisible();
  });

  it('should automatically focus the close button', async () => {
    render(renderDrawer());

    act(() => {
      const button = screen.getByRole('button', { name: 'Open' });
      userEvent.click(button);
    });

    expect(screen.getByText('Content')).toBeVisible();

    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('has sticky classes when stickyHeader and stickyFooter are true', async () => {
    render(renderDrawer(true));

    act(() => {
      const button = screen.getByRole('button', { name: 'Open' });
      userEvent.click(button);
    });

    expect(screen.getByText('Footer')).toHaveClass('position-sticky');
    expect(screen.getByText('Hello').parentElement).toHaveClass('position-sticky');
  });
});
