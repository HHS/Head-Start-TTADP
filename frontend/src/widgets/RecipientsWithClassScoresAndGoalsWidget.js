import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { DECIMAL_BASE } from '@ttahub/common'
import { Dropdown, Checkbox, Label, Button } from '@trussworks/react-uswds'
import { v4 as uuidv4 } from 'uuid'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons'
import colors from '../colors'
import { RECIPIENTS_WITH_CLASS_SCORES_AND_GOALS_GOAL_PER_PAGE } from '../Constants'
import WidgetContainer from '../components/WidgetContainer'
import useWidgetPaging from '../hooks/useWidgetPaging'
import DrawerTriggerButton from '../components/DrawerTriggerButton'
import Drawer from '../components/Drawer'
import ContentFromFeedByTag from '../components/ContentFromFeedByTag'
import RecipientCard from '../pages/QADashboard/Components/RecipientCard'
import './QaDetailsDrawer.scss'

function RecipientsWithClassScoresAndGoalsWidget({ data, parentLoading }) {
  const { widgetData, pageData } = data
  const titleDrawerRef = useRef(null)
  const subtitleRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [allRecipientsData, setAllRecipientsData] = useState([])
  const [recipientsDataToDisplay, setRecipientsDataToDisplay] = useState([])
  const [selectedRecipientCheckBoxes, setSelectedRecipientCheckBoxes] = useState({})
  const [allRecipientsChecked, setAllRecipientsChecked] = useState(false)
  const [resetPagination, setResetPagination] = useState(false)
  const [perPage, setPerPage] = useState([RECIPIENTS_WITH_CLASS_SCORES_AND_GOALS_GOAL_PER_PAGE])

  const defaultSort = {
    sortBy: 'name',
    direction: 'asc',
    activePage: 1,
  }

  const { handlePageChange, requestSort, exportRows, sortConfig, setSortConfig } = useWidgetPaging(
    ['lastArStartDate', 'emotionalSupport', 'classroomOrganization', 'instructionalSupport', 'reportReceivedDate'],
    'recipientsWithClassScoresAndGoals',
    defaultSort,
    RECIPIENTS_WITH_CLASS_SCORES_AND_GOALS_GOAL_PER_PAGE,
    allRecipientsData, // data to use.
    setAllRecipientsData,
    resetPagination,
    setResetPagination,
    loading,
    selectedRecipientCheckBoxes,
    'recipientsWithClassScoresAndGoals',
    setRecipientsDataToDisplay,
    ['name'],
    ['lastARStartDate', 'reportDeliveryDate'],
    'recipientsWithClassScoresAndGoals.csv',
    'dataForExport'
  )

  const perPageChange = (e) => {
    const perPageValue = parseInt(e.target.value, DECIMAL_BASE)
    setSortConfig({
      ...sortConfig,
      activePage: 1,
      offset: 0,
    })

    // Use splice to get the new data to display.
    setRecipientsDataToDisplay(allRecipientsData.slice(0, perPageValue))
    setPerPage(perPageValue)
  }

  const setSortBy = (e) => {
    const [sortBy, direction] = e.target.value.split('-')
    requestSort(sortBy, direction)
  }

  const getSubtitleWithPct = () => {
    const totalRecipients = widgetData ? widgetData.total : 0
    const grants = widgetData ? widgetData['grants with class'] : 0
    const pct = widgetData ? widgetData['% recipients with class'] : 0
    const recipoientsWithClass = widgetData ? widgetData['recipients with class'] : 0
    return `${recipoientsWithClass} of ${totalRecipients} (${pct}%) recipients (${grants} grants)`
  }

  const makeRecipientCheckboxes = (goalsArr, checked) => goalsArr.reduce((obj, g) => ({ ...obj, [g.id]: checked }), {})

  const selectAllRecipientsCheckboxSelect = (event) => {
    const { target: { checked = null } = {} } = event
    // Preserve checked recipients on other pages.
    const thisPagesRecipientIds = allRecipientsData.map((g) => g.id)
    const preservedCheckboxes = Object.keys(selectedRecipientCheckBoxes).reduce((obj, key) => {
      if (!thisPagesRecipientIds.includes(parseInt(key, DECIMAL_BASE))) {
        return { ...obj, [key]: selectedRecipientCheckBoxes[key] }
      }
      return { ...obj }
    }, {})

    if (checked === true) {
      setSelectedRecipientCheckBoxes({
        ...makeRecipientCheckboxes(allRecipientsData, true),
        ...preservedCheckboxes,
      })
    } else {
      setSelectedRecipientCheckBoxes({
        ...makeRecipientCheckboxes(allRecipientsData, false),
        ...preservedCheckboxes,
      })
    }
  }

  useEffect(() => {
    try {
      // Set local data.
      setLoading(true)
      setAllRecipientsData(pageData || [])
    } finally {
      setLoading(false)
    }
  }, [pageData])

  useEffect(() => {
    const recipientIds = allRecipientsData.map((g) => g.id)
    const countOfCheckedOnThisPage = recipientIds.filter((id) => selectedRecipientCheckBoxes[id]).length
    if (allRecipientsData.length === countOfCheckedOnThisPage) {
      setAllRecipientsChecked(true)
    } else {
      setAllRecipientsChecked(false)
    }
  }, [selectedRecipientCheckBoxes, allRecipientsData])

  const handleRecipientCheckboxSelect = (event) => {
    const { target: { checked = null, value = null } = {} } = event
    if (checked === true) {
      setSelectedRecipientCheckBoxes({ ...selectedRecipientCheckBoxes, [value]: true })
    } else {
      setSelectedRecipientCheckBoxes({ ...selectedRecipientCheckBoxes, [value]: false })
    }
  }

  /* istanbul ignore next: hard to test */
  const handleExportRows = () => {
    const selectedRecipientIds = Object.keys(selectedRecipientCheckBoxes).filter((key) => selectedRecipientCheckBoxes[key])
    if (selectedRecipientIds.length > 0) {
      exportRows('selected')
    } else {
      exportRows('all')
    }
  }

  const selectedRecipientCheckBoxesCount = Object.keys(selectedRecipientCheckBoxes).filter((key) => selectedRecipientCheckBoxes[key]).length

  const subtitle = (
    <>
      <div className="margin-bottom-2">
        <DrawerTriggerButton drawerTriggerRef={titleDrawerRef}>Learn about the OHS standard CLASS&reg; goal</DrawerTriggerButton>
        <Drawer triggerRef={titleDrawerRef} stickyHeader stickyFooter title="OHS standard CLASS&reg; goal">
          <ContentFromFeedByTag tagName="ttahub-ohs-standard-class-goal" />
        </Drawer>
      </div>
      <div className="smart-hub--table-widget-subtitle margin-x-0 margin-bottom-2">
        <DrawerTriggerButton drawerTriggerRef={subtitleRef} removeLeftMargin>
          How are thresholds met?
        </DrawerTriggerButton>
        <Drawer triggerRef={subtitleRef} stickyHeader stickyFooter title="CLASS&reg; review thresholds">
          <ContentFromFeedByTag tagName="ttahub-class-thresholds" />
        </Drawer>
      </div>
      <p className="margin-top-0 margin-bottom-3 usa-prose text-bold">{getSubtitleWithPct()}</p>
    </>
  )

  return (
    <WidgetContainer
      title="Recipients with CLASS&reg; scores and goals"
      loading={loading || parentLoading}
      loadingLabel="Recipients with CLASS&reg; scores and goals loading"
      showPagingBottom
      currentPage={sortConfig.activePage}
      totalCount={allRecipientsData.length}
      offset={sortConfig.offset}
      perPage={perPage}
      handlePageChange={handlePageChange}
      enableCheckboxes
      exportRows={exportRows}
      subtitle={subtitle}
      displayPaginationBoxOutline
      showHeaderBorder={false}
      titleMargin={{
        left: 0,
        right: 0,
        top: 0,
        bottom: 1,
      }}
    >
      <div className="bg-white padding-x-3">
        <div className="desktop:display-flex flex-justify smart-hub-border-base-lighter border-bottom">
          <div className="flex-align-center margin-bottom-3 display-flex">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label className="display-block margin-right-1" style={{ minWidth: 'max-content' }} htmlFor="sortBy">
              Sort by
            </label>
            <Dropdown
              onChange={setSortBy}
              value={`${sortConfig.sortBy}-${sortConfig.direction}`}
              className="margin-top-0"
              id="sortBy"
              name="sortBy"
              data-testid="sortGoalsBy"
            >
              <option value="name-asc">Recipient name (A-Z) </option>
              <option value="name-desc">Recipient name (Z-A) </option>
              <option value="reportDeliveryDate-desc">Report received (newest to oldest) </option>
              <option value="reportDeliveryDate-asc">Report received (oldest to newest) </option>
              <option value="lastARStartDate-desc">Last AR start date (newest to oldest) </option>
              <option value="lastARStartDate-asc">Last AR start date (oldest to newest) </option>
            </Dropdown>
          </div>
          <div className="flex-align-center margin-bottom-3 display-flex">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <Label className="display-block margin-right-1 margin-y-0" style={{ minWidth: 'max-content' }} htmlFor="perPage">
              Show
            </Label>
            <Dropdown
              className="margin-top-0 margin-right-1 width-auto"
              id="perPage"
              name="perPage"
              data-testid="perPage"
              onChange={perPageChange}
              aria-label="Select recipients per page"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value={allRecipientsData.length}>all</option>
            </Dropdown>
          </div>
        </div>
        <div className="ttahub-recipients-with-ohs-standard-fei-goal---recipient-cards padding-top-3">
          <div className="display-flex flex-align-center margin-bottom-3 margin-left-3">
            <Checkbox
              label="Select all"
              id="select-all-recipients-checkboxes"
              aria-label="select all recipients"
              checked={allRecipientsChecked}
              onChange={selectAllRecipientsCheckboxSelect}
            />
            {selectedRecipientCheckBoxesCount > 0 && (
              <span className="filter-pill-container smart-hub-border-blue-primary border-2px margin-left-2 margin-right-1 radius-pill padding-right-1 padding-left-2 padding-y-05">
                <span>{selectedRecipientCheckBoxesCount} selected </span>
                <Button
                  className="smart-hub--select-tag__button"
                  unstyled
                  aria-label="deselect all goals"
                  onClick={() => {
                    selectAllRecipientsCheckboxSelect({ target: { checked: false } })
                  }}
                >
                  <FontAwesomeIcon
                    className="margin-left-1 margin-top-2px filter-pills-cursor"
                    color={colors.ttahubMediumBlue}
                    icon={faTimesCircle}
                  />
                </Button>
              </span>
            )}
            {selectedRecipientCheckBoxesCount > 0 && (
              <Button unstyled onClick={handleExportRows} className="margin-left-3">
                Export selected
              </Button>
            )}
          </div>
          {recipientsDataToDisplay.map((r, index) => (
            <RecipientCard
              key={uuidv4()}
              recipient={r}
              zIndex={allRecipientsData.length - index}
              handleGoalCheckboxSelect={handleRecipientCheckboxSelect}
              isChecked={selectedRecipientCheckBoxes[r.id] || false}
            />
          ))}
        </div>
      </div>
    </WidgetContainer>
  )
}

RecipientsWithClassScoresAndGoalsWidget.propTypes = {
  data: PropTypes.shape({
    widgetData: PropTypes.shape({
      total: PropTypes.number,
      '% recipients with class': PropTypes.number,
      'recipients with class': PropTypes.number,
      'grants with class': PropTypes.number,
    }),
    pageData: PropTypes.oneOfType([
      PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
        lastArStartDate: PropTypes.string,
        lastArEndDate: PropTypes.string,
        emotionalSupport: PropTypes.number,
        classroomOrganization: PropTypes.number,
        instructionalSupport: PropTypes.number,
        reportReceivedDate: PropTypes.string,
        goals: PropTypes.arrayOf(
          PropTypes.shape({
            goalNumber: PropTypes.string,
            status: PropTypes.string,
            creator: PropTypes.string,
            collaborator: PropTypes.string,
          })
        ),
      }),
      PropTypes.shape({}),
    ]),
  }),
  parentLoading: PropTypes.bool.isRequired,
}

RecipientsWithClassScoresAndGoalsWidget.defaultProps = {
  data: { headers: [], RecipientsWithOhsStandardFeiGoal: [] },
}

export default RecipientsWithClassScoresAndGoalsWidget
