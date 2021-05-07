/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ReportMenu from '../ReportMenu';

const RenderReportMenu = ({
  onExportAll = () => {},
  onExportSelected = () => {},
  hasSelectedReports = true,
}) => (
  <ReportMenu
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
    const exportButton = await screen.findByRole('button', { name: 'Export Table Data...' });
    userEvent.click(exportButton);
    expect(onExport).toHaveBeenCalled();
  });

  describe('with selected reports', () => {
    it('calls onExportSelected', async () => {
      const onExport = jest.fn();
      render(<RenderReportMenu onExportSelected={onExport} hasSelectedReports />);
      const button = await screen.findByRole('button');
      userEvent.click(button);
      const exportButton = await screen.findByRole('button', { name: 'Export Selected Reports...' });
      userEvent.click(exportButton);
      expect(onExport).toHaveBeenCalled();
    });
  });
});
