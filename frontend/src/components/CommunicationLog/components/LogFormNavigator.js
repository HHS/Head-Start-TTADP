/* eslint-disable max-len */
/* istanbul ignore file: most of what is needed to be tested here is already tested in Navigator component */
import React, { useContext, useState, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { getCommunicationLogById, updateCommunicationLogById } from '../../../fetchers/communicationLog'
import { resetFormData } from '../constants'
import useHookFormPageState from '../../../hooks/useHookFormPageState'
import AppLoadingContext from '../../../AppLoadingContext'
import UserContext from '../../../UserContext'
import { LogProvider } from './LogContext'
import Navigator from '../../Navigator'
import { NOOP } from '../../../Constants'

const LogFormNavigator = ({
  shouldFetch,
  reportId,
  pages,
  currentPage,
  regionId,
  recipientId, // can be null
  onSave,
  redirectToOnSubmit,
  redirectPathOnSave,
  reportFetched,
  setReportFetched,
  lastSaveTime,
  updateLastSaveTime,
  showSavedDraft,
  updateShowSavedDraft,
  setError,
}) => {
  // for redirects if a page is not provided
  const history = useHistory()

  // this is the error that appears in the sidebar
  const [errorMessage, updateErrorMessage] = useState()

  const { user } = useContext(UserContext)

  // this holds the key for the date pickers to force re-render
  // as the truss component doesn't re-render when the default value changes
  const [datePickerKey, setDatePickerKey] = useState(`i${Date.now().toString()}`)
  /* ============ */

  const hookForm = useFormContext()
  const { getValues, reset, register } = hookForm

  const formData = getValues()

  const { setIsAppLoading } = useContext(AppLoadingContext)

  useEffect(() => {
    // fetch communication log data
    async function fetchLog() {
      // Note: We don't need to check isAppLoading here because:
      // 1. reportFetched flag prevents refetching after initial load
      // 2. This effect only runs when meaningful dependencies change (reportId, currentPage, etc.)
      // 3. Not checking isAppLoading prevents unnecessary effect re-runs during saves
      if (
        !shouldFetch({
          communicationLogId: reportId.current,
          regionId,
          reportFetched,
          isAppLoading: false, // Always pass false - reportFetched handles preventing concurrent fetches
          currentPage,
          recipientId,
        })
      ) {
        return
      }

      try {
        setIsAppLoading(true)
        const log = await getCommunicationLogById(regionId, reportId.current)
        resetFormData(reset, {
          ...log,
          data: {
            ...log.data,
            isEditing: true,
          },
        })
      } catch (e) {
        setError('Error fetching communication log')
      } finally {
        setDatePickerKey(`f${Date.now().toString()}`)
        setReportFetched(true)
        setIsAppLoading(false)
      }
    }
    fetchLog()
  }, [reportId, reset, regionId, reportFetched, setIsAppLoading, currentPage, setError, shouldFetch, setReportFetched, recipientId])

  // hook to update the page state in the sidebar
  useHookFormPageState(hookForm, pages, currentPage)

  const reportCreator = useMemo(() => ({ name: user.name, roles: user.roles }), [user])

  // retrieve the last time the data was saved to local storage
  const savedToStorageTime = useMemo(() => (formData ? formData.savedToStorageTime : null), [formData])

  const updatePage = (position) => {
    const state = {}
    if (reportId.current) {
      state.showLastUpdatedTime = true
    }

    const page = pages.find((p) => p.position === position)
    const newPath = `${redirectPathOnSave()}${page.path}`
    history.push(newPath, state)
  }

  const onSaveAndContinue = async () => {
    const valid = await hookForm.trigger()
    if (!valid) {
      return
    }
    await onSave()
    updateShowSavedDraft(false)
    const whereWeAre = pages.find((p) => p.path === currentPage)
    const nextPage = pages.find((p) => p.position === whereWeAre.position + 1)
    if (nextPage) {
      updatePage(nextPage.position)
    }
  }

  const preFlight = async () => {
    /**
     * if we're on the first page of the form (log)
     * we need to trigger the validation for the date
     * since we don't want to save the form if the date
     * is invalid
     */
    const whereWeAre = pages.find((p) => p.path === currentPage)
    if (whereWeAre.position === 1) {
      return hookForm.trigger('communicationDate')
    }
    return true
  }

  const onFormSubmit = async () => {
    try {
      const allPagesComplete = pages.every((page) => page.isPageComplete(hookForm))

      if (!allPagesComplete) {
        return
      }

      setIsAppLoading(true)

      // grab the newest data from the form
      const data = hookForm.getValues()

      // PUT it to the backend
      await updateCommunicationLogById(reportId.current, data)

      history.push(redirectToOnSubmit, { message: 'You successfully saved the communication log.' })
    } catch (err) {
      setError('There was an error saving the communication log. Please try again later.')
    } finally {
      setIsAppLoading(false)
    }
  }

  return (
    <LogProvider regionId={regionId}>
      <input type="hidden" name="isEditing" ref={register()} />
      <Navigator
        shouldAutoSave={reportId !== 'new'}
        datePickerKey={datePickerKey}
        socketMessageStore={{}}
        key={currentPage}
        editable
        updatePage={updatePage}
        reportCreator={reportCreator}
        lastSaveTime={lastSaveTime}
        updateLastSaveTime={updateLastSaveTime}
        reportId={reportId.current}
        currentPage={currentPage}
        additionalData={{}}
        formData={formData}
        pages={pages}
        onFormSubmit={onFormSubmit}
        onSave={onSave}
        onResetToDraft={NOOP}
        isApprover={false}
        isPendingApprover={false}
        onReview={NOOP}
        errorMessage={errorMessage}
        updateErrorMessage={updateErrorMessage}
        savedToStorageTime={savedToStorageTime}
        onSaveDraft={onSave}
        onSaveAndContinue={onSaveAndContinue}
        showSavedDraft={showSavedDraft}
        updateShowSavedDraft={updateShowSavedDraft}
        formDataStatusProp="status"
        preFlightForNavigation={preFlight}
      />
    </LogProvider>
  )
}

LogFormNavigator.propTypes = {
  shouldFetch: PropTypes.func.isRequired,
  reportId: PropTypes.shape({
    current: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      position: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  currentPage: PropTypes.string.isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSave: PropTypes.func.isRequired,
  redirectToOnSubmit: PropTypes.string.isRequired,
  redirectPathOnSave: PropTypes.func.isRequired,
  reportFetched: PropTypes.bool.isRequired,
  setReportFetched: PropTypes.func.isRequired,
  lastSaveTime: PropTypes.shape(), // Moment object
  updateLastSaveTime: PropTypes.func.isRequired,
  showSavedDraft: PropTypes.bool.isRequired,
  updateShowSavedDraft: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
}

LogFormNavigator.defaultProps = {
  lastSaveTime: null,
  recipientId: null,
}

export default LogFormNavigator
