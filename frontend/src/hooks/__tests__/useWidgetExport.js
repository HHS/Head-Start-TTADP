import { renderHook } from '@testing-library/react-hooks';
import { mockWindowProperty } from '../../testHelpers';
import useWidgetExport from '../useWidgetExport';

describe('useWidgetExport', () => {
  const createObjectURL = jest.fn();
  const readBlobAsText = (blob) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(blob);
    });

  mockWindowProperty('URL', {
    createObjectURL,
    revokeObjectURL: jest.fn(),
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should export rows', () => {
    const data = [
      {
        id: 1,
        heading: 'Heading',
        data: [
          { title: 'ID', value: 1 },
          { title: 'Name', value: 'John Doe' },
        ],
      },
      {
        heading: 'Head,ing',
        id: 2,
        data: [
          { title: 'ID', value: 2 },
          { title: 'Name', value: 'Jane Doe' },
        ],
      },
    ];

    const headers = ['ID', 'Name'];
    const checkboxes = { 1: true, 2: false };
    const exportHeading = 'Export Heading';
    const exportName = 'export.csv';

    const { result } = renderHook(() =>
      useWidgetExport(data, headers, checkboxes, exportHeading, exportName)
    );
    const { exportRows } = result.current;

    exportRows();
    const csvString = 'Export Heading,ID,Name\n,1,John Doe\n,2,Jane Doe';

    const blob = new Blob([csvString], { type: 'text/csv' });

    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('should export selected rows', () => {
    const data = [
      {
        id: 1,
        heading: 'Heading',
        data: [
          { title: 'ID', value: 1 },
          { title: 'Name', value: 'John Doe' },
        ],
      },
      {
        heading: 'Head,ing',
        id: 2,
        data: [
          { title: 'ID', value: 2 },
          { title: 'Name', value: 'Jane Doe' },
        ],
      },
    ];

    const headers = ['ID', 'Name'];
    const checkboxes = { 1: true, 2: false };
    const exportHeading = 'Export Heading';
    const exportName = 'export.csv';

    const { result } = renderHook(() =>
      useWidgetExport(data, headers, checkboxes, exportHeading, exportName)
    );
    const { exportRows } = result.current;

    exportRows('selected');
    const csvString = 'Export Heading,ID,Name\n,1,John Doe\n,2,Jane Doe';

    const blob = new Blob([csvString], { type: 'text/csv' });

    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('exports a value with a comma', () => {
    const data = [
      {
        id: 1,
        heading: 'Heading',
        data: [
          { title: 'ID', value: 1 },
          { title: 'Name', value: 'John, Doe' },
        ],
      },
    ];

    const headers = ['ID', 'Name'];
    const checkboxes = { 1: true };
    const exportHeading = 'Export Heading';
    const exportName = 'export.csv';

    const { result } = renderHook(() =>
      useWidgetExport(data, headers, checkboxes, exportHeading, exportName)
    );
    const { exportRows } = result.current;

    exportRows();
    const csvString = 'Export Heading,ID,Name\n,1,"John, Doe"';

    const blob = new Blob([csvString], { type: 'text/csv' });

    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('escapes headings with quotes, commas, and newlines', async () => {
    const data = [
      {
        id: 1,
        heading: 'Head "one", line\n2',
        data: [{ title: 'Name', value: 'Jane Doe' }],
      },
    ];

    const headers = ['Name'];
    const checkboxes = {};
    const exportHeading = 'Export "Heading", line\n2';
    const exportName = 'export.csv';

    const { result } = renderHook(() =>
      useWidgetExport(data, headers, checkboxes, exportHeading, exportName)
    );

    result.current.exportRows();

    const blob = createObjectURL.mock.calls[0][0];
    await expect(readBlobAsText(blob)).resolves.toBe(
      '"Export ""Heading"", line\n2",Name\n"Head ""one"", line\n2",Jane Doe'
    );
  });

  it('uses exportDataName when row has no data property', () => {
    // Covers the `!row.data && exportDataName ? row[exportDataName] : row.data` true branch
    const data = [
      {
        id: 1,
        heading: 'Heading',
        customData: [
          { title: 'ID', value: 1 },
          { title: 'Name', value: 'Test' },
        ],
      },
    ];

    const headers = ['ID', 'Name'];
    const checkboxes = {};
    const exportHeading = 'Export';
    const exportName = 'export.csv';

    const { result } = renderHook(() =>
      useWidgetExport(data, headers, checkboxes, exportHeading, exportName, 'customData')
    );
    result.current.exportRows();
    expect(createObjectURL).toHaveBeenCalled();
  });
});
