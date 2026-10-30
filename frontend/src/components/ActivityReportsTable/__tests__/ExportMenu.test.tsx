import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import ExportMenu, { type ExportScope } from '../ExportMenu';

const onExport = jest.fn();

function TestMenu({ count = 55705, selectedIds = [1, 2, 3] }) {
  const [scope, setScope] = useState<ExportScope>(null);
  return (
    <ExportMenu
      count={count}
      selectedIds={selectedIds}
      exportIdPrefix="test-"
      scope={scope}
      setScope={setScope}
      onExport={onExport}
    />
  );
}

describe('Activity report export chooser', () => {
  beforeEach(() => onExport.mockReset());

  it('labels the trigger Actions without an outlined button border', () => {
    render(<TestMenu />);
    const trigger = screen.getByRole('button', { name: 'Reports menu' });
    expect(trigger).toHaveTextContent('Actions');
    expect(trigger).not.toHaveClass('usa-button--outline');
    expect(screen.queryByText('Export reports')).not.toBeInTheDocument();
  });

  it.each([
    ['AR', 'activity-reports'],
    ['Goals', 'goals'],
    ['Objectives', 'objectives'],
  ])('exports selected reports as %s', async (label, dataSet) => {
    render(<TestMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Reports menu' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Export selected rows' }));
    const dialog = screen.getByRole('dialog', { name: 'Export selected rows' });
    expect(dialog).toHaveFocus();
    expect(
      within(dialog).getByText(
        'Exports include similar datasets but are focused on either the AR, goals, or objectives.'
      )
    ).toBeVisible();
    expect(
      within(dialog).getByText('Choose a format for the 3 selected activity reports.')
    ).toBeVisible();
    expect(onExport).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: label }));
    expect(onExport).toHaveBeenCalledWith(dataSet, [1, 2, 3]);
    await waitFor(() => expect(dialog).toHaveAttribute('aria-busy', 'false'));
  });

  it.each([
    ['AR', 'activity-reports'],
    ['Goals', 'goals'],
    ['Objectives', 'objectives'],
  ])('exports the full table as %s', async (label, dataSet) => {
    render(<TestMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Reports menu' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Export table' }));
    const dialog = screen.getByRole('dialog', { name: 'Export entire table' });
    expect(
      within(dialog).getByText('Choose a format for the full 55,705 approved activity reports.')
    ).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: label }));
    expect(onExport).toHaveBeenCalledWith(dataSet, undefined);
    await waitFor(() => expect(dialog).toHaveAttribute('aria-busy', 'false'));
  });

  it('does not offer selected-row export without a selection', async () => {
    render(<TestMenu selectedIds={[]} count={0} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reports menu' }));
    expect(
      screen.queryByRole('menuitem', { name: 'Export selected rows' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Export table' })).toBeDisabled();
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    render(<TestMenu />);
    const trigger = screen.getByRole('button', { name: 'Reports menu' });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Export selected rows' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('disables choices while downloading and supports retry after an error', async () => {
    let rejectDownload: (error: Error) => void = () => {};
    onExport.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectDownload = reject;
        })
    );
    render(<TestMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Reports menu' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Export selected rows' }));
    await userEvent.click(screen.getByRole('button', { name: 'AR' }));
    expect(screen.getByRole('button', { name: 'Goals' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Downloading reports...');
    await act(async () => rejectDownload(new Error('Please try again.')));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please try again.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Goals' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Goals' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
