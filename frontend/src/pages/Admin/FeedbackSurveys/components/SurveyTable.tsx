import { Button, Table } from '@trussworks/react-uswds';
import React from 'react';
import { Link } from 'react-router-dom';
import type { SurveyDefinition } from '../types';
import { pageLabel, toApiDate, todayDisplayDate, toDisplayDate, toDisplayEndDate } from '../utils';

interface SurveyTableProps {
  caption: string;
  surveys: SurveyDefinition[];
  pages: Record<string, string>;
  emptyMessage: string;
  actionLabel: string;
  onAction: (survey: SurveyDefinition) => void;
  showClosedOn?: boolean;
}

function SurveyStatusTag({ survey }: { survey: SurveyDefinition }) {
  if (survey.status === 'closed') {
    return <span className="usa-tag bg-base-lighter text-ink">Closed</span>;
  }

  const scheduled = survey.startDate > toApiDate(todayDisplayDate());
  return scheduled ? (
    <span className="usa-tag bg-accent-warm-lighter text-ink">Scheduled</span>
  ) : (
    <span className="usa-tag bg-success-lighter text-ink">Active</span>
  );
}

export default function SurveyTable({
  caption,
  surveys,
  pages,
  emptyMessage,
  actionLabel,
  onAction,
  showClosedOn = false,
}: SurveyTableProps): React.ReactElement {
  return (
    <section className="margin-bottom-5">
      <h3>{caption}</h3>
      {surveys.length === 0 ? (
        <p className="usa-prose">{emptyMessage}</p>
      ) : (
        <Table fullWidth striped stackedStyle="default" className="usa-table--borderless">
          <thead>
            <tr>
              <th scope="col">Page</th>
              <th scope="col">Question</th>
              <th scope="col">Start date</th>
              <th scope="col">End date</th>
              {showClosedOn && <th scope="col">Closed on</th>}
              <th scope="col">Status</th>
              <th scope="col">Responses</th>
              <th scope="col">
                <span className="usa-sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((survey) => (
              <tr key={survey.id}>
                <td data-label="Page">{pageLabel(pages, survey.pageId)}</td>
                <td data-label="Question">{survey.questions[0]?.questionText}</td>
                <td data-label="Start date">{toDisplayDate(survey.startDate)}</td>
                <td data-label="End date">{toDisplayEndDate(survey.endDate)}</td>
                {showClosedOn && (
                  <td data-label="Closed on">{survey.closedAt ? toDisplayDate(survey.closedAt.slice(0, 10)) : '--'}</td>
                )}
                <td data-label="Status">
                  <SurveyStatusTag survey={survey} />
                </td>
                <td data-label="Responses">
                  <Link to={`/admin/feedback-surveys/responses?surveyId=${survey.id}`}>{survey.responseCount}</Link>
                </td>
                <td data-label="Actions">
                  <Button
                    type="button"
                    outline
                    className="margin-0"
                    onClick={() => onAction(survey)}
                    aria-label={`${actionLabel} survey for ${pageLabel(pages, survey.pageId)} starting ${toDisplayDate(survey.startDate)}`}
                  >
                    {actionLabel}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}
