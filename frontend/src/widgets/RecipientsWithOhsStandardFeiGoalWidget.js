import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { RECIPIENTS_WITH_OHS_STANDARD_FEI_GOAL_PER_PAGE } from '../Constants'
import HorizontalTableWidget from './HorizontalTableWidget'
import WidgetContainer from '../components/WidgetContainer'
import useWidgetPaging from '../hooks/useWidgetPaging'
import DrawerTriggerButton from '../components/DrawerTriggerButton'
import Drawer from '../components/Drawer'
import ContentFromFeedByTag from '../components/ContentFromFeedByTag'
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle'

function RecipientsWithOhsStandardFeiGoalWidget({ data, loading, resetPagination, setResetPagination }) {
  const { pageData, widgetData } = data
  const defaultSortConfig = {
    sortBy: 'Goal_status',
    direction: 'desc',
    activePage: 1,
  }

  const [recipientDataToUse, setRecipientDataToUse] = useState([])
  const [recipientCount, setRecipientCount] = useState(0)
  const [localLoading, setLocalLoading] = useState(false)
  const [recipientsPerPage, setRecipientsPerPage] = useState([])
  const [checkBoxes, setCheckBoxes] = useState({})

  const titleDrawerRef = useRef(null)
  const subtitleDrawerLinkRef = useRef(null)

  const { offset, activePage, handlePageChange, requestSort, exportRows, sortConfig } = useWidgetPaging(
    pageData ? pageData.headers : [],
    'recipientsWithOhsStandardFeiGoal',
    defaultSortConfig,
    RECIPIENTS_WITH_OHS_STANDARD_FEI_GOAL_PER_PAGE,
    recipientDataToUse, // Data to use.
    setRecipientDataToUse,
    resetPagination,
    setResetPagination,
    loading,
    checkBoxes,
    'RecipientsWithOhsStandardFeiGoal',
    setRecipientsPerPage,
    ['Recipient', 'Goal_number', 'Goal_status', 'Root_cause'],
    ['Goal_created_on'],
    'recipientsWithOhsStandardFeiGoal.csv',
    null,
    ['Goal_status']
  )

  useEffect(() => {
    try {
      // Set local data.
      setLocalLoading(true)
      const recipientToUse = pageData ? pageData.RecipientsWithOhsStandardFeiGoal : []
      setRecipientDataToUse(recipientToUse)
      setRecipientCount(recipientToUse.length)
    } finally {
      setLocalLoading(false)
    }
  }, [pageData, widgetData])

  const getSubtitleWithPct = () => {
    const totalRecipients = widgetData ? widgetData.total : 0
    const pct = widgetData ? widgetData['% recipients with fei'] : 0
    const recipientsWithFei = widgetData ? widgetData['recipients with fei'] : 0
    const numberOfGrants = widgetData ? widgetData['grants with fei'] : 0
    return `${recipientsWithFei} of ${totalRecipients} (${pct}%) recipients (${numberOfGrants} grants)`
  }

  const menuItems = [
    {
      label: 'Export selected rows',
      onClick: () => {
        exportRows('selected')
      },
    },
    {
      label: 'Export table',
      onClick: () => {
        exportRows('all')
      },
    },
  ]

  const subtitle = (
    <>
      <DrawerTriggerButton drawerTriggerRef={titleDrawerRef} customClass="margin-bottom-2">
        Learn about the OHS standard goal
      </DrawerTriggerButton>
      <Drawer triggerRef={titleDrawerRef} stickyHeader stickyFooter title="OHS standard FEI goal">
        <ContentFromFeedByTag tagName="ttahub-ohs-standard-fei-goal" />
      </Drawer>
      <WidgetContainerSubtitle>Root causes were identified through self-reported data.</WidgetContainerSubtitle>
      <p className="usa-prose margin-x-0 margin-top-0 margin-bottom-2">
        <strong>{getSubtitleWithPct()}</strong>
      </p>
      <div className="smart-hub--table-widget-subtitle margin-x-0 margin-top-0 margin-bottom-3">
        <DrawerTriggerButton drawerTriggerRef={subtitleDrawerLinkRef} removeLeftMargin>
          Learn about root causes
        </DrawerTriggerButton>
        <Drawer triggerRef={subtitleDrawerLinkRef} stickyHeader stickyFooter title="FEI root cause">
          <ContentFromFeedByTag tagName="ttahub-fei-root-causes" />
        </Drawer>
      </div>
    </>
  )

  return (
    <>
      <WidgetContainer
        title="Recipients with OHS standard FEI goal"
        titleMargin={{
          bottom: 1,
        }}
        subtitle={subtitle}
        loading={loading || localLoading}
        loadingLabel="Recipients with OHS standard FEI goal loading"
        showPagingBottom
        currentPage={activePage}
        totalCount={recipientCount}
        offset={offset}
        perPage={RECIPIENTS_WITH_OHS_STANDARD_FEI_GOAL_PER_PAGE}
        handlePageChange={handlePageChange}
        menuItems={menuItems}
        enableCheckboxes
        exportRows={exportRows}
      >
        <HorizontalTableWidget
          headers={pageData ? pageData.headers : []}
          data={recipientsPerPage || []}
          firstHeading="Recipient"
          enableSorting
          sortConfig={sortConfig}
          requestSort={requestSort}
          enableCheckboxes
          checkboxes={checkBoxes}
          setCheckboxes={setCheckBoxes}
          showTotalColumn={false}
          hideFirstColumnBorder
        />
      </WidgetContainer>
    </>
  )
}

RecipientsWithOhsStandardFeiGoalWidget.propTypes = {
  data: PropTypes.shape({
    pageData: PropTypes.oneOfType([
      PropTypes.shape({
        headers: PropTypes.arrayOf(PropTypes.string),
        RecipientsWithOhsStandardFeiGoal: PropTypes.arrayOf(
          PropTypes.shape({
            recipientName: PropTypes.string,
            goalNumber: PropTypes.number,
            goalStatus: PropTypes.string,
            rootCause: PropTypes.string,
            createdAt: PropTypes.string,
          })
        ),
      }),
      PropTypes.shape({}),
    ]),
    widgetData: PropTypes.shape({
      'recipients with fei': PropTypes.number,
      total: PropTypes.number,
      '% recipients with fei': PropTypes.number,
      'grants with fei': PropTypes.number,
    }),
  }),
  resetPagination: PropTypes.bool,
  setResetPagination: PropTypes.func,
  loading: PropTypes.bool.isRequired,
}

RecipientsWithOhsStandardFeiGoalWidget.defaultProps = {
  data: { headers: [], RecipientsWithOhsStandardFeiGoal: [] },
  resetPagination: false,
  setResetPagination: () => {},
}

export default RecipientsWithOhsStandardFeiGoalWidget
