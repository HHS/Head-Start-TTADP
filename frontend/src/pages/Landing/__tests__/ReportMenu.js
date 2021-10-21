/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ReportMenu from '../ReportMenu';

const RenderReportMenu = ({
  onExportAll = () => {},
  onExportSelected = () => {},
  hasSelectedReports = true,
  count = 12,
}) => (
  <ReportMenu
    count={count}
    onExportAll={onExportAll}
    onExportSelected={onExportSelected}
    hasSelectedReports={hasSelectedReports}
  />
);

describe('ReportMenu', () => {
  it('has the open CSS class when opened', async () => {
    render(<RenderReportMenu />);
    const button = await screen.findByRole('button');
    userEvent.click(button);
    const report = await screen.findByText('Reports');
    expect(report).toHaveClass('smart-hub--menu-button__open');
  });

  it('calls onExportAll', async () => {
    const onExport = jest.fn();
    render(<RenderReportMenu onExportAll={onExport} />);
    const button = await screen.findByRole('button');
    userEvent.click(button);
    const exportButton = await screen.findByRole('menuitem', { name: 'Export table data...' });
    userEvent.click(exportButton);
    expect(onExport).toHaveBeenCalled();
  });

  describe('with selected reports', () => {
    it('calls onExportSelected', async () => {
      const onExport = jest.fn();
      render(<RenderReportMenu onExportSelected={onExport} hasSelectedReports />);
      const button = await screen.findByRole('button');
      userEvent.click(button);
      const exportButton = await screen.findByRole('menuitem', { name: 'Export selected reports...' });
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
    report = await screen.findByText('Reports');
    expect(report).toHaveClass('smart-hub--menu-button__open');
    menu = screen.queryByRole('menu');
    expect(menu).toBeInTheDocument();

    // Focus on the menu button should close the menu
    button.focus();
    report = await screen.findByText('Reports');
    expect(report).not.toHaveClass('smart-hub--menu-button__open');
    menu = screen.queryByRole('menu');
    expect(menu).not.toBeInTheDocument();
  });

  it('disables the button and shows the error message when there are too many reports', async () => {
    render(<RenderReportMenu count={5001} hasSelectedReports={false} />);
    const button = await screen.findByRole('button');
    userEvent.click(button);
    screen.logTestingPlaygroundURL();
    const label = /5,001 records There is a 5,000 record maximum export limit. For assistance, please contact support/i;
    const exportButton = await screen.findByRole('menuitem', { name: label });
    expect(exportButton).toBeDisabled();
  });

  it('closes when the Escape key is pressed', async () => {
    let report;
    let menu;

    render(<RenderReportMenu />);
    // first, open the menu
    const button = await screen.findByRole('button');
    userEvent.click(button);
    report = await screen.findByText('Reports');
    expect(report).toHaveClass('smart-hub--menu-button__open');
    menu = screen.queryByRole('menu');
    expect(menu).toBeInTheDocument();

    // Keypress with the keys other than 'Escape' should NOT close the menu
    fireEvent.keyDown(document.activeElement || document.body, { key: ' ' });
    report = await screen.findByText('Reports');
    expect(report).toHaveClass('smart-hub--menu-button__open');
    menu = screen.queryByRole('menu');
    expect(menu).toBeInTheDocument();

    // Keypress with the escape key should close the menu
    fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' });
    report = await screen.findByText('Reports');
    expect(report).not.toHaveClass('smart-hub--menu-button__open');
    menu = screen.queryByRole('menu');
    expect(menu).not.toBeInTheDocument();
  });
});
