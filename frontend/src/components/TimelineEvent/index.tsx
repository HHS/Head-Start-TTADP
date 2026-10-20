import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faUsers as faUsersSolid } from '@fortawesome/free-solid-svg-icons';
import {
  faBullseyeArrow,
  faChevronDown,
  faClipboardClock,
  faEnvelope,
  faFileMagnifyingGlass,
  faHand,
  faPersonChalkboard,
  faPhone,
  faWebcam,
} from '@fortawesome/pro-regular-svg-icons';
import { faFlag } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Link } from '@trussworks/react-uswds';
import type { RecipientTimelineEvent } from '@ttahub/common/src/recipientTimeline';
import { uniqueId } from 'lodash';
import moment from 'moment';
import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import colors from '../../colors';
import { isSafeRenderableLink } from '../../utils';
import Tag from '../Tag';
import './TimelineEvent.css';

const eventIcons: Partial<Record<RecipientTimelineEvent['eventType'], IconDefinition>> = {
  'Email communication': faEnvelope,
  'Phone communication': faPhone,
  'In person communication': faHand,
  'Virtual communication': faWebcam,
  'TTA activity': faClipboardClock,
  'Training session': faPersonChalkboard,
  'Goal added': faBullseyeArrow,
  'Goal suspended': faBullseyeArrow,
  'Goal closed': faBullseyeArrow,
  'Goal reopened': faBullseyeArrow,
  'TTA request': faHand,
  'Monitoring report received': faFileMagnifyingGlass,
};

interface TimelineEventProps {
  event: RecipientTimelineEvent;
  /** Omit the connector after the final event in a group. */
  isLast?: boolean;
  defaultExpanded?: boolean;
}

/** Renders the shared presentation contract without depending on a particular source model. */
function TimelineEvent({
  event,
  isLast = false,
  defaultExpanded = false,
}: TimelineEventProps): React.ReactElement {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [id] = useState(() => uniqueId('timeline-event-'));
  const date = moment.utc(event.date, moment.ISO_8601, true);
  const details = event.details.filter(({ items }) => items.length > 0);
  const hasDetails = details.length > 0 || event.links.length > 0;
  const hasDuration = Number.isFinite(event.durationHours) && event.durationHours >= 0;
  const icon = eventIcons[event.eventType] ?? faUsersSolid;

  return (
    <article
      className="ttahub-timeline-event display-flex flex-gap-3 padding-top-1 padding-x-2 bg-white"
      aria-labelledby={`${id}-title`}
    >
      <div
        className="ttahub-timeline-event__rail display-flex flex-column flex-align-center flex-gap-1 flex-align-self-stretch"
        aria-hidden="true"
      >
        <FontAwesomeIcon
          aria-hidden="true"
          className="ttahub-timeline-event__icon height-3 width-3"
          color={colors.ttahubMediumBlue}
          icon={icon}
          focusable="false"
        />
        {!isLast && (
          <span className="ttahub-timeline-event__connector border-left-2px smart-hub-border-base-lighter flex-fill" />
        )}
      </div>
      <div className="ttahub-timeline-event__content flex-fill padding-bottom-3">
        <div className="display-flex flex-wrap flex-gap-1 text-base-dark font-sans-2xs">
          {date.isValid() ? (
            <time dateTime={date.format('YYYY-MM-DD')}>{date.format('MMMM D, YYYY')}</time>
          ) : (
            <span>Date unavailable</span>
          )}
          {hasDuration && (
            <>
              <span aria-hidden="true">|</span>
              <span>
                {event.durationHours}{' '}
                {event.durationHours > 1 || event.durationHours === 0 ? 'hours' : 'hour'}
              </span>
            </>
          )}
        </div>
        <h3 id={`${id}-title`} className="ttahub-timeline-event__title margin-0 font-sans-sm">
          {event.indicators.includes('multiRecipient') && (
            <>
              <FontAwesomeIcon
                aria-hidden="true"
                className="ttahub-timeline-event__title-icon height-2 margin-right-05 width-2"
                color={colors.textInk}
                icon={faUsersSolid}
                focusable="false"
              />
              <span className="usa-sr-only">Multi-recipient communication. </span>
            </>
          )}
          {event.title}
          {event.subtitle && (
            <>
              : <span className="text-normal">{event.subtitle}</span>
            </>
          )}
        </h3>
        {event.byline && event.byline.values.length > 0 && (
          <p className="margin-0 font-sans-2xs">
            {event.byline.label}
            {['By', 'Requested by'].includes(event.byline.label) ? ' ' : ': '}
            {event.byline.values.join('; ')}
          </p>
        )}
        {event.tags.length > 0 && (
          <div className="display-flex flex-wrap flex-gap-1 margin-top-05">
            {event.tags.map(({ label, flagged }, index) => (
              <span
                className="ttahub-timeline-event__tag-group display-flex flex-align-center flex-gap-1"
                key={`${label}-${index}`}
              >
                <Tag className="ttahub-timeline-event__tag margin-right-0 radius-sm padding-y-0 padding-x-1">
                  {label}
                </Tag>
                {flagged && (
                  <>
                    <FontAwesomeIcon
                      aria-hidden="true"
                      className="flex-align-self-start margin-top-05"
                      color={colors.warning}
                      icon={faFlag}
                      focusable="false"
                    />
                    <span className="usa-sr-only">Flagged</span>
                  </>
                )}
              </span>
            ))}
          </div>
        )}
        {hasDetails && (
          <>
            <Button
              type="button"
              unstyled
              className="ttahub-timeline-event__toggle display-flex flex-align-center flex-gap-1 margin-top-2"
              aria-expanded={expanded}
              aria-controls={`${id}-details`}
              onClick={() => setExpanded((value) => !value)}
            >
              <FontAwesomeIcon
                className={expanded ? 'ttahub-timeline-event__chevron--expanded' : ''}
                aria-hidden="true"
                icon={faChevronDown}
                focusable="false"
              />
              {expanded ? 'Hide details' : 'View details'}
              <span className="usa-sr-only">
                {' '}
                for {event.title}
                {date.isValid() ? ` on ${date.format('MMMM D, YYYY')}` : ''}
              </span>
            </Button>
            <div id={`${id}-details`} hidden={!expanded} className="margin-top-2">
              <dl className="margin-0">
                {details.map(({ label, items }, sectionIndex) => (
                  <div className="margin-bottom-105" key={`${label}-${sectionIndex}`}>
                    <dt className="text-bold">{label}</dt>
                    {items.map(({ text, link }, itemIndex) => (
                      <dd
                        className="ttahub-timeline-event__detail margin-0"
                        key={`${text}-${itemIndex}`}
                      >
                        {link && isSafeRenderableLink(link) ? (
                          <Link href={link}>{text}</Link>
                        ) : (
                          text
                        )}
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
              {event.links.map(({ label, to, external }, index) => (
                <div className="margin-top-105" key={`${to}-${index}`}>
                  {!isSafeRenderableLink(to) ? (
                    label
                  ) : !external && to.startsWith('/') ? (
                    <RouterLink className="usa-link" to={to}>
                      {label}
                    </RouterLink>
                  ) : (
                    <Link
                      href={to}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                    >
                      {label}
                      {external && <span className="usa-sr-only"> (opens in a new tab)</span>}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </article>
  );
}

// Timeline position saves replace the router location; skip re-rendering unchanged rows.
export default React.memo(TimelineEvent);
