import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import AppLoadingContext from '../../../AppLoadingContext';
import Loader from '../../Loader';
import ExportMenu, { type ExportScope } from '../ExportMenu';

const onExport = jest.fn();
const setIsAppLoading = jest.fn();
const setAppLoadingText = jest.fn();

function TestMenu({ count = 55705, selectedIds = [1, 2, 3], withLoader = false }) {
  const [scope, setScope] = useState<ExportScope>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  return (
    <>
      {withLoader && (
        <Loader loading={loading} loadingLabel={`App ${loadingText}`} text={loadingText} isFixed />
      )}
      <AppLoadingContext.Provider
        value={{
          setIsAppLoading: withLoader ? setLoading : setIsAppLoading,
          setAppLoadingText: withLoader ? setLoadingText : setAppLoadingText,
        }}
      >
        <ExportMenu
          count={count}
          selectedIds={selectedIds}
          exportIdPrefix="test-"
          scope={scope}
          setScope={setScope}
          onExport={onExport}
        />
      </AppLoadingContext.Provider>
    </>
  );
}

describe('Activity report export chooser', () => {
  beforeEach(() => {
    onExport.mockReset();
    setIsAppLoading.mockReset();
    setAppLoadingText.mockReset();
  });

  it('labels the trigger Actions without an outlined button border', () => {
    render(<TestMenu />);
    const trigger = screen.getByRole('button', { name: 'Actions for activity report exports' });
    expect(trigger).toHaveTextContent('Actions');
    expect(trigger).not.toHaveClass('usa-button--outline');
    expect(screen.queryByText('Export reports')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Activity report export' }).tagName).toBe('SECTION');
  });

  it('exports with Enter from the focused menu item and format button', async () => {
    render(<TestMenu />);
    userEvent.tab();
    expect(screen.getByRole('button', { name: 'Actions for activity report exports' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('menuitem', { name: 'Export selected rows' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'AR' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onExport).toHaveBeenCalledWith('activity-reports', [1, 2, 3]);
    await waitFor(() => expect(screen.getByRole('button', { name: 'AR' })).toHaveFocus());
  });

  it('navigates menu items with vertical arrows, Home, and End', async () => {
    render(<TestMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions for activity report exports' }));
    const selected = screen.getByRole('menuitem', { name: 'Export selected rows' });
    const table = screen.getByRole('menuitem', { name: 'Export table' });
    expect(selected).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(table).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(selected).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(table).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(selected).toHaveFocus();
    await userEvent.keyboard('{End}{Enter}');
    expect(screen.getByRole('dialog', { name: 'Export entire table' })).toBeVisible();
  });

  it('navigates formats with horizontal arrows, Home, and End without exporting', async () => {
    render(<TestMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions for activity report exports' }));
    await userEvent.keyboard('{Enter}');
    const activityReports = screen.getByRole('button', { name: 'AR' });
    const goals = screen.getByRole('button', { name: 'Goals' });
    const objectives = screen.getByRole('button', { name: 'Objectives' });
    await userEvent.keyboard('{ArrowRight}');
    expect(goals).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(objectives).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(activityReports).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(objectives).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(activityReports).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(objectives).toHaveFocus();
    expect(onExport).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    expect(onExport).toHaveBeenCalledWith('objectives', [1, 2, 3]);
    await waitFor(() => expect(activityReports).toBeEnabled());
  });

  it('skips disabled menu items during keyboard navigation', async () => {
    render(<TestMenu count={0} />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions for activity report exports' }));
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Export selected rows' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Export selected rows' })).toHaveFocus();
  });

  it.each([
    ['AR', 'activity-reports'],
    ['Goals', 'goals'],
    ['Objectives', 'objectives'],
  ])('exports selected reports as %s', async (label, dataSet) => {
    render(<TestMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions for activity report exports' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Export selected rows' }));
    const dialog = screen.getByRole('dialog', { name: 'Export selected rows' });
    expect(within(dialog).getByRole('button', { name: 'AR' })).toHaveFocus();
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
    expect(setAppLoadingText).toHaveBeenCalledWith('Exporting row(s)...');
    expect(setIsAppLoading).toHaveBeenNthCalledWith(1, true);
    expect(setIsAppLoading).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(dialog).toHaveAttribute('aria-busy', 'false'));
  });

  it.each([
    ['AR', 'activity-reports'],
    ['Goals', 'goals'],
    ['Objectives', 'objectives'],
  ])('exports the full table as %s', async (label, dataSet) => {
    render(<TestMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions for activity report exports' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Export table' }));
    const dialog = screen.getByRole('dialog', { name: 'Export entire table' });
    expect(
      within(dialog).getByText('Choose a format for the full 55,705 approved activity reports.')
    ).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: label }));
    expect(onExport).toHaveBeenCalledWith(dataSet, undefined);
    expect(setAppLoadingText).toHaveBeenCalledWith('Exporting table...');
    expect(setIsAppLoading).toHaveBeenNthCalledWith(1, true);
    expect(setIsAppLoading).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(dialog).toHaveAttribute('aria-busy', 'false'));
  });

  it('does not offer selected-row export without a selection', async () => {
    render(<TestMenu selectedIds={[]} count={0} />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions for activity report exports' }));
    expect(
      screen.queryByRole('menuitem', { name: 'Export selected rows' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Export table' })).toBeDisabled();
    expect(screen.getByRole('menu', { name: 'Export reports' })).toHaveFocus();
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    render(<TestMenu />);
    const trigger = screen.getByRole('button', { name: 'Actions for activity report exports' });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Export selected rows' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('preserves the chooser and recovery message after clicking the loading overlay', async () => {
    let rejectDownload: (error: Error) => void = () => {};
    onExport.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectDownload = reject;
        })
    );
    render(<TestMenu withLoader />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions for activity report exports' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Export selected rows' }));
    await userEvent.click(screen.getByRole('button', { name: 'AR' }));

    const dialog = screen.getByRole('dialog', { name: 'Export selected rows' });
    const overlay = screen.getByRole('status', { name: 'App Exporting row(s)...' });
    expect(overlay).toBeVisible();
    await userEvent.click(overlay);
    fireEvent.blur(dialog, { relatedTarget: overlay });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveAttribute('aria-busy', 'true');

    await act(async () => rejectDownload(new Error('Network failed. Please try again.')));
    expect(screen.queryByRole('status', { name: 'App Exporting row(s)...' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Network failed. Please try again.');
    expect(screen.getByRole('button', { name: 'AR' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Goals' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Goals' }));
    await waitFor(() => expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument());
    expect(onExport).toHaveBeenLastCalledWith('goals', [1, 2, 3]);
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
    await userEvent.click(screen.getByRole('button', { name: 'Actions for activity report exports' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Export selected rows' }));
    await userEvent.click(screen.getByRole('button', { name: 'AR' }));
    expect(screen.getByRole('button', { name: 'Goals' })).toBeDisabled();
    expect(setAppLoadingText).toHaveBeenCalledWith('Exporting row(s)...');
    expect(setIsAppLoading).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Exporting...');
    await act(async () => rejectDownload(new Error('Please try again.')));
    expect(setIsAppLoading).toHaveBeenLastCalledWith(false);
    expect(await screen.findByRole('alert')).toHaveTextContent('Please try again.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Goals' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'AR' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Goals' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
