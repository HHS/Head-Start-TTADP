import { Alert, Button, Fieldset, Label, Radio, Select, TextInput } from '@trussworks/react-uswds';
import React, { useState } from 'react';
import { HTTPError } from '../../fetchers';
import { sendTestMonitoringEmails } from '../../fetchers/Admin';

const EMAIL_TYPES = [
  { key: 'both', label: 'Immediate and digest' },
  { key: 'immediate', label: 'Immediate only' },
  { key: 'digest', label: 'Digest only' },
] as const;

const FREQUENCIES = [
  { key: 'DAILY', label: 'Daily' },
  { key: 'WEEKLY', label: 'Weekly' },
  { key: 'MONTHLY', label: 'Monthly' },
] as const;

type EmailType = (typeof EMAIL_TYPES)[number]['key'];
type Frequency = (typeof FREQUENCIES)[number]['key'];

type SentEmail = {
  kind: 'immediate' | 'digest';
  userId: number;
  email: string;
  sent: boolean;
  detail: string;
};

type Status = { type: 'success' | 'error'; message: string } | null;

const parseIds = (value: string): number[] | null => {
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.every((part) => /^\d+$/.test(part) && Number(part) > 0)) {
    return null;
  }
  return parts.map(Number);
};

export default function MonitoringEmails() {
  const [userIds, setUserIds] = useState('');
  const [emailType, setEmailType] = useState<EmailType>('both');
  const [frequency, setFrequency] = useState<Frequency>('DAILY');
  const [deliveredReviewId, setDeliveredReviewId] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [results, setResults] = useState<SentEmail[]>([]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const ids = parseIds(userIds);
    const reviewIds = parseIds(deliveredReviewId);
    if (!ids || !reviewIds || reviewIds.length > 1) {
      setResults([]);
      setStatus({ type: 'error', message: 'User IDs and the review ID must be numbers.' });
      return;
    }

    const who = ids.length ? `users ${ids.join(', ')}` : 'you';
    if (!window.confirm(`Send monitoring report emails to ${who} now?`)) {
      return;
    }

    setSending(true);
    setStatus(null);
    setResults([]);
    try {
      const response = await sendTestMonitoringEmails({
        ...(ids.length ? { userIds: ids } : {}),
        type: emailType,
        frequency,
        ...(reviewIds.length ? { deliveredReviewId: reviewIds[0] } : {}),
      });
      const sent: SentEmail[] = response.results;
      const failed = sent.filter((r) => !r.sent).length;
      setResults(sent);
      setStatus({
        type: failed ? 'error' : 'success',
        message: failed
          ? `${failed} of ${sent.length} emails were not sent.`
          : `Sent ${sent.length} email${sent.length === 1 ? '' : 's'}.`,
      });
    } catch (err) {
      const message =
        err instanceof HTTPError && err.data?.error
          ? err.data.error
          : 'Error sending monitoring report emails.';
      setStatus({ type: 'error', message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h2>Monitoring report emails</h2>
      <p className="usa-prose">
        Sends the new monitoring report emails right away, ignoring the recipients&apos; email
        settings, role and region. The immediate email is sent once per recipient on the review. The
        digest lists the user&apos;s real digest data, or the review&apos;s recipients if they have
        none. For testing purposes only. Not available in production.
      </p>
      <form onSubmit={onSubmit} className="maxw-mobile-lg">
        <Label htmlFor="monitoring-email-user-ids">User IDs</Label>
        <span className="usa-hint" id="monitoring-email-user-ids-hint">
          Separate IDs with commas. Leave blank to email yourself.
        </span>
        <TextInput
          id="monitoring-email-user-ids"
          name="userIds"
          type="text"
          aria-describedby="monitoring-email-user-ids-hint"
          value={userIds}
          onChange={(e) => setUserIds(e.target.value)}
        />
        <Fieldset legend="Email" className="margin-top-3">
          {EMAIL_TYPES.map(({ key, label }) => (
            <Radio
              key={key}
              id={`monitoring-email-type-${key}`}
              name="type"
              label={label}
              value={key}
              checked={emailType === key}
              onChange={() => setEmailType(key)}
            />
          ))}
        </Fieldset>
        <Label htmlFor="monitoring-email-frequency">Digest frequency</Label>
        <Select
          id="monitoring-email-frequency"
          name="frequency"
          value={frequency}
          disabled={emailType === 'immediate'}
          onChange={(e) => setFrequency(e.target.value as Frequency)}
        >
          {FREQUENCIES.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
        <Label htmlFor="monitoring-email-review-id">Delivered review ID</Label>
        <span className="usa-hint" id="monitoring-email-review-id-hint">
          Optional. Defaults to the most recently delivered review.
        </span>
        <TextInput
          id="monitoring-email-review-id"
          name="deliveredReviewId"
          type="text"
          inputMode="numeric"
          aria-describedby="monitoring-email-review-id-hint"
          value={deliveredReviewId}
          onChange={(e) => setDeliveredReviewId(e.target.value)}
        />
        <Button type="submit" className="margin-top-3" disabled={sending}>
          {sending ? 'Sending emails...' : 'Send emails'}
        </Button>
      </form>
      {/* kept mounted so screen readers announce the result when it appears */}
      <div role="status" aria-live="polite" aria-atomic="true" className="margin-top-2">
        {status && (
          <Alert type={status.type} headingLevel="h3" slim>
            {status.message}
          </Alert>
        )}
      </div>
      {results.length > 0 && (
        <ul className="usa-list">
          {results.map(({ kind, userId, email, sent, detail }) => (
            <li key={`${kind}-${userId}-${detail}`}>
              {sent ? 'Sent' : 'Not sent'}: {kind} email to {email} (user {userId}), {detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
