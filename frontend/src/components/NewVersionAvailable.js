import React from 'react'
import { Helmet } from 'react-helmet'
import { Link as RouterLink } from 'react-router-dom'

const LinkToActivityReports = () => <RouterLink to="/activity-reports">Activity Reports</RouterLink>

// eslint-disable-next-line arrow-body-style
const NewVersionAvailable = () => {
  return (
    <>
      <Helmet>
        <title>New version available.</title>
      </Helmet>
      <div className="smart-hub--something-went-wrong padding-3">
        <h1 className="margin-top-0 margin-bottom-2 font-serif-2xl">New version available.</h1>
        <div className="smart-hub--something-went-wrong-body maxw-tablet-lg">
          <div>
            <p className="usa-prose">A newer version of this report is available or its status has changed.</p>
            <ul className="usa-list">
              <li>
                Go back to <LinkToActivityReports />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

export default NewVersionAvailable
