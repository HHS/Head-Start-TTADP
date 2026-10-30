// url=https://www.figma.com/design/jxZZk9scrCUaLFKjubMAXU/TTA-Timeline?node-id=373-16734
// component=TimelineCategory

/**
 * Timeline category accordion, inspected 2026-10-16.
 * Header label/statuses and event cards come from the timeline API. Each category
 * manages its own expanded state and starts expanded, matching the design.
 * Updated 2026-10-26: goal events include numbered cycle dividers in both grouped
 * views, following Monitoring 373:13366 and RTTAPA 373:18354.
 */
import figma from 'figma';

export default {
  id: 'TimelineCategory',
  imports: ["import TimelineCategory from '../components/TimelineCategory';"],
  example: figma.code`<TimelineCategory category={category} events={events} />`,
  metadata: { nestable: true },
};
