import React, { useState, useEffect, useMemo } from 'react'
import '@trussworks/react-uswds/lib/uswds.css'
import '@trussworks/react-uswds/lib/index.css'
import { BrowserRouter } from 'react-router-dom'
import { Helmet } from 'react-helmet'
import { fetchUser, fetchLogout } from './fetchers/Auth'
import { HTTPError } from './fetchers'
import { getSiteAlerts } from './fetchers/siteAlerts'
import { getReportsForLocalStorageCleanup } from './fetchers/activityReports'
import { getNotifications } from './fetchers/feed'
import { storageAvailable } from './hooks/helpers'
import { LOCAL_STORAGE_AR_DATA_KEY, LOCAL_STORAGE_AR_ADDITIONAL_DATA_KEY, LOCAL_STORAGE_AR_EDITABLE_KEY } from './Constants'
import AppLoadingContext from './AppLoadingContext'
import Loader from './components/Loader'
import useGaUserData from './hooks/useGaUserData'
import Routes from './Routes'
import AriaLiveRegion from './components/AriaLiveRegion'
import './App.scss'

const WHATSNEW_NOTIFICATIONS_KEY = 'whatsnew-read-notifications'

function App() {
  const [user, updateUser] = useState()
  const [landingLoading, setLandingLoading] = useState(true)
  const [authError, updateAuthError] = useState()
  const [loggedOut, updateLoggedOut] = useState(false)
  const authenticated = useMemo(() => user !== undefined, [user])
  const localStorageAvailable = useMemo(() => storageAvailable('localStorage'), [])
  const [timedOut, updateTimedOut] = useState(false)
  const [announcements, updateAnnouncements] = useState([])
  const [isAppLoading, setIsAppLoading] = useState(false)
  const [appLoadingText, setAppLoadingText] = useState('Loading')
  const [alert, setAlert] = useState(null)
  const [notifications, setNotifications] = useState({ whatsNew: '' })
  const [areThereUnreadNotifications, setAreThereUnreadNotifications] = useState(false)

  useGaUserData(user)

  useEffect(() => {
    try {
      const readNotifications = window.localStorage.getItem(WHATSNEW_NOTIFICATIONS_KEY) || '[]'

      if (readNotifications) {
        const parsedReadNotifications = JSON.parse(readNotifications)
        const dom = notifications.whatsNew ? new window.DOMParser().parseFromString(notifications.whatsNew, 'text/xml') : ''
        const ids = dom ? Array.from(dom.querySelectorAll('entry')).map((item) => item.querySelector('id').textContent) : []
        const unreadNotifications = ids.filter((id) => !parsedReadNotifications.includes(id))

        setAreThereUnreadNotifications(unreadNotifications.length > 0)
      }
    } catch (err) {
      setAreThereUnreadNotifications(false)
    }
  }, [notifications])

  useEffect(() => {
    // fetch alerts
    async function fetchAlerts() {
      try {
        const alertFromApi = await getSiteAlerts()
        setAlert(alertFromApi)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`There was an error fetching alerts: ${e}`)
      }
    }

    if (authenticated) {
      fetchAlerts()
    }
  }, [authenticated])

  useEffect(() => {
    // fetch alerts
    async function fetchNotifications() {
      try {
        const notificationsFromApi = await getNotifications()
        setNotifications({ whatsNew: notificationsFromApi })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`There was an error fetching notifications: ${e}`)
      }
    }

    if (authenticated) {
      fetchNotifications()
    }
  }, [authenticated])

  useEffect(() => {
    async function cleanupReports() {
      try {
        const reportsForCleanup = await getReportsForLocalStorageCleanup()
        reportsForCleanup.forEach(async (report) => {
          window.localStorage.removeItem(LOCAL_STORAGE_AR_DATA_KEY(report.id))
          window.localStorage.removeItem(LOCAL_STORAGE_AR_ADDITIONAL_DATA_KEY(report.id))
          window.localStorage.removeItem(LOCAL_STORAGE_AR_EDITABLE_KEY(report.id))
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log('Error cleaning up reports', err)
      }
    }

    if (localStorageAvailable && authenticated) {
      cleanupReports()
    }
    // local storage available won't change, so this is fine.
  }, [localStorageAvailable, authenticated])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const u = await fetchUser()
        updateUser(u)
        updateAuthError()
      } catch (e) {
        updateUser()
        if (e instanceof HTTPError && e.status === 403) {
          updateAuthError(e.status)
        }
      } finally {
        setLandingLoading(false)
      }
    }
    fetchData()
  }, [])

  if (landingLoading) {
    return <div>Loading...</div>
  }

  const logout = async (timeout) => {
    await fetchLogout()
    updateUser()
    updateAuthError()
    updateLoggedOut(true)
    updateTimedOut(timeout)
  }

  const announce = (message) => {
    updateAnnouncements([...announcements, message])
  }

  return (
    <>
      <Helmet titleTemplate="%s | TTA Hub" defaultTitle="TTA Hub">
        <meta charSet="utf-8" />
      </Helmet>
      <Loader loading={isAppLoading} loadingLabel={`App ${appLoadingText}`} text={appLoadingText} isFixed />
      <AppLoadingContext.Provider value={{ isAppLoading, setIsAppLoading, setAppLoadingText }}>
        <BrowserRouter>
          <Routes
            logout={logout}
            announce={announce}
            user={user}
            authenticated={authenticated}
            areThereUnreadNotifications={areThereUnreadNotifications}
            setAreThereUnreadNotifications={setAreThereUnreadNotifications}
            authError={authError}
            updateUser={updateUser}
            loggedOut={loggedOut}
            timedOut={timedOut}
            notifications={notifications}
            alert={alert}
          />
        </BrowserRouter>
        <AriaLiveRegion messages={announcements} />
      </AppLoadingContext.Provider>
    </>
  )
}

export default App
