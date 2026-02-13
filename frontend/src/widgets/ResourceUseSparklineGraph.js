import React from 'react'
import PropTypes from 'prop-types'
import { uniqueId } from 'lodash'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'
import ResourceUseSparkline from './ResourceUseSparkline'
import colors from '../colors'
import './ResourceUseSparklineGraph.scss'

const ResourceLink = ({ url, title }) => {
  if (!url) {
    return title || ''
  }

  return (
    <div className="padding-x-3 display-flex  padding-y-1 border-bottom smart-hub-border-base-lighter flex-justify flex-align-center">
      <a
        href={url}
        className="usa-prose text-overflow-ellipsis ttahub-resource-use-sparkline-resource-title"
        key={uniqueId('ttahub-resource-use-sparkline-resource-title')}
      >
        {title || url}
      </a>
      <FontAwesomeIcon color={colors.ttahubBlue} icon={faArrowUpRightFromSquare} size="xs" />
    </div>
  )
}

ResourceLink.propTypes = {
  title: PropTypes.string,
  url: PropTypes.string,
}

ResourceLink.defaultProps = {
  title: '',
  url: '',
}

function LegendIndicator({ color }) {
  return (
    <div className={`ttahub-resource-use-sparkline--legend__item width-3 height-3 radius-md ttahub-resource-use-sparkline--legend__item--${color}`} />
  )
}

LegendIndicator.propTypes = {
  color: PropTypes.string.isRequired,
}

export default function ResourceUseSparklineGraph({ data }) {
  const headings = data.headers.map((header) => (
    <span
      key={uniqueId('resource-use-sparkline-headings-')}
      className="ttahub-resource-use-sparkline__heading usa-prose display-flex flex-justify-center flex-align-center"
      aria-label={header.name}
    >
      <span aria-hidden="true">{header.displayName}</span>
    </span>
  ))

  return (
    <>
      <div className="ttahub-resource-use-sparkline--legend padding-left-3 display-flex margin-y-2">
        <LegendIndicator color="blue" />
        <span className="usa-prose">Activity reports citing resource</span>
        <LegendIndicator color="orange" />
        <span className="usa-prose">Highest count during date range</span>
      </div>
      <div className="ttahub-resource-use-sparkline overflow-x-scroll">
        <div className="ttahub-resource-use-sparkline__heading-group ">
          <span className="ttahub-resource-use-sparkline__resource-heading display-flex height-full flex-align-center usa-prose z-100 bg-white position-sticky left-0 padding-left-3 border-right border-bottom smart-hub-border-base-lighter">
            Resource URL
          </span>
          <div className="ttahub-resource-use-sparkline__headings border-bottom smart-hub-border-base-lighter display-flex height-full">
            {headings}
          </div>
          <span className="ttahub-resource-use-sparkline__resource-heading-total display-flex height-full flex-align-center usa-prose z-100 bg-white border-bottom smart-hub-border-base-lighter position-sticky text-center border-left right-0 padding-right-3">
            <strong className="display-inline-block margin-x-auto">Total</strong>
          </span>
        </div>
        <div className="ttahub-resource-use-sparkline__graphs">
          <div className="display-flex flex-column z-100 bg-white position-sticky left-0 border-right">
            {data.resources.map((resource) => (
              <ResourceLink url={resource.url} title={resource.title} key={uniqueId('ttahub-resource-use-sparkline-resource-link')} />
            ))}
          </div>

          <div>
            {data.resources.map((resource) => (
              <ResourceUseSparkline key={uniqueId('ttahub-resource-use-sparkline-resource')} dataPoints={resource} />
            ))}
          </div>

          <span className="display-flex flex-column height-full usa-prose z-100 bg-white position-sticky border-left right-0">
            {data.resources.map((resource) => (
              <span
                className="usa-prose display-block text-bold border-bottom smart-hub-border-base-lighter padding-right-3 padding-left-2 padding-y-1"
                key={uniqueId('ttahub-resource-use-sparkline-resource-totals')}
              >
                {resource.total}
              </span>
            ))}
          </span>
        </div>
      </div>
    </>
  )
}

ResourceUseSparklineGraph.propTypes = {
  data: PropTypes.shape({
    headers: PropTypes.arrayOf(
      PropTypes.shape({
        displayName: PropTypes.string,
        name: PropTypes.string,
      })
    ),
    resources: PropTypes.arrayOf(
      PropTypes.shape({
        data: PropTypes.arrayOf(
          PropTypes.shape({
            title: PropTypes.string,
            value: PropTypes.string,
          })
        ),
        heading: PropTypes.string,
        isUrl: PropTypes.bool,
        sortBy: PropTypes.string,
        title: PropTypes.string,
        total: PropTypes.string,
        url: PropTypes.string,
      })
    ),
  }),
}

ResourceUseSparklineGraph.defaultProps = {
  data: {
    headers: [],
    resources: [],
  },
}
