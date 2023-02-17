import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Drawer from '../Drawer';

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

    expect(screen.queryByText('Content')).not.toBeInTheDocument();

    act(() => {
      const button = screen.getByRole('button', { name: 'Open' });
      userEvent.click(button);
    });

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should close when the escape key is pressed', async () => {
    render(renderDrawer());

    act(() => {
      const button = screen.getByRole('button', { name: 'Open' });
      userEvent.click(button);
    });

    expect(screen.getByText('Content')).toBeInTheDocument();

    act(() => {
      userEvent.keyboard('{esc}');
    });

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should automatically focus the close button', async () => {
    render(renderDrawer());

    act(() => {
      const button = screen.getByRole('button', { name: 'Open' });
      userEvent.click(button);
    });

    expect(screen.getByText('Content')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('clicking outside of the drawer should close the drawer', async () => {
    render(renderDrawer());

    act(() => {
      const button = screen.getByRole('button', { name: 'Open' });
      userEvent.click(button);
    });

    expect(screen.getByText('Content')).toBeInTheDocument();

    act(() => {
      const clickTarget = clickTargetRef.current;
      userEvent.click(clickTarget);
    });

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
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

  it('shifts focus when pressing tab', async () => {
    render(renderDrawer());

    act(() => {
      const button = screen.getByRole('button', { name: 'Open' });
      userEvent.click(button);
    });

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    act(() => {
      userEvent.tab();
    });

    expect(screen.getByRole('button', { name: 'Open' })).not.toHaveFocus();

    act(() => {
      userEvent.tab({ shift: true });
    });

    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });
});
