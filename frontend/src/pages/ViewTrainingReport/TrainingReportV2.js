import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { capitalize } from 'lodash'
import { TRAINING_REPORT_STATUSES, REPORT_STATUSES } from '@ttahub/common'
import { Helmet } from 'react-helmet'
import { Alert } from '@trussworks/react-uswds'
import { useLocation } from 'react-router-dom'
import BackLink from '../../components/BackLink'
import Container from '../../components/Container'
import ReadOnlyContent from '../../components/ReadOnlyContent'
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons'
import './index.css'
import { EVENT_PARTNERSHIP, TRAINING_EVENT_ORGANIZER } from '../../Constants'

export const formatOwnerName = (event) => {
  try {
    if (event && event.owner && event.owner.fullName) {
      return event.owner.fullName
    }

    if (event.data.owner.name) {
      return event.data.owner.name
    }

    return ''
  } catch (err) {
    return ''
  }
}

const displayStatus = (status) => {
  if (status) {
    if (status === REPORT_STATUSES.NEEDS_ACTION) {
      return 'In progress'
    }

    return status
  }
  return 'Not started'
}

export const translateEventPartnership = (eventPartnership) => {
  switch (eventPartnership) {
    case EVENT_PARTNERSHIP.REGIONAL_HSA:
      return 'Yes, Regional HSA'
    case EVENT_PARTNERSHIP.STATE_HSA:
      return 'Yes, State HSA'
    case EVENT_PARTNERSHIP.NO:
      return 'No'
    default:
      return ''
  }
}

export const formatObjectiveLinks = (objectiveResources) => {
  if (Array.isArray(objectiveResources)) {
    const resources = objectiveResources.filter((res) => res.value && res.value.trim() !== '')
    if (resources.length > 0) {
      return (
        <ul className="margin-top-0">
          {resources.map((resource) => (
            <li key={resource.value}>
              <a href={resource.value} rel="noreferrer">
                {resource.value}
              </a>
            </li>
          ))}
        </ul>
      )
    }
  }

  return 'None provided'
}

const formatNextSteps = (nextSteps, heading, striped) => {
  const data = nextSteps.reduce(
    (acc, step, index) => ({
      ...acc,
      [`Step ${index + 1}`]: step.note,
      [`Step ${index + 1} anticipated completion`]: step.completeDate,
    }),
    {}
  )

  return {
    heading,
    striped,
    data,
  }
}

const formatSupportingGoals = (sessionGoalTemplates) => {
  if (!sessionGoalTemplates || sessionGoalTemplates.length === 0) {
    return 'None provided'
  }
  return sessionGoalTemplates.map((goal) => goal.standard || goal).join(', ')
}

export const handleIntendedAudience = (audience) => {
  const audienceMap = {
    recipients: 'Recipients',
    'regional-office-tta': 'Regional office/TTA',
  }
  return audienceMap[audience] || audience
}

export const formatSupportingAttachments = (attachments) => {
  if (Array.isArray(attachments) && attachments.length > 0) {
    return (
      <ul className="margin-top-0">
        {attachments.map((attachment) => {
          const { originalFileName } = attachment
          const { url } = attachment.url
          return (
            <li key={originalFileName}>
              <a href={url} rel="noreferrer">
                {originalFileName}
              </a>
            </li>
          )
        })}
      </ul>
    )
  }

  return 'None provided'
}

const handleArrayJoin = (arr, join = ', ', alt = 'None provided') => (arr && arr.length ? arr.join(join) : alt)

export default function TrainingReportV2({ event, eventCollaborators, eventPoc, alertMessage, onCompleteEvent, user, isAdminUser }) {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const hideBackLink = searchParams.get('back_link') === 'hide'

  const pageTitle = event && event.data && event.data.eventId ? `Training event report ${event.data.eventId}` : 'Training event report'
  const ownerName = formatOwnerName(event)

  const canCompleteEvent = useMemo(() => {
    if (!event || !event.data) {
      return false
    }
    const isOwner = event && event.ownerId === user?.id
    const isCompleteOrSuspended = [TRAINING_REPORT_STATUSES.COMPLETE, TRAINING_REPORT_STATUSES.SUSPENDED].includes(event.data.status || '')

    const eventSubmitted = event && event.data && event.data.eventSubmitted
    const sessionReports = event && event.sessionReports ? event.sessionReports : []

    if (!isOwner && !isAdminUser) {
      return false
    }

    if (isCompleteOrSuspended) {
      return false
    }

    // eslint-disable-next-line max-len
    if (sessionReports.length === 0 || !sessionReports.every((session) => session.data.status === TRAINING_REPORT_STATUSES.COMPLETE)) {
      return false
    }

    if (!eventSubmitted) {
      return false
    }

    return true
  }, [event, user, isAdminUser])

  const organizerIsNoNationalCenters = (event?.data?.eventOrganizer || '') === TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS

  const eventSummary =
    event && event.data
      ? [
          {
            heading: 'Event Summary',
            data: {
              'Event name': event.data.eventName,
              'Event creator': ownerName,
              Region: `Region ${String(event.regionId)}`,
              'Event organizer': event.data.eventOrganizer,
              'Additional states involved': handleArrayJoin(event.data.additionalStates),
              'In partnership with HSA': translateEventPartnership(event.data.eventPartnership),
              'Event collaborators': handleArrayJoin(eventCollaborators),
              ...(!organizerIsNoNationalCenters ? { 'Regional point of contact': handleArrayJoin(eventPoc) } : {}),
              'Intended audience': handleIntendedAudience(event.data.eventIntendedAudience),
              'Start date': event.data.startDate,
              'End date': event.data.endDate,
              'Training type': event.data.trainingType,
              'Target populations': handleArrayJoin(event.data.targetPopulations),
              Vision: event.data.vision,
            },
            striped: true,
          },
        ]
      : []

  const generateIstOfficeOrRecipientProperties = (session) => ({
    Recipients: session.data.recipients ? session.data.recipients.map((r) => r.label).join(', ') : '',
    'Recipient participants': session.data.participants ? session.data.participants.join(', ') : [],
  })

  const generateNumberOfParticipants = (session) => {
    // In person or virtual.
    if (session.data.deliveryMethod === 'in-person' || session.data.deliveryMethod === 'virtual') {
      const numberOfParticipants = session.data.numberOfParticipants ? session.data.numberOfParticipants.toString() : ''
      return {
        'Number of participants': numberOfParticipants,
      }
    }
    // Hybrid.
    const numberOfParticipantsInPerson = session.data.numberOfParticipantsInPerson ? session.data.numberOfParticipantsInPerson.toString() : ''
    const numberOfParticipantsVirtually = session.data.numberOfParticipantsVirtually ? session.data.numberOfParticipantsVirtually.toString() : ''
    return {
      'Number of participants attending in person': numberOfParticipantsInPerson,
      'Number of participants attending virtually': numberOfParticipantsVirtually,
    }
  }

  const sessions =
    event && event.sessionReports
      ? event.sessionReports.map((session, index) => (
          <ReadOnlyContent
            key={session.id}
            title={`Session ${index + 1}`}
            displayStatus={displayStatus(session.data.status)}
            sections={[
              {
                heading: 'Session Summary',
                striped: true,
                data: {
                  'Session name': session.data.sessionName,
                  'Session start date': session.data.startDate,
                  'Session end date': session.data.endDate,
                  'Session duration': `${session.data.duration || 0} hours`,
                  'Session context': session.data.context || 'None provided',
                },
              },
              {
                heading: 'Objective summary',
                data: {
                  'Session objective': session.data.objective,
                  'Supporting goals': formatSupportingGoals(session.goalTemplates),
                  Topics: handleArrayJoin(session.data.objectiveTopics, ', '),
                  Trainers: handleArrayJoin(
                    (session.trainers || []).map((t) => t.fullName),
                    '; '
                  ),
                  'iPD Courses': session.data.courses && session.data.courses.length ? session.data.courses.map((o) => o.name).join(', ') : 'None',
                  'Resource links': formatObjectiveLinks(session.data.objectiveResources),
                  'Resource attachments':
                    session.data.files && session.data.files.length ? session.data.files.map((f) => f.originalFileName) : 'None',
                  'TTA provided': session.data.ttaProvided,
                  'Support type': session.data.objectiveSupportType,
                },
              },
              {
                heading: 'Participants',
                striped: true,
                data: {
                  ...generateIstOfficeOrRecipientProperties(session),
                  'TTA type': handleArrayJoin((session.data.ttaType || []).map((t) => capitalize(t).replace(/-/g, ' '))),
                  'Delivery method': capitalize(session.data.deliveryMethod || ''),
                  ...generateNumberOfParticipants(session),
                  'Language used': session.data.language ? session.data.language.join(', ') : [],
                },
              },
              {
                heading: 'Supporting attachments',
                data: {
                  Attachments: formatSupportingAttachments(session.supportingAttachments || []),
                },
              },
              formatNextSteps(session.data.specialistNextSteps || [], "Specialist's next steps", false),
              formatNextSteps(session.data.recipientNextSteps || [], "Recipient's next steps", true),
            ]}
          />
        ))
      : null

  const backLinkUrl = (() => {
    if (!event || !event.data || !event.data.status) {
      return '/training-reports/not-started'
    }

    return `/training-reports/${event.data.status.replace(' ', '-').toLowerCase()}`
  })()

  return (
    <>
      <Helmet>
        <title>Training Event Report {event && event.data ? String(event.data.eventId) : ''}</title>
      </Helmet>
      {!hideBackLink && <BackLink to={backLinkUrl}>Back to Training Reports</BackLink>}
      <ApprovedReportSpecialButtons showCompleteEvent={canCompleteEvent} onCompleteEvent={onCompleteEvent} />
      <Container className="margin-top-2 maxw-tablet-lg ttahub-completed-training-report-container">
        {alertMessage.message && <Alert type={alertMessage.type}>{alertMessage.message}</Alert>}
        <h1 className="landing margin-0 margin-bottom-4">{pageTitle}</h1>
        <ReadOnlyContent title="Event" sections={eventSummary} />
        {sessions}
      </Container>
    </>
  )
}

TrainingReportV2.propTypes = {
  event: PropTypes.shape({
    id: PropTypes.number,
    ownerId: PropTypes.number,
    regionId: PropTypes.number,
    version: PropTypes.number,
    data: PropTypes.shape({
      eventId: PropTypes.string,
      eventName: PropTypes.string,
      eventOrganizer: PropTypes.string,
      eventIntendedAudience: PropTypes.string,
      eventPartnership: PropTypes.string,
      additionalStates: PropTypes.arrayOf(PropTypes.string),
      trainingType: PropTypes.string,
      startDate: PropTypes.string,
      endDate: PropTypes.string,
      targetPopulations: PropTypes.arrayOf(PropTypes.string),
      vision: PropTypes.string,
      status: PropTypes.string,
      eventSubmitted: PropTypes.bool,
      owner: PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
      }),
    }),
    owner: PropTypes.shape({
      fullName: PropTypes.string,
    }),
    sessionReports: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        supportingAttachments: PropTypes.arrayOf(
          PropTypes.shape({
            originalFileName: PropTypes.string,
            url: PropTypes.shape({
              url: PropTypes.string,
            }),
          })
        ),
        data: PropTypes.shape({
          sessionName: PropTypes.string,
          startDate: PropTypes.string,
          endDate: PropTypes.string,
          duration: PropTypes.number,
          context: PropTypes.string,
          objective: PropTypes.string,
          goalTemplates: PropTypes.arrayOf(
            PropTypes.oneOfType([
              PropTypes.string,
              PropTypes.shape({
                standard: PropTypes.string,
              }),
            ])
          ),
          objectiveTopics: PropTypes.arrayOf(PropTypes.string),
          objectiveTrainers: PropTypes.arrayOf(PropTypes.string),
          objectiveResources: PropTypes.arrayOf(
            PropTypes.shape({
              value: PropTypes.string,
            })
          ),
          courses: PropTypes.arrayOf(
            PropTypes.shape({
              name: PropTypes.string,
            })
          ),
          files: PropTypes.arrayOf(
            PropTypes.shape({
              originalFileName: PropTypes.string,
            })
          ),
          objectiveSupportType: PropTypes.string,
          ttaProvided: PropTypes.string,
          ttaType: PropTypes.arrayOf(PropTypes.string),
          recipients: PropTypes.arrayOf(
            PropTypes.shape({
              label: PropTypes.string,
            })
          ),
          participants: PropTypes.arrayOf(PropTypes.string),
          deliveryMethod: PropTypes.string,
          numberOfParticipants: PropTypes.number,
          numberOfParticipantsInPerson: PropTypes.number,
          numberOfParticipantsVirtually: PropTypes.number,
          language: PropTypes.arrayOf(PropTypes.string),
          specialistNextSteps: PropTypes.arrayOf(
            PropTypes.shape({
              note: PropTypes.string,
              completeDate: PropTypes.string,
            })
          ),
          recipientNextSteps: PropTypes.arrayOf(
            PropTypes.shape({
              note: PropTypes.string,
              completeDate: PropTypes.string,
            })
          ),
          status: PropTypes.string,
        }),
      })
    ),
    eventReportPilotNationalCenterUsers: PropTypes.arrayOf(
      PropTypes.shape({
        userId: PropTypes.number,
        userName: PropTypes.string,
        nationalCenterName: PropTypes.string,
      })
    ),
    collaboratorIds: PropTypes.arrayOf(PropTypes.number),
    pocIds: PropTypes.arrayOf(PropTypes.number),
  }),
  eventCollaborators: PropTypes.arrayOf(PropTypes.string),
  eventPoc: PropTypes.arrayOf(PropTypes.string),
  alertMessage: PropTypes.shape({
    type: PropTypes.string,
    message: PropTypes.string,
  }),
  onCompleteEvent: PropTypes.func,
  user: PropTypes.shape({
    id: PropTypes.number,
  }),
  isAdminUser: PropTypes.bool,
}

TrainingReportV2.defaultProps = {
  event: null,
  eventCollaborators: [],
  eventPoc: [],
  alertMessage: {
    type: '',
    message: '',
  },
  onCompleteEvent: () => {},
  user: null,
  isAdminUser: false,
}
