import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Button } from '@trussworks/react-uswds';
import React, { useEffect, useRef, useState } from 'react';
import colors from '../../colors';
import Container from '../Container';
import './ExportMenu.css';

export type ExportDataSet = 'activity-reports' | 'goals' | 'objectives';
export type ExportScope = 'all' | 'selected' | null;

type Props = {
  count: number;
  selectedIds: number[];
  exportIdPrefix: string;
  scope: ExportScope;
  setScope: (scope: ExportScope) => void;
  onExport: (dataSet: ExportDataSet, reportIds?: number[]) => Promise<void>;
};

const formats: { label: string; dataSet: ExportDataSet }[] = [
  { label: 'AR', dataSet: 'activity-reports' },
  { label: 'Goals', dataSet: 'goals' },
  { label: 'Objectives', dataSet: 'objectives' },
];

function moveButtonFocus(event: React.KeyboardEvent<HTMLButtonElement>, keys: string[]) {
  if (![...keys, 'Home', 'End'].includes(event.key)) return;
  const buttons = Array.from(
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      'button:not(:disabled)'
    ) ?? []
  );
  const currentIndex = buttons.indexOf(event.currentTarget);
  const direction = event.key === keys[0] ? -1 : 1;
  let nextIndex = (currentIndex + direction + buttons.length) % buttons.length;
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = buttons.length - 1;
  event.preventDefault();
  buttons[nextIndex]?.focus();
}

export default function ExportMenu({
  count,
  selectedIds,
  exportIdPrefix,
  scope,
  setScope,
  onExport,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const wrapperRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const chooserRef = useRef<HTMLDivElement>(null);
  const open = menuOpen || scope !== null;
  const selected = scope === 'selected';
  const exportCount = selected ? selectedIds.length : count;
  const headingId = `${exportIdPrefix}export-heading`;

  const close = () => {
    setMenuOpen(false);
    setScope(null);
  };

  useEffect(() => {
    if (scope) setError('');
  }, [scope]);

  useEffect(() => {
    if (isDownloading) return;
    if (scope) {
      const button = chooserRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      (button ?? chooserRef.current)?.focus();
    } else if (menuOpen) {
      const button = menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      (button ?? menuRef.current)?.focus();
    }
  }, [scope, menuOpen, isDownloading]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setScope(null);
      }
    };
    if (open) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open, setScope]);

  const download = async (dataSet: ExportDataSet) => {
    setIsDownloading(true);
    setError('');
    try {
      await onExport(dataSet, selected ? selectedIds : undefined);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : 'Sorry, something went wrong. Please try your request again.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section
      ref={wrapperRef}
      aria-label="Activity report export"
      tabIndex={-1}
      className="ttahub-ar-export-control border-0 padding-0 margin-0 minw-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        type="button"
        ref={triggerRef}
        aria-label="Actions for activity report exports"
        aria-haspopup="menu"
        aria-expanded={open}
        className="usa-button usa-button--unstyled ttahub-ar-export__trigger font-sans-xs margin-left-1"
        id={`${exportIdPrefix}export-button`}
        onClick={() => {
          if (open) close();
          else setMenuOpen(true);
        }}
      >
        Actions{' '}
        <FontAwesomeIcon
          className="margin-left-1"
          color={colors.ttahubMediumBlue}
          icon={faChevronDown}
        />
      </button>
      {open && (
        <div className="ttahub-ar-export position-absolute z-400">
          <Container paddingX={2} paddingY={2} className="ttahub-ar-export__menu margin-bottom-2">
            <div role="menu" tabIndex={-1} ref={menuRef} aria-label="Export reports">
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  role="menuitem"
                  className={`usa-button usa-button--unstyled text-no-underline display-block margin-bottom-2 ${selected ? 'text-bold' : 'text-ink'}`}
                  onClick={() => setScope('selected')}
                  onKeyDown={(event) => moveButtonFocus(event, ['ArrowUp', 'ArrowDown'])}
                  disabled={isDownloading}
                  id={`${exportIdPrefix}export-reports`}
                >
                  Export selected rows
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                className={`usa-button usa-button--unstyled text-no-underline display-block ${scope === 'all' ? 'text-bold' : 'text-ink'}`}
                onClick={() => setScope('all')}
                onKeyDown={(event) => moveButtonFocus(event, ['ArrowUp', 'ArrowDown'])}
                disabled={isDownloading || count === 0}
                id={`${exportIdPrefix}export-table`}
              >
                Export table
              </button>
            </div>
          </Container>
          {scope && (
            <Container paddingX={2} paddingY={2} className="margin-bottom-0">
              <div
                role="dialog"
                aria-labelledby={headingId}
                tabIndex={-1}
                ref={chooserRef}
                aria-busy={isDownloading}
              >
                <h3 id={headingId} className="font-sans-md margin-top-0 margin-bottom-1">
                  {selected ? 'Export selected rows' : 'Export entire table'}
                </h3>
                <p className="margin-top-0 margin-bottom-2">
                  Exports include similar datasets but are focused on either the AR, goals, or
                  objectives.
                </p>
                <p className="margin-top-0 margin-bottom-2">
                  {selected
                    ? `Choose a format for the ${exportCount.toLocaleString('en-US')} selected activity reports.`
                    : `Choose a format for the full ${count.toLocaleString('en-US')} approved activity reports.`}
                </p>
                {error && (
                  <Alert type="error" slim role="alert">
                    {error}
                  </Alert>
                )}
                <div className="ttahub-ar-export__formats margin-top-2">
                  {formats.map(({ label, dataSet }) => (
                    <Button
                      key={dataSet}
                      outline
                      type="button"
                      className="margin-0 padding-x-05"
                      disabled={isDownloading || exportCount === 0}
                      onClick={() => download(dataSet)}
                      onKeyDown={(event) => moveButtonFocus(event, ['ArrowLeft', 'ArrowRight'])}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                {isDownloading && (
                  <p role="status" className="margin-bottom-0">
                    Downloading reports...
                  </p>
                )}
              </div>
            </Container>
          )}
        </div>
      )}
    </section>
  );
}
