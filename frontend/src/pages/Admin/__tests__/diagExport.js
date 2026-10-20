import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PropTypes from 'prop-types';
import React from 'react';
import { DateField, FunctionField, TextField } from 'react-admin';
import {
  buildDiagnosticsExportUrl,
  DiagnosticsExportButton,
  getExportColumns,
  STABLE_EXPORT_SORT,
} from '../diagExport';

const mockUseListContext = jest.fn();
const mockUseNotify = jest.fn();
const mockUseResourceContext = jest.fn();

const DiagnosticLike = ({ label }) => <a href="#/diagnostic-link">{label}</a>;

DiagnosticLike.propTypes = {
  label: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
};

jest.mock('react-admin', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react');

  return {
    Button: jest.fn(({ children, disabled, label, onClick }) =>
      mockReact.createElement(
        'button',
        {
          disabled,
          onClick,
          type: 'button',
        },
        label,
        children
      )
    ),
    DateField: jest.fn(() => null),
    FunctionField: jest.fn(() => null),
    TextField: jest.fn(() => null),
    useListContext: () => mockUseListContext(),
    useNotify: () => mockUseNotify(),
    useResourceContext: () => mockUseResourceContext(),
  };
});

describe('diagExport', () => {
  let clickSpy;
  let createElementSpy;
  let fetchSpy;
  let mockAnchor;
  let mockConsoleError;
  let originalCreateElement;
  let notify;
  let originalCreateObjectURL;
  let originalRevokeObjectURL;
  let revokeObjectUrlSpy;
  let createObjectUrlSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    notify = jest.fn();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUseListContext.mockReturnValue({
      filter: undefined,
      filterValues: { grantId: '11' },
      total: 2,
    });
    mockUseNotify.mockReturnValue(notify);
    mockUseResourceContext.mockReturnValue('grantCitations');

    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      blob: jest.fn().mockResolvedValue(new Blob(['csv-data'], { type: 'text/csv' })),
      headers: {
        get: jest.fn().mockReturnValue('attachment; filename="grantCitations.csv"'),
      },
      ok: true,
      status: 200,
    });

    mockAnchor = {
      click: jest.fn(),
      download: '',
      href: '',
    };
    clickSpy = jest.spyOn(mockAnchor, 'click');
    originalCreateElement = document.createElement.bind(document);
    createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return mockAnchor;
      }

      return originalCreateElement(tagName);
    });
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn().mockReturnValue('blob:diagnostic-export');
    URL.revokeObjectURL = jest.fn();
    createObjectUrlSpy = jest.spyOn(URL, 'createObjectURL');
    revokeObjectUrlSpy = jest.spyOn(URL, 'revokeObjectURL');
  });

  afterEach(() => {
    clickSpy.mockRestore();
    createElementSpy.mockRestore();
    fetchSpy.mockRestore();
    mockConsoleError.mockRestore();
    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('builds export columns from visible data fields only', () => {
    const columns = getExportColumns(
      <div>
        <TextField source="grantId" />
        <FunctionField
          label="Citation"
          source="citationId"
          render={(record) => <DiagnosticLike label={record.citationId} />}
        />
        <FunctionField
          label="Histories"
          exportable={false}
          render={() => <DiagnosticLike label="Open" />}
        />
        <DateField source="updatedAt" label="Updated at" />
      </div>
    );

    expect(columns).toEqual([
      { label: 'Grant ID', source: 'grantId' },
      { label: 'Citation', source: 'citationId' },
      { label: 'Updated at', source: 'updatedAt' },
    ]);
  });

  it('builds the server-side export URL from filters and visible columns', () => {
    const url = buildDiagnosticsExportUrl('grantCitations', {
      exportColumns: [
        { label: 'Grant ID', source: 'grantId' },
        { label: 'Citation', source: 'citationId' },
      ],
      filter: undefined,
      filterValues: { grantId: '11' },
    });

    expect(url).toContain('/api/admin/grantCitations/export?');
    expect(url).toContain(encodeURIComponent(JSON.stringify({ grantId: '11' })));
    expect(url).toContain(encodeURIComponent(JSON.stringify(['id', 'ASC'])));
    expect(url).toContain(
      encodeURIComponent(
        JSON.stringify([
          { label: 'Grant ID', source: 'grantId' },
          { label: 'Citation', source: 'citationId' },
        ])
      )
    );
  });

  it('downloads the csv from the export endpoint using a stable id sort', async () => {
    const columns = [
      { label: 'Grant ID', source: 'grantId' },
      { label: 'Citation', source: 'citationId' },
    ];

    render(<DiagnosticsExportButton exportColumns={columns} />);

    fireEvent.click(screen.getByRole('button', { name: 'ra.action.export' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          encodeURIComponent(JSON.stringify([STABLE_EXPORT_SORT.field, STABLE_EXPORT_SORT.order]))
        ),
        { credentials: 'same-origin' }
      );
    });

    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('grantCitations.csv');
    expect(mockAnchor.href).toBe('blob:diagnostic-export');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:diagnostic-export');
  });

  it('prevents overlapping export requests while one is in flight', async () => {
    const deferred = createDeferred();

    fetchSpy.mockReturnValue(deferred.promise);

    render(<DiagnosticsExportButton exportColumns={[{ label: 'Grant ID', source: 'grantId' }]} />);

    const exportButton = screen.getByRole('button', { name: 'ra.action.export' });

    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Exporting...' })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Exporting...' }));

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    deferred.resolve({
      blob: jest.fn().mockResolvedValue(new Blob(['csv-data'], { type: 'text/csv' })),
      headers: {
        get: jest.fn().mockReturnValue('attachment; filename="grantCitations.csv"'),
      },
      ok: true,
      status: 200,
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'ra.action.export' })).not.toBeDisabled();
    });
  });

  it('notifies on export failure', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<DiagnosticsExportButton exportColumns={[{ label: 'Grant ID', source: 'grantId' }]} />);

    fireEvent.click(screen.getByRole('button', { name: 'ra.action.export' }));

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('ra.notification.http_error', { type: 'warning' });
    });
  });
});
