import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Table } from '@trussworks/react-uswds'
import WidgetCard from '../components/WidgetCard'
import './RttapaUpdates.css'

export default function RttapaUpdates({ regionId, recipientId, logs }) {
  const linkToCommunications = `/recipient-tta-records/${recipientId}/region/${regionId}/communication`

  const Header = () => (
    <div className="desktop:display-flex flex-align-center flex-justify padding-bottom-4 padding-x-3">
      <h2 className="ttahub--dashboard-widget-heading margin-0">RTTAPA updates</h2>
      <Link to={linkToCommunications} className="usa-button usa-button--unstyled">
        View all communications
      </Link>
    </div>
  )

  return (
    <WidgetCard className="ttahub-rttapa-updates padding-x-0" header={<Header />} footer={<></>}>
      <div className="border-top border-gray-5">
        {logs.length > 0 ? (
          <Table fullWidth striped stackedStyle="default">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Purpose</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={`logrow${log.id}`}>
                  <td data-label="Date">
                    <Link to={`/recipient-tta-records/${recipientId}/region/${regionId}/communication/${log.id}/view`}>
                      {log.data ? log.data.communicationDate : ''}
                    </Link>
                  </td>
                  <td data-label="Purpose">{log.data ? log.data.purpose : ''}</td>
                  <td data-label="Result">{log.data ? log.data.result : ''}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="display-flex flex-align-center flex-justify-center width-full padding-4">
            <p className="usa-prose text-center">
              There are no communication logs with a purpose of “RTTAPA updates” or “RTTAPA initial plan / new recipient”.
            </p>
          </div>
        )}
      </div>
    </WidgetCard>
  )
}

RttapaUpdates.propTypes = {
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  logs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      data: PropTypes.shape({
        communicationDate: PropTypes.string,
        result: PropTypes.string,
        purpose: PropTypes.string,
      }),
    })
  ).isRequired,
}
