import { Alert, Button } from '@trussworks/react-uswds';
import React, { useState } from 'react';
import { HTTPError } from '../../fetchers';
import { runEmailDigests } from '../../fetchers/Admin';

const FREQUENCIES = [
  { key: 'daily', label: 'daily' },
  { key: 'weekly', label: 'weekly' },
  { key: 'monthly', label: 'monthly' },
] as const;

type Frequency = (typeof FREQUENCIES)[number]['key'];

type Status = { type: 'success' | 'error'; message: string } | null;

export default function Digests() {
  const [running, setRunning] = useState<Frequency | null>(null);
  const [status, setStatus] = useState<Status>(null);

  const runDigests = async (frequency: Frequency) => {
    if (!window.confirm(`Send all ${frequency} email digests now? Real users will be emailed.`)) {
      return;
    }

    setRunning(frequency);
    setStatus(null);
    try {
      const { queued } = await runEmailDigests(frequency);
      setStatus({
        type: 'success',
        message: `Queued ${queued} ${frequency} digest email${queued === 1 ? '' : 's'}.`,
      });
    } catch (err) {
      const message =
        err instanceof HTTPError && err.status === 403
          ? 'Manually running digests is not available in production.'
          : `Error running ${frequency} digests.`;
      setStatus({ type: 'error', message });
    } finally {
      setRunning(null);
    }
  };

  return (
    <div>
      <h2>Email digests</h2>
      <p className="usa-prose">
        Runs the email digest cron job on demand. For testing purposes only. Not available in
        production.
      </p>
      <div className="display-flex flex-gap-1 margin-bottom-2">
        {FREQUENCIES.map(({ key, label }) => (
          <Button
            key={key}
            type="button"
            disabled={running !== null}
            onClick={() => runDigests(key)}
          >
            {running === key ? `Running ${label} digests...` : `Run ${label} digests`}
          </Button>
        ))}
      </div>
      {/* kept mounted so screen readers announce the result when it appears */}
      <div role="status" aria-live="polite" aria-atomic="true">
        {status && (
          <Alert type={status.type} headingLevel="h3" slim>
            {status.message}
          </Alert>
        )}
      </div>
    </div>
  );
}
