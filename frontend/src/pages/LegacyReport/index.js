import React, { useEffect, useState, useContext } from 'react'
import PropTypes from 'prop-types'
import ReactRouterPropTypes from 'react-router-prop-types'
import { Helmet } from 'react-helmet'
import { Alert, Table } from '@trussworks/react-uswds'
import { map, uniqueId } from 'lodash'

import Container from '../../components/Container'
import FileReviewItem from '../ActivityReport/Pages/Review/FileReviewItem'
import { legacyReportById } from '../../fetchers/activityReports'
import { updateLegacyUsers } from '../../fetchers/Admin'
import reportColumns from './reportColumns'
import UserContext from '../../UserContext'
import isAdmin from '../../permissions'

const EditForm = ({ id, data }) => {
  const [message, setMessage] = useState(null)
  const fields = ['createdBy', 'modifiedBy', 'manager']

  const hints = {
    manager: 'You can enter multiple by separating them with a semicolon (;)',
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    try {
      const { messages } = await updateLegacyUsers(String(id), Object.fromEntries(formData))
      setMessage({
        type: 'success',
        text: (
          <ul className="usa-list margin-top-0">
            {messages.map((li) => (
              <li key={uniqueId('message-')}>{li}</li>
            ))}
          </ul>
        ),
      })
    } catch (err) {
      setMessage({
        type: 'error',
        text: `There was an error updating the report: ${err.message}`,
      })
    }
  }

  return (
    <div>
      {message ? <Alert type={message.type}>{message.text}</Alert> : null}
      <form className="usa-form" onSubmit={onSubmit}>
        <h3>Edit report users</h3>
        {fields.map((field) => {
          const value = data[field]
          return (
            <div key={field}>
              <label className="usa-label" htmlFor={field}>
                {field}
              </label>
              <span className="usa-hint">{hints[field] || 'Enter one email address'}</span>
              <input className="usa-input" type="text" name={field} id={field} defaultValue={value} />
            </div>
          )
        })}

        <button className="usa-button" type="submit">
          Save report users
        </button>
      </form>
    </div>
  )
}

EditForm.propTypes = {
  id: PropTypes.number.isRequired,
  data: PropTypes.shape({
    createdBy: PropTypes.string,
    modifiedBy: PropTypes.string,
    manager: PropTypes.string,
  }).isRequired,
}

function LegacyReport({ match }) {
  const {
    params: { legacyId },
  } = match
  const [legacyReport, updateLegacyReport] = useState()
  const [loading, updateLoading] = useState(true)
  const [error, updateError] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const { user } = useContext(UserContext)
  const hasAdminPermissions = isAdmin(user)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const report = await legacyReportById(legacyId)
        updateLegacyReport(report)
        updateError(false)
      } catch (e) {
        updateError('Unable to load activity report')
      } finally {
        updateLoading(false)
      }
    }
    fetchReport()
  }, [legacyId])

  if (loading) {
    return <div>loading...</div>
  }

  if (error) {
    return <Alert type="error">{error}</Alert>
  }

  const { imported, attachments } = legacyReport
  const entries = map(reportColumns, (display, field) => {
    const value = imported[field]
    return {
      display,
      field,
      value,
    }
  })

  const tableEntries = entries
    .filter((item) => item.value)
    .map(({ field, display, value }) => (
      <tr key={field}>
        <th scope="row" className="text-top">
          {display}
        </th>
        <td>
          {value.split('\n').map((string) => (
            <div key={string} className="margin-top-05">
              {string}
            </div>
          ))}
        </td>
      </tr>
    ))

  return (
    <>
      <Helmet>
        <title>Legacy Report</title>
      </Helmet>
      <Container positionRelative>
        <h2>Legacy report {legacyId}</h2>

        {hasAdminPermissions ? (
          <div className="position-absolute top-0 right-0 padding-2">
            <button className="usa-button" type="button" onClick={() => setEditMode(!editMode)}>
              Edit report users
            </button>
          </div>
        ) : null}

        {editMode ? <EditForm id={legacyReport.id} data={legacyReport.imported} /> : null}

        <Table className="usa-table">
          <thead>
            <tr key="heading">
              <th scope="col" className="width-card">
                Field
              </th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {tableEntries}
            {attachments && attachments.length > 0 && (
              <tr>
                <th scope="row" className="text-top">
                  Attachments
                </th>
                <td>
                  {attachments.map(({ id, originalFileName, url: { url }, status }) => (
                    <FileReviewItem key={id} filename={originalFileName} url={url} status={status} />
                  ))}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Container>
    </>
  )
}

LegacyReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
}

export default LegacyReport
