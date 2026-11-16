import { Alert, Button, Label, Select } from '@trussworks/react-uswds';
import React, { useState } from 'react';
import { REGIONS } from '../../Constants';
import { HTTPError } from '../../fetchers';
import {
  runEmailDigests,
  runMonitoringDeliveries,
  simulateMonitoringReview,
} from '../../fetchers/Admin';

const FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;

type Job = (typeof FREQUENCIES)[number] | 'monitoring' | 'simulate';

type Status = { type: 'success' | 'error'; message: string } | null;

const plural = (count: number, word: string, many = `${word}s`) =>
  `${count} ${count === 1 ? word : many}`;

const jobName = (job: Job) => {
  if (job === 'monitoring') {
    return 'monitoring deliveries';
  }
  if (job === 'simulate') {
    return 'monitoring review simulation';
  }
  return `${job} digests`;
};

export default function EmailTesting() {
  const [running, setRunning] = useState<Job | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [simulateRegion, setSimulateRegion] = useState<number>(REGIONS[0]);

  const run = async (job: Job, confirmText: string, action: () => Promise<string>) => {
    if (!window.confirm(`${confirmText} Real users will be notified.`)) {
      return;
    }

    setRunning(job);
    setStatus(null);
    try {
      setStatus({ type: 'success', message: await action() });
    } catch (err) {
      let message = `Error running ${jobName(job)}.`;
      if (err instanceof HTTPError && err.status === 403) {
        message = 'Email testing is not available in production.';
      } else if (job === 'simulate' && err instanceof HTTPError && err.status === 404) {
        message = `No active grant found in region ${simulateRegion}.`;
      }
      setStatus({ type: 'error', message });
    } finally {
      setRunning(null);
    }
  };

  const runDigests = (frequency: (typeof FREQUENCIES)[number]) =>
    run(frequency, `Send all ${frequency} email digests now?`, async () => {
      const { queued } = await runEmailDigests(frequency);
      return `Queued ${plural(queued, `${frequency} digest email`)}.`;
    });

  const runMonitoring = () =>
    run(
      'monitoring',
      'Send notifications for monitoring reports delivered yesterday or today?',
      async () => {
        const { detected, inApp, emails } = await runMonitoringDeliveries();
        return `Found ${plural(detected, 'monitoring delivery', 'monitoring deliveries')}. Created ${plural(inApp, 'in-app notification')} and queued ${plural(emails, 'email')}.`;
      }
    );

  const runSimulate = () =>
    run(
      'simulate',
      `Create a simulated monitoring review in region ${simulateRegion} and send its notifications?`,
      async () => {
        const { recipientName, inApp, emails } = await simulateMonitoringReview(simulateRegion);
        return `Simulated a monitoring review for ${recipientName} in region ${simulateRegion}. Created ${plural(inApp, 'in-app notification')} and queued ${plural(emails, 'email')}.`;
      }
    );

  return (
    <div>
      <h2>Email testing</h2>
      <p className="usa-prose">
        Runs scheduled email jobs on demand. Emails go to the users who would normally get them,
        based on their email settings. For testing purposes only. Do not run in production.
      </p>
      <h3>Digests</h3>
      <p className="usa-prose">Includes the monitoring report digest.</p>
      <div className="display-flex flex-gap-1 margin-bottom-2">
        {FREQUENCIES.map((frequency) => (
          <Button
            key={frequency}
            type="button"
            disabled={running !== null}
            onClick={() => runDigests(frequency)}
          >
            {running === frequency ? `Running ${frequency} digests...` : `Run ${frequency} digests`}
          </Button>
        ))}
      </div>
      <h3>Monitoring deliveries</h3>
      <p className="usa-prose">
        Runs the monitoring notification pipeline. This will duplicate emails each time. In-app
        notifications are not duplicated. For testing purposes only. Do not run in production.
      </p>
      <Button
        type="button"
        className="margin-bottom-2"
        disabled={running !== null}
        onClick={runMonitoring}
      >
        {running === 'monitoring'
          ? 'Running monitoring deliveries...'
          : 'Run monitoring deliveries'}
      </Button>
      <h3>Simulate monitoring review</h3>
      <p className="usa-prose">
        Creates a monitoring review delivered today for an active grant in the region, then sends
        its notifications. Users with a TTAC, ECM or GSM role in that home region are notified, and
        the review is included in the next monitoring digest. The review is named "SIMULATED - email
        testing" and is removed by the next monitoring data refresh. For testing purposes only. Do
        not run in production.
      </p>
      <Label htmlFor="simulate-region">Region</Label>
      <Select
        id="simulate-region"
        name="simulate-region"
        value={simulateRegion}
        onChange={(e) => setSimulateRegion(Number(e.target.value))}
      >
        {REGIONS.map((region) => (
          <option key={region} value={region}>
            Region {region}
          </option>
        ))}
      </Select>
      <Button
        type="button"
        className="margin-y-2"
        disabled={running !== null}
        onClick={runSimulate}
      >
        {running === 'simulate' ? 'Simulating monitoring review...' : 'Simulate monitoring review'}
      </Button>
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
