import DownloadIcon from '@material-ui/icons/GetApp';
import PropTypes from 'prop-types';
import { stringify } from 'query-string';
import React, { useCallback, useState } from 'react';
import { Button, useListContext, useNotify, useResourceContext } from 'react-admin';
import join from 'url-join';

export const STABLE_EXPORT_SORT = {
  field: 'id',
  order: 'ASC',
};

const apiUrl = join('/', 'api', 'admin');

function humanizeSource(source = '') {
  return source
    .split('.')
    .pop()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\bId\b/g, 'ID')
    .replace(/\bUuid\b/g, 'UUID')
    .replace(/^./, (firstCharacter) => firstCharacter.toUpperCase());
}

function getFieldLabel(field) {
  if (field.props.label) {
    return field.props.label;
  }

  if (field.props.source) {
    return humanizeSource(field.props.source);
  }

  return '';
}

function getFieldSource(field) {
  return field.props.exportSource || field.props.source || '';
}

export function getExportColumns(listChildren) {
  return React.Children.toArray(listChildren).flatMap((child) => {
    if (!React.isValidElement(child)) {
      return [];
    }

    return React.Children.toArray(child.props.children)
      .filter(React.isValidElement)
      .filter((field) => field.props.exportable !== false)
      .map((field) => ({
        label: getFieldLabel(field),
        source: getFieldSource(field),
      }))
      .filter(({ label, source }) => Boolean(label) && Boolean(source));
  });
}

export function buildDiagnosticsExportUrl(resource, { exportColumns, filter, filterValues }) {
  const effectiveFilter = filter ? { ...filterValues, ...filter } : filterValues;
  const query = stringify({
    columns: JSON.stringify(exportColumns),
    filter: JSON.stringify(effectiveFilter),
    sort: JSON.stringify([STABLE_EXPORT_SORT.field, STABLE_EXPORT_SORT.order]),
  });

  return `${apiUrl}/${resource}/export?${query}`;
}

function extractFilename(response, resource) {
  const contentDisposition = response.headers.get('content-disposition');
  const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/i);

  return filenameMatch?.[1] || `${resource}.csv`;
}

async function downloadDiagnosticsCsv(url, resource) {
  const response = await fetch(url, {
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');

  downloadLink.href = downloadUrl;
  downloadLink.download = extractFilename(response, resource);
  downloadLink.click();
  URL.revokeObjectURL(downloadUrl);
}

export function DiagnosticsExportButton({ disabled, exportColumns }) {
  const notify = useNotify();
  const resource = useResourceContext();
  const { filter, filterValues, total } = useListContext();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      await downloadDiagnosticsCsv(
        buildDiagnosticsExportUrl(resource, {
          exportColumns,
          filter,
          filterValues,
        }),
        resource
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      notify('ra.notification.http_error', { type: 'warning' });
    } finally {
      setIsExporting(false);
    }
  }, [exportColumns, filter, filterValues, isExporting, notify, resource]);

  return (
    <Button
      label={isExporting ? 'Exporting...' : 'ra.action.export'}
      onClick={handleExport}
      disabled={disabled || isExporting || total === 0}
    >
      <DownloadIcon />
    </Button>
  );
}

DiagnosticsExportButton.propTypes = {
  disabled: PropTypes.bool,
  exportColumns: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      source: PropTypes.string.isRequired,
    })
  ).isRequired,
};

DiagnosticsExportButton.defaultProps = {
  disabled: false,
};
