import React, { useRef, useState } from 'react'
import PropTypes from 'prop-types'
import VBarGraph from './VBarGraph'
import withWidgetData from './withWidgetData'
import WidgetContainer from '../components/WidgetContainer'
import HorizontalTableWidget from './HorizontalTableWidget'
import useMediaCapture from '../hooks/useMediaCapture'
import { NOOP } from '../Constants'

const FIRST_HEADING = 'National Center'
const HEADINGS = ['Hours']

const TITLE = 'Hours of training by National Center'

const TRHoursWidget = ({ data }) => {
  const widgetRef = useRef(null)
  const [showTabularData, setShowTabularData] = useState(false)
  const capture = useMediaCapture(widgetRef, TITLE)

  const menuItems = [
    {
      label: showTabularData ? 'Display graph' : 'Display table',
      onClick: () => setShowTabularData(!showTabularData),
    },
  ]

  if (!showTabularData) {
    menuItems.push({
      label: 'Save screenshot',
      onClick: capture,
    })
  }

  const tabularData = data.map((row, index) => ({
    heading: row.name,
    id: index + 1,
    data: [
      {
        value: row.count,
        title: 'Hours',
        sortKey: 'Hours',
      },
    ],
  }))

  return (
    <WidgetContainer
      loading={false}
      title="Hours of training by National Center"
      subtitle="Hours reported on Training Report sessions"
      showHeaderBorder={false}
      menuItems={menuItems}
    >
      {showTabularData ? (
        <div className="padding-3">
          <HorizontalTableWidget
            headers={HEADINGS}
            data={tabularData}
            caption="Hours reported on Training Report sessions"
            firstHeading={FIRST_HEADING}
            enableSorting={false}
            requestSort={NOOP}
            enableCheckboxes={false}
            showTotalColumn={false}
            footerData={false}
          />
        </div>
      ) : (
        <VBarGraph xAxisLabel="National Center" yAxisLabel="Number of hours" data={data} widgetRef={widgetRef} />
      )}
    </WidgetContainer>
  )
}

TRHoursWidget.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      count: PropTypes.number,
    })
  ),
}

TRHoursWidget.defaultProps = {
  data: [],
}

export default withWidgetData(TRHoursWidget, 'trHoursOfTrainingByNationalCenter')
