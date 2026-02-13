import { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import {
  LOCAL_STORAGE_AR_DATA_KEY as LOCAL_STORAGE_DATA_KEY,
  LOCAL_STORAGE_AR_ADDITIONAL_DATA_KEY as LOCAL_STORAGE_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_AR_EDITABLE_KEY as LOCAL_STORAGE_EDITABLE_KEY,
} from '../Constants'
import { getReport } from '../fetchers/activityReports'

export default function useReadOnlyReportFetch(match, user) {
  const history = useHistory()

  const [report, setReport] = useState({
    version: 'loading',
    reportId: 0,
    displayId: '',
    recipientType: 'Recipient',
    activityRecipients: [],
    targetPopulations: [],
    approvers: [],
    activityReportCollaborators: [],
    participants: [],
    numberOfParticipants: 0,
    reason: [],
    author: { fullName: '' },
    createdAt: '',
    approvedAt: '',
    recipientNextSteps: [],
    specialistNextSteps: [],
    goalsAndObjectives: [],
    objectivesWithoutGoals: [],
    context: '',
    additionalNotes: '',
    files: [],
    ECLKCResourcesUsed: [],
    nonECLKCResourcesUsed: [],
    topics: [],
    requester: '',
    virtualDeliveryType: '',
    duration: 0,
    endDate: '',
    startDate: '',
    creatorNotes: '',
    ttaType: ['Training'],
    language: [],
  })

  // cleanup local storage if the report has been submitted or approved
  useEffect(() => {
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_DATA_KEY(report.id))
      window.localStorage.removeItem(LOCAL_STORAGE_ADDITIONAL_DATA_KEY(report.id))
      window.localStorage.removeItem(LOCAL_STORAGE_EDITABLE_KEY(report.id))
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Local storage may not be available: ', e)
    }
  }, [report.id])

  useEffect(() => {
    if (!parseInt(match.params.activityReportId, 10)) {
      history.push('/something-went-wrong/404')
      return
    }

    async function fetchReport() {
      try {
        const data = await getReport(match.params.activityReportId)
        // review and submit table
        setReport(data)
      } catch (err) {
        history.push(`/something-went-wrong/${err.status}`)
      }
    }

    fetchReport()
  }, [match.params.activityReportId, user, history])

  return report
}
