/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ReportMenu, { MAXIMUM_EXPORTED_REPORTS } from '../ReportMenu';

const RenderReportMenu = ({
  onExportAll = () => {},
  onExportSelected = () => {},
  hasSelectedReports = true,
  count = 12,
  downloadError = false,
  setDownloadError = jest.fn(),
}) => (
  <ReportMenu
    count={count}
    onExportAll={onExportAll}
    onExportSelected={onExportSelected}
    hasSelectedReports={hasSelectedReports}
    downloadError={downloadError}
    setDownloadError={setDownloadError}
  />
);

describe('ReportMenu', () => {
  it('has the open CSS class when opened', async () => {
    render(<RenderReportMenu />);
    const button = await screen.findByRole('button');
    userEvent.click(button);
    const report = await screen.findByText('Export reports');
    expect(report).toHaveClass('smart-hub--menu-button__open');
  });

  it('calls onExportAll', async () => {
    const onExport = jest.fn();
    render(<RenderReportMenu onExportAll={onExport} />);
    const button = await screen.findByRole('button');
    userEvent.click(button);
    const exportButton = await screen.findByRole('menuitem', { name: 'Export table data' });
    userEvent.click(exportButton);
    expect(onExport).toHaveBeenCalled();
  });

  describe('with selected reports', () => {
    it('calls onExportSelected', async () => {
      const onExport = jest.fn();
      render(<RenderReportMenu onExportSelected={onExport} hasSelectedReports />);
      const button = await screen.findByRole('button');
      userEvent.click(button);
      const exportButton = await screen.findByRole('menuitem', { name: 'Export selected reports' });
      userEvent.click(exportButton);
      expect(onExport).toHaveBeenCalled();
    });
  });

  it('closes when focus moves away from the menu', async () => {
    let report;
    let menu;

    render(<RenderReportMenu />);
    // first, open the menu
    const button = await screen.findByRole('button');
    userEvent.click(button);
    report = await screen.findByText('Export reports');
    expect(report).toHaveClass('smart-hub--menu-button__open');
    menu = screen.queryByRole('menu');
    expect(menu).toBeInTheDocument();

    // Focus on the menu button should close the menu
    button.focus();
    report = await screen.findByText('Export reports');
    expect(report).not.toHaveClass('smart-hub--menu-button__open');
    menu = screen.queryByRole('menu');
    expect(menu).not.toBeInTheDocument();
  });

  // Skipping while testing download of all reports in deployed env
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('shows the error message when there are too many reports', async () => {
    render(<RenderReportMenu count={MAXIMUM_EXPORTED_REPORTS + 1} hasSelectedReports={false} />);
    const button = await screen.findByRole('button');
    userEvent.click(button);
    const label = `This export has ${(MAXIMUM_EXPORTED_REPORTS + 1).toLocaleString('en-us')} reports. You can only export ${MAXIMUM_EXPORTED_REPORTS.toLocaleString('en-us')} reports at a time.`;
    expect(await screen.findByText(label)).toBeVisible();
  });

  it('shows and dismisses a download error message', async () => {
    const setDownloadError = jest.fn();
    const downloadError = true;
    render(<RenderReportMenu downloadError={downloadError} setDownloadError={setDownloadError} />);

    const button = await screen.findByRole('button');
    userEvent.click(button);

    await screen.findByText(/sorry, something went wrong. Please try your request again/i);
    const dismiss = await screen.findByRole('button', { name: /dismiss/i });
    userEvent.click(dismiss);

    expect(setDownloadError).toHaveBeenCalledWith(false);
  });

  it('closes when the Escape key is pressed', async () => {
    let report;
    let menu;

    render(<RenderReportMenu />);
    // first, open the menu
    const button = await screen.findByRole('button');
    userEvent.click(button);
    report = await screen.findByText('Export reports');
    expect(report).toHaveClass('smart-hub--menu-button__open');
    menu = screen.queryByRole('menu');
    expect(menu).toBeInTheDocument();

    // Keypress with the keys other than 'Escape' should NOT close the menu
    fireEvent.keyDown(document.activeElement || document.body, { key: ' ' });
    report = await screen.findByText('Export reports');
    expect(report).toHaveClass('smart-hub--menu-button__open');
    menu = screen.queryByRole('menu');
    expect(menu).toBeInTheDocument();

    // Keypress with the escape key should close the menu
    fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' });
    report = await screen.findByText('Export reports');
    expect(report).not.toHaveClass('smart-hub--menu-button__open');
    menu = screen.queryByRole('menu');
    expect(menu).not.toBeInTheDocument();
  });
});
