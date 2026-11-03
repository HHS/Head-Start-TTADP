import moment from 'moment';
import React from 'react';
import Avatar from '../Avatar';
import Container from '../Container';
import Tag from '../Tag';
import './TtaRequestNotesSummary.css';

export interface TtaRequestNote {
  key: string;
  /** the approval phase the note was left in, e.g. "Draft TTA Request" */
  phase: string;
  /** the user's full name with their role acronyms, e.g. "Rachel Green, ECS" */
  author: string;
  /** the part the author plays in the request */
  role: 'Creator' | 'Reviewer' | 'Approver';
  /** ISO timestamp, shown in UTC */
  date: string;
  /** plain text from a textarea */
  note?: string | null;
}

interface TtaRequestNotesSummaryProps {
  notes: TtaRequestNote[];
}

/**
 * Every note left on a TTA request, oldest first, grouped under the approval phase it was
 * left in.
 */
export default function TtaRequestNotesSummary({
  notes,
}: TtaRequestNotesSummaryProps): React.ReactElement | null {
  if (!notes.length) {
    return null;
  }

  return (
    <Container className="margin-bottom-0" paddingX={0} paddingY={0}>
      <section aria-labelledby="ttahub-notes-summary-heading">
        <div className="ttahub-notes-summary__header padding-x-3 padding-y-2">
          <h2
            id="ttahub-notes-summary-heading"
            className="font-serif-md margin-top-0 margin-bottom-1"
          >
            Notes summary
          </h2>
          <p className="margin-0">
            A consolidated view of all notes across the TTA request approval flow
          </p>
        </div>
        <ol className="usa-list--unstyled padding-x-3">
          {notes.map(({ key, phase, author, role, date, note }) => {
            const submitted = moment.utc(date);
            return (
              <li key={key} className="padding-y-2">
                <div className="display-flex flex-align-center margin-bottom-2">
                  <span aria-hidden className="flex-1 border-top-1px border-base-lighter" />
                  <span className="ttahub-notes-summary__meta padding-x-2 text-uppercase text-bold text-base font-sans-2xs">
                    {phase}
                  </span>
                  <span aria-hidden className="flex-1 border-top-1px border-base-lighter" />
                </div>
                <div className="display-flex flex-align-start">
                  {/* the author's name is read out right after, so the initial would repeat it */}
                  <div aria-hidden className="ttahub-notes-summary__avatar">
                    <Avatar name={author} />
                  </div>
                  <div className="flex-1 margin-left-2">
                    <div className="ttahub-notes-summary__author text-bold">{author}</div>
                    <div className="ttahub-notes-summary__meta font-sans-2xs">
                      {submitted.format('MMMM D, YYYY')} • {submitted.format('H:mm')} UTC
                    </div>
                    {note && (
                      <p className="ttahub-notes-summary__note margin-top-2 margin-bottom-0 padding-bottom-2">
                        {note}
                      </p>
                    )}
                  </div>
                  <Tag className="margin-left-2 margin-right-0 radius-sm text-no-uppercase">
                    {role}
                  </Tag>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </Container>
  );
}
