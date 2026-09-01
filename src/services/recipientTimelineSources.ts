/**
 * A code-owned timeline source mapped into the common event-index shape.
 *
 * The query must return sourceId, date, eventType, recipientId, and regionId. Source queries may
 * return duplicate rows when an event is associated with multiple grants; the shared index applies
 * recipient/region scope and removes duplicates before counting and pagination.
 */
export interface TimelineEventSource {
  /** Stable discriminator that, together with sourceId, identifies an event globally. */
  readonly name: string;
  readonly query: string;
}

/**
 * Production timeline sources are registered here as their source implementations are added.
 * Keeping this registry code-owned prevents request handlers from selecting sources or supplying
 * SQL at runtime.
 */
export const RECIPIENT_TIMELINE_SOURCES: readonly TimelineEventSource[] = Object.freeze([]);
