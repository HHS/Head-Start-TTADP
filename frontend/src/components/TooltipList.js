/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react'
import PropTypes from 'prop-types'
import Tooltip from './Tooltip'

export default function TooltipList({ list, cardType, listType }) {
  if (!list.length) {
    return null
  }

  if (list.length === 1) {
    return <p className="usa-prose margin-y-0">{list[0]}</p>
  }

  return (
    <>
      <p className={`usa-prose margin-y-0 ttahub-${cardType}-card__${cardType}-${listType}-csv`}>{list.join(', ')}</p>
      <p className={`usa-prose margin-y-0 ttahub-${cardType}-card__${cardType}-${listType}-tool-tip`}>{list[0]}</p>
      <Tooltip
        className={`usa-prose ttahub-${cardType}-card__${cardType}-${listType}-tool-tip`}
        screenReadDisplayText={false}
        displayText={`View all ${listType}`}
        buttonLabel={list.join(' ')}
        tooltipText={list.map((item) => (
          <span key={item} className="width-card display-block padding-bottom-1">
            {item}
          </span>
        ))}
      />
    </>
  )
}

TooltipList.propTypes = {
  list: PropTypes.arrayOf(PropTypes.string).isRequired,
  listType: PropTypes.string.isRequired,
  cardType: PropTypes.string.isRequired,
}
