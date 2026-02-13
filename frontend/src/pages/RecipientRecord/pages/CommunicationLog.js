import React, { useState, useContext, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { Helmet } from 'react-helmet'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { useHistory } from 'react-router-dom'
import { deleteCommunicationLogById, getCommunicationLogsByRecipientId } from '../../../fetchers/communicationLog'
import AppLoadingContext from '../../../AppLoadingContext'
import WidgetContainer from '../../../components/WidgetContainer'
import HorizontalTableWidget from '../../../widgets/HorizontalTableWidget'
import FilterPanel from '../../../components/filter/FilterPanel'
import UserContext from '../../../UserContext'
import useFilters from '../../../hooks/useFilters'
import { communicationDateFilter, creatorFilter, methodFilter, resultFilter } from '../../../components/filter/communicationLogFilters'
import useWidgetMenuItems from '../../../hooks/useWidgetMenuItems'
import useWidgetSorting from '../../../hooks/useWidgetSorting'
import { EMPTY_ARRAY } from '../../../Constants'
import Modal from '../../../components/Modal'
import { UsersIcon } from '../../../components/icons'
import useAsyncWidgetExport from '../../../hooks/useAsyncWidgetExport'

const COMMUNICATION_LOG_PER_PAGE = 10
const FILTER_KEY = 'communication-log-filters'

const DEFAULT_SORT_CONFIG = {
  sortBy: 'communicationDate',
  direction: 'desc',
  activePage: 1,
}

const COMMUNICATION_LOG_FILTER_CONFIG = [methodFilter, resultFilter, creatorFilter, communicationDateFilter]

COMMUNICATION_LOG_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display))

const headers = ['Date', 'Purpose', 'Goals', 'Creator name', 'Other TTA staff', 'Result']

const DeleteLogModal = ({ modalRef, onLogRemoved, log }) => {
  const onDeleteLog = () => {
    // istanbul ignore next - tested elsewhere
    onLogRemoved(log).then(modalRef.current.toggleModal(false))
  }

  return (
    <>
      <Modal
        modalRef={modalRef}
        onOk={onDeleteLog}
        modalId="DeleteLogModal"
        title="Are you sure you want to delete this log?"
        okButtonText="Delete"
        okButtonAriaLabel="Confirm delete and reload page"
        showCloseX
      >
        <p>This action cannot be undone.</p>
      </Modal>
    </>
  )
}

DeleteLogModal.propTypes = {
  modalRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape()]).isRequired,
  onLogRemoved: PropTypes.func.isRequired,
  log: PropTypes.shape({
    id: PropTypes.number,
    displayId: PropTypes.string,
    data: PropTypes.shape({
      communicationDate: PropTypes.string,
      purpose: PropTypes.string,
      result: PropTypes.string,
    }),
    userId: PropTypes.number,
  }),
}

DeleteLogModal.defaultProps = {
  log: null,
}

export default function CommunicationLog({ regionId, recipientId }) {
  const [logs, setLogs] = useState()
  const [error, setError] = useState()
  const [showTabularData, setShowTabularData] = useState(true)
  const [checkboxes, setCheckboxes] = useState({})
  const [tabularData, setTabularData] = useState([])
  const [logToDelete, setLogToDelete] = useState(null)
  const modalRef = useRef()
  const history = useHistory()

  const { user } = useContext(UserContext)
  const { setIsAppLoading } = useContext(AppLoadingContext)

  const { filters, onApplyFilters, onRemoveFilter } = useFilters(user, FILTER_KEY, false, [], COMMUNICATION_LOG_FILTER_CONFIG)

  const { requestSort, sortConfig, setSortConfig } = useWidgetSorting(
    'communication-log-table', // localStorageKey
    DEFAULT_SORT_CONFIG, // defaultSortConfig
    tabularData, // dataToUse
    setTabularData, // setDataToUse
    headers, // stringColumns
    ['Date'], // dateColumns
    EMPTY_ARRAY // keyColumns
  )

  // istanbul ignore next - hard to test here
  const { exportRows } = useAsyncWidgetExport(
    checkboxes,
    'Communication_Log_Export',
    sortConfig,
    useCallback(
      async (sortBy, direction, limit, offset, dataFilters, format) =>
        getCommunicationLogsByRecipientId(String(regionId), String(recipientId), sortBy, direction, offset, limit, dataFilters, format),
      [recipientId, regionId]
    ),
    filters
  )

  const menuItems = useWidgetMenuItems(
    showTabularData,
    setShowTabularData,
    null, // capture function
    checkboxes,
    exportRows
  ).filter((m) => !m.label.includes('Display'))

  const handleDelete = (log) => {
    setLogToDelete(log)
    modalRef.current.toggleModal(true)
  }

  const handleRowActionClick = (action, row) => {
    if (action === 'View') {
      history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/communication/${row.id}/view`)
    } else if (action === 'Delete') {
      handleDelete(row)
    }
  }

  useDeepCompareEffect(() => {
    async function fetchLogs() {
      try {
        setError(null)
        setIsAppLoading(true)
        const response = await getCommunicationLogsByRecipientId(
          String(regionId),
          String(recipientId),
          sortConfig.sortBy,
          sortConfig.direction,
          sortConfig.offset || 0,
          COMMUNICATION_LOG_PER_PAGE,
          filters
        )

        const data = response.rows.map((log) => ({
          heading: log.displayId,
          id: log.id,
          isUrl: true,
          isInternalLink: true,
          link: `/recipient-tta-records/${recipientId}/region/${regionId}/communication/${log.id}/view`,
          suffixContent: log.recipients && log.recipients.length > 1 ? <UsersIcon /> : null,
          data: [
            { title: 'Date', value: log.data.communicationDate },
            { title: 'Purpose', value: log.data.purpose, tooltip: true },
            { title: 'Goals', value: (log.data.goals || []).map((g) => g.label).join(', '), tooltip: true },
            { title: 'Creator name', value: log.authorName },
            { title: 'Other TTA staff', value: (log.data.otherStaff || []).map((u) => u.label).join(', '), tooltip: true },
            { title: 'Result', value: log.data.result, tooltip: true },
            { title: 'Recipient next steps', value: log.data.recipientNextSteps.map((s) => s.note).join(', '), hidden: true },
            { title: 'Specialist next steps', value: log.data.specialistNextSteps.map((s) => s.note).join(', '), hidden: true },
            { title: 'Files', value: log.files.map((f) => f.originalFileName).join(', '), hidden: true },
          ],
          actions:
            log.userId === user.id
              ? [
                  { label: 'View', onClick: () => handleRowActionClick('View', log) },
                  { label: 'Delete', onClick: () => handleRowActionClick('Delete', log) },
                ]
              : [{ label: 'View', onClick: () => handleRowActionClick('View', log) }],
        }))

        setLogs(response)
        setTabularData(data)
      } catch (err) {
        setError('Error fetching communication logs')
      } finally {
        setIsAppLoading(false)
      }
    }
    fetchLogs()
  }, [recipientId, regionId, setIsAppLoading, sortConfig, filters])

  const deleteLog = async (log) => {
    try {
      await deleteCommunicationLogById(log.id)
      window.location.reload()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error deleting log:', err)
    }
  }

  const handlePageChange = (pageNumber) => {
    // eslint-disable-next-line max-len
    setSortConfig({ ...sortConfig, activePage: pageNumber, offset: (pageNumber - 1) * COMMUNICATION_LOG_PER_PAGE })
  }

  return (
    <>
      <Helmet>
        <title>Communication</title>
      </Helmet>
      <div className="display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2">
        <FilterPanel
          applyButtonAria="apply filters on communication logs"
          filters={filters}
          onApplyFilters={onApplyFilters}
          onRemoveFilter={onRemoveFilter}
          filterConfig={COMMUNICATION_LOG_FILTER_CONFIG}
          allUserRegions={[]}
          manageRegions={false}
        />
      </div>
      <WidgetContainer
        menuItems={logs && logs.count > 0 ? menuItems : []}
        className="maxw-widescreen"
        title="Communication log"
        showPagingBottom={logs && logs.count > 0}
        showPagingTop={false}
        loading={false}
        currentPage={sortConfig.activePage}
        totalCount={logs ? logs.count : 0}
        offset={sortConfig.offset}
        perPage={COMMUNICATION_LOG_PER_PAGE}
        error={error}
        handlePageChange={handlePageChange}
        titleMargin={{ bottom: 3 }}
      >
        {logs && logs.count > 0 ? (
          <HorizontalTableWidget
            headers={headers}
            data={tabularData}
            firstHeading="Log ID"
            lastHeading=""
            enableCheckboxes
            checkboxes={checkboxes}
            setCheckboxes={setCheckboxes}
            enableSorting
            sortConfig={sortConfig}
            requestSort={requestSort}
            showTotalColumn={false}
            showDashForNullValue
          />
        ) : (
          <div className="display-flex flex-column flex-align-center flex-justify-center width-full padding-4 minh-tablet">
            <p className="usa-prose text-center bold">
              <strong>You haven&apos;t logged any communication yet.</strong>
              <br />
              You can record interactions with recipients that are not included in an activity report here.
              <br />
              Click the &quot;Add communication&quot; button to get started.
            </p>
          </div>
        )}
      </WidgetContainer>
      <DeleteLogModal modalRef={modalRef} onLogRemoved={deleteLog} log={logToDelete} />
    </>
  )
}

CommunicationLog.propTypes = {
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}
