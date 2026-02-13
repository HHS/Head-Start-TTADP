import React, { useState, useContext, useRef } from 'react'
import PropTypes from 'prop-types'
import { useHistory } from 'react-router-dom'
import useDeepCompareEffect from 'use-deep-compare-effect'
import Modal from '../../../components/Modal'
import WidgetContainer from '../../../components/WidgetContainer'
import useWidgetMenuItems from '../../../hooks/useWidgetMenuItems'
import UserContext from '../../../UserContext'
import useWidgetSorting from '../../../hooks/useWidgetSorting'
import { EMPTY_ARRAY } from '../../../Constants'
import { deleteCommunicationLogById, getCommunicationLogs } from '../../../fetchers/communicationLog'
import AppLoadingContext from '../../../AppLoadingContext'
import { UserGroupIcon } from '../../../components/icons'
import HorizontalTableWidget from '../../../widgets/HorizontalTableWidget'
import useAsyncWidgetExport from '../../../hooks/useAsyncWidgetExport'

const COMMUNICATION_LOG_PER_PAGE = 10

const DEFAULT_SORT_CONFIG = {
  sortBy: 'Log_ID',
  direction: 'desc',
  activePage: 1,
}

const headers = ['Recipient', 'Date', 'Purpose', 'Goals', 'Creator name', 'Other TTA staff', 'Result']

const DeleteLogModal = ({ modalRef, onLogRemoved, log }) => {
  const onDeleteLog = () => {
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

export default function RegionalCommLogTable({ filters }) {
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

  const { requestSort, sortConfig, setSortConfig } = useWidgetSorting(
    'communication-log-table', // localStorageKey
    DEFAULT_SORT_CONFIG, // defaultSortConfig
    tabularData, // dataToUse
    setTabularData, // setDataToUse
    headers, // stringColumns
    ['Date'], // dateColumns
    EMPTY_ARRAY // keyColumns
  )

  const { exportRows } = useAsyncWidgetExport(checkboxes, 'Communication_Log_Export', sortConfig, getCommunicationLogs, filters)

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

  const handleRowActionClick = (action, row, regionId) => {
    if (action === 'View') {
      history.push(`/communication-log/region/${regionId}/log/${row.id}/view`)
    } else if (action === 'Delete') {
      handleDelete(row)
    }
  }

  useDeepCompareEffect(() => {
    async function fetchLogs() {
      try {
        setError(null)
        setIsAppLoading(true)

        const response = await getCommunicationLogs(
          sortConfig.sortBy,
          sortConfig.direction,
          sortConfig.offset || 0,
          COMMUNICATION_LOG_PER_PAGE,
          filters
        )

        const data = response.rows.map((log) => ({
          ...log,
          heading: log.displayId,
          id: log.id,
          isUrl: true,
          isInternalLink: true,
          link: `/communication-log/region/${log.data.regionId}/log/${log.id}/view`,
          suffixContent: log.recipients && log.recipients.length > 1 ? <UserGroupIcon /> : null,
          data: [
            { title: 'Recipient', value: log.recipients.map((r) => r.name).join(', '), tooltip: true },
            { title: 'Date', value: log.data.communicationDate },
            { title: 'Purpose', value: log.data.purpose, tooltip: true },
            { title: 'Goals', value: (log.data.goals || []).map((g) => g.label).join(', '), tooltip: true },
            { title: 'Creator name', value: log.authorName },
            { title: 'Other TTA staff', value: (log.data.otherStaff || []).map((u) => u.label).join(', '), tooltip: true },
            { title: 'Result', value: log.data.result, tooltip: true },
          ],
          actions:
            log.userId === user.id
              ? [
                  { label: 'View', onClick: () => handleRowActionClick('View', log, Number(log.data.regionId)) },
                  { label: 'Delete', onClick: () => handleRowActionClick('Delete', log, Number(log.data.regionId)) },
                ]
              : [{ label: 'View', onClick: () => handleRowActionClick('View', log, Number(log.data.regionId)) }],
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
  }, [setIsAppLoading, sortConfig, filters])

  return (
    <>
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

RegionalCommLogTable.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      topic: PropTypes.string,
      condition: PropTypes.string,
      query: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
}

RegionalCommLogTable.defaultProps = {
  filters: [],
}
