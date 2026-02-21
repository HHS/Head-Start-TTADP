import React from 'react';
import { parseDateTimeFromFormat, parseDateTimeFromFormats } from '../lib/dates';
import './ClassScoreBadge.scss';

const BadgeAbove = (fontSize) => (
  <span className={`ttahub-badge--success ${fontSize} text-white text-bold`}>
    Above all thresholds
  </span>
);

const BadgeBelowQuality = (fontSize) => (
  <span className={`ttahub-badge--warning ${fontSize} text-bold`}>
    Below quality
  </span>
);

const BadgeBelowCompetitive = (fontSize) => (
  <span className={`ttahub-badge--error ${fontSize} text-white text-bold`}>
    Below competitive
  </span>
);

export function getScoreBadge(key, score, received, size) {
  const fontSize = size || 'font-sans-2xs';
  if (key === 'ES' || key === 'CO') {
    if (score >= 6) return BadgeAbove(fontSize);
    if (score < 5) return BadgeBelowCompetitive(fontSize);
    return BadgeBelowQuality(fontSize);
  }

  if (key === 'IS') {
    if (score >= 3) return BadgeAbove(fontSize);

    // IS is slightly more complicated.
    // See TTAHUB-2097 for details.
    const dt = parseDateTimeFromFormats(received, ['MM/DD/YYYY', 'MM-DD-YYYY']);
    const thresholdHigh = parseDateTimeFromFormat('2027-08-01', 'YYYY-MM-DD');
    const thresholdStart = parseDateTimeFromFormat('2020-11-09', 'YYYY-MM-DD');
    const thresholdEnd = parseDateTimeFromFormat('2027-07-31', 'YYYY-MM-DD');

    if (dt && thresholdHigh && dt > thresholdHigh) {
      if (score < 2.5) return BadgeBelowCompetitive(fontSize);
      return BadgeBelowQuality(fontSize);
    }

    if (dt && thresholdStart && thresholdEnd && dt > thresholdStart && dt < thresholdEnd) {
      if (score < 2.3) return BadgeBelowCompetitive(fontSize);
      return BadgeBelowQuality(fontSize);
    }
  }

  return null;
}

export default getScoreBadge;
