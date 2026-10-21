import type {
  RecipientTimelineCategory,
  RecipientTimelineEvent,
} from '@ttahub/common/src/recipientTimeline';
import { uniqueId } from 'lodash';
import React, { useState } from 'react';
import { AccordionItem } from '../Accordion';
import STATUSES from '../GoalCards/components/StatusDropdownStatuses';
import TimelineEvent from '../TimelineEvent';

interface Props {
  category: RecipientTimelineCategory;
  events: RecipientTimelineEvent[];
}

export default function TimelineCategory({ category, events }: Props): React.ReactElement {
  const [expanded, setExpanded] = useState(true);
  const [id] = useState(() => uniqueId('timeline-category-'));
  return (
    <div className="usa-accordion usa-accordion--bordered margin-bottom-3">
      <AccordionItem
        id={id}
        headingSize={3}
        expanded={expanded}
        handleToggle={() => setExpanded((value) => !value)}
        title={
          <span className="display-inline-flex flex-wrap flex-align-center flex-gap-2">
            <span>{category.label}</span>
            {category.statuses.map((status) => (
              <span
                key={status}
                className="display-inline-flex flex-align-center flex-gap-05 text-normal font-sans-2xs"
              >
                {STATUSES[status]?.icon}
                {STATUSES[status]?.display || status}
              </span>
            ))}
          </span>
        }
        content={
          <ol className="usa-list--unstyled" aria-label={`${category.label} timeline events`}>
            {events.map((event, index) => (
              <li
                key={JSON.stringify([event.source, event.sourceId])}
                data-timeline-event={JSON.stringify([event.source, event.sourceId, category.label])}
              >
                <TimelineEvent event={event} isLast={index === events.length - 1} />
              </li>
            ))}
          </ol>
        }
      />
    </div>
  );
}
