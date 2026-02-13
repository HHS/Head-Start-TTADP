import React, { useRef, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import WidgetContainer from '../components/WidgetContainer'
import HorizontalTableWidget from './HorizontalTableWidget'
import useMediaCapture from '../hooks/useMediaCapture'
import useWidgetSorting from '../hooks/useWidgetSorting'
import useWidgetExport from '../hooks/useWidgetExport'
import useWidgetMenuItems from '../hooks/useWidgetMenuItems'
import { EMPTY_ARRAY } from '../Constants'
import VBarGraph from './VBarGraph'
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle'
import SecondarySubtitleWithFilterWarning from '../components/WidgetContainer/SecondarySubtitleWithFilterWarning'

const FIRST_COLUMN = 'Specialist role'

const TABLE_HEADINGS = ['Number of activity reports', 'Percentage of activity reports']

const DEFAULT_SORT_CONFIG = {
  sortBy: 'Specialist_role',
  direction: 'asc',
  activePage: 1,
}

const EXPORT_NAME = 'Percentage of Activity Reports by Role'

export default function PercentageActivityReportByRole({ data }) {
  const widgetRef = useRef(null)
  const capture = useMediaCapture(widgetRef, EXPORT_NAME)
  const [showTabularData, setShowTabularData] = useState(false)
  const [checkboxes, setCheckboxes] = useState({})
  const [displayFilteredReports, setDisplayFilteredReports] = useState(0)

  // we have to store this is in state, despite
  // it being a prop, because of other dependencies
  // in the react graph
  const [trace, setTrace] = useState([])
  const [tabularData, setTabularData] = useState([])
  const [totals, setTotals] = useState({
    totalNumberOfReports: 0,
    totalPercentage: 100,
  })

  const [showFiltersNotApplicable, setShowFiltersNotApplicable] = useState(false)

  const { requestSort, sortConfig } = useWidgetSorting(
    'qa-dashboard-percentage-ars-by-role', // localStorageKey
    DEFAULT_SORT_CONFIG, // defaultSortConfig
    tabularData, // dataToUse
    setTabularData, // setDataToUse
    ['Specialist_role'], // stringColumns
    EMPTY_ARRAY, // dateColumns
    EMPTY_ARRAY // keyColumns
  )

  const { exportRows } = useWidgetExport(tabularData, TABLE_HEADINGS, checkboxes, FIRST_COLUMN, EXPORT_NAME)

  // records is an array of objects
  // and the other fields need to be converted to camelCase
  useEffect(() => {
    if (!data) {
      setTabularData([])
      setTrace([])
      setTotals({
        totalNumberOfReports: 0,
        totalPercentage: 100,
      })
      return
    }

    // take the API data
    // and transform it into the format
    // that the LineGraph component expects
    // (an object for each trace)
    // and the table (an array of objects in the format defined by proptypes)
    const { records, filteredReports, showDashboardFiltersNotApplicable: showFiltersNotApplicableProp } = data

    const totalPercentage = records.reduce((acc, record) => acc + record.percentage, 0)
    const totalNumberOfReports = records.reduce((acc, record) => acc + record.role_count, 0)

    const tableData = []
    const traceData = []

    ;(records || []).forEach((dataset, index) => {
      traceData.push({
        name: dataset.role_name,
        count: dataset.percentage,
      })

      tableData.push({
        heading: dataset.role_name,
        id: `${dataset.role_name}-${index + 1}`,
        data: [
          {
            value: dataset.role_count,
            title: 'Number of activity reports',
            sortKey: 'Number_of_activity_reports',
          },
          {
            value: `${String(dataset.percentage)}%`,
            title: 'Percentage of activity reports',
            sortKey: 'Percentage_of_activity_reports',
          },
        ],
      })
    })
    setShowFiltersNotApplicable(showFiltersNotApplicableProp)
    setDisplayFilteredReports(filteredReports)
    setTrace(traceData)
    setTabularData(tableData)
    setTotals({
      totalNumberOfReports,
      totalPercentage,
    })
  }, [data])
  // end use effect

  const menuItems = useWidgetMenuItems(showTabularData, setShowTabularData, capture, checkboxes, exportRows)

  if (!data) return null

  const subtitle = (
    <div className="margin-bottom-3">
      <WidgetContainerSubtitle marginY={0}>Activity report by specialist role</WidgetContainerSubtitle>
      <SecondarySubtitleWithFilterWarning showFiltersNotApplicable={showFiltersNotApplicable}>
        {`${displayFilteredReports ? displayFilteredReports.toLocaleString('en-us') : '0'} Activity reports`}
      </SecondarySubtitleWithFilterWarning>
    </div>
  )

  return (
    <div>
      <WidgetContainer
        loading={false}
        title="Percentage of activity reports by role"
        subtitle={subtitle}
        menuItems={menuItems}
        titleMargin={{ bottom: 1 }}
      >
        {showTabularData ? (
          <HorizontalTableWidget
            headers={TABLE_HEADINGS}
            data={tabularData}
            caption="TTA broken down by delivery method into total hours and percentages"
            firstHeading={FIRST_COLUMN}
            enableSorting
            sortConfig={sortConfig}
            requestSort={requestSort}
            enableCheckboxes
            checkboxes={checkboxes}
            setCheckboxes={setCheckboxes}
            showTotalColumn={false}
            footerData={[
              '', // empty string for the first column, checkboxes
              'Total',
              String(totals.totalNumberOfReports),
              `${String(totals.totalPercentage.toFixed(2))}%`,
            ]}
            hideFirstColumnBorder
            selectAllIdPrefix="qa-dash-percentage-ars-by-role"
          />
        ) : (
          <VBarGraph data={trace} widgetRef={widgetRef} xAxisLabel={FIRST_COLUMN} yAxisLabel="Percentage" widthOffset={0} />
        )}
      </WidgetContainer>
    </div>
  )
}

PercentageActivityReportByRole.propTypes = {
  data: PropTypes.shape({
    showDashboardFiltersNotApplicable: PropTypes.bool,
    totalNumberOfReports: PropTypes.number,
    totalPercentage: PropTypes.number,
    filteredReports: PropTypes.number,
    records: PropTypes.arrayOf(
      PropTypes.shape({
        role_name: PropTypes.string,
        role_count: PropTypes.number,
        percentage: PropTypes.number,
      })
    ),
  }),
}
PercentageActivityReportByRole.defaultProps = {
  data: undefined,
}
