import React from 'react'
import moment from 'moment'
import './ClassScoreBadge.scss'

const BadgeAbove = (fontSize) => <span className={`ttahub-badge--success ${fontSize} text-white text-bold`}>Above all thresholds</span>

const BadgeBelowQuality = (fontSize) => <span className={`ttahub-badge--warning ${fontSize} text-bold`}>Below quality</span>

const BadgeBelowCompetitive = (fontSize) => <span className={`ttahub-badge--error ${fontSize} text-white text-bold`}>Below competitive</span>

export function getScoreBadge(key, score, received, size) {
  const fontSize = size || 'font-sans-2xs'
  if (key === 'ES' || key === 'CO') {
    if (score >= 6) return BadgeAbove(fontSize)
    if (score < 5) return BadgeBelowCompetitive(fontSize)
    return BadgeBelowQuality(fontSize)
  }

  if (key === 'IS') {
    if (score >= 3) return BadgeAbove(fontSize)

    // IS is slightly more complicated.
    // See TTAHUB-2097 for details.
    const dt = moment(received, 'MM/DD/YYYY')

    if (dt.isAfter('2027-08-01')) {
      if (score < 2.5) return BadgeBelowCompetitive(fontSize)
      return BadgeBelowQuality(fontSize)
    }

    if (dt.isAfter('2020-11-09') && dt.isBefore('2027-07-31')) {
      if (score < 2.3) return BadgeBelowCompetitive(fontSize)
      return BadgeBelowQuality(fontSize)
    }
  }

  return null
}

export default getScoreBadge
