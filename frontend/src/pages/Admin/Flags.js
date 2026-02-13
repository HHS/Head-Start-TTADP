import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import Container from '../../components/Container'
import { getFeatures, setFeatureFlag } from '../../fetchers/Admin'
import './Flags.css'

export default function Flags() {
  const [features, setFeatures] = useState()
  const [error, setError] = useState()

  useEffect(() => {
    async function fetchFeatures() {
      try {
        const featuresFromApi = await getFeatures()
        setFeatures(featuresFromApi)
      } catch (e) {
        setError('Unable to fetch features')
      }
    }

    fetchFeatures()
  }, [])

  const handleOnOffFeatureFlag = async (feature, isOn) => {
    try {
      await setFeatureFlag({ flag: feature, on: isOn })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err)
    }
  }

  return (
    <div>
      <Helmet>
        <title>Feature flag Administration</title>
      </Helmet>
      <Container>
        <main>
          <h2>Active feature flags</h2>
          {error && (
            <div className="usa-alert usa-alert--warning">
              <div className="usa-alert__body">
                <p className="usa-alert__text">{error}</p>
              </div>
            </div>
          )}
          <ul>
            {features &&
              features.map((feature) => (
                <li className="flag-label" key={feature}>
                  <strong>{feature}</strong> &nbsp; &nbsp;
                  <Link to={`/admin/users?flag=${feature}`} aria-label={`view users with the ${feature} feature flag`}>
                    View active users
                  </Link>{' '}
                  &nbsp; &nbsp;
                  <button
                    type="button"
                    className="usa-button usa-button--outline ttahub-export-reports"
                    onClick={() => handleOnOffFeatureFlag(feature, true)}
                  >
                    Turn on for all
                  </button>{' '}
                  &nbsp; &nbsp;
                  <button
                    type="button"
                    className="usa-button usa-button--outline ttahub-export-reports"
                    onClick={() => handleOnOffFeatureFlag(feature, false)}
                  >
                    Turn off for all
                  </button>
                </li>
              ))}
          </ul>
        </main>
      </Container>
    </div>
  )
}
