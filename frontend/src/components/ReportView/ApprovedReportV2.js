import React from 'react'
import moment from 'moment-timezone'
import Container from '../Container'
import { DATE_DISPLAY_FORMAT, DATEPICKER_VALUE_FORMAT, OBJECTIVE_STATUS } from '../../Constants'
import { reportDataPropTypes, formatSimpleArray, mapAttachments, formatRequester, formatNextSteps, formatDelivery, formatTtaType } from './helpers'
import ReadOnlyContent from '../ReadOnlyContent'
import RenderReviewCitations from '../../pages/ActivityReport/Pages/components/RenderReviewCitations'

function formatObjectiveLinks(resources, isOtherEntity = false) {
  if (Array.isArray(resources) && resources.length > 0) {
    return (
      <ul>
        {resources.map((resource) => {
          const resourceValue = isOtherEntity ? resource.url : resource.value
          return (
            <li key={resourceValue}>
              <a href={resourceValue} rel="noreferrer">
                {resourceValue}
              </a>
            </li>
          )
        })}
      </ul>
    )
  }
  return []
}

function addObjectiveSectionsToArray(objectives, sections, striped, activityRecipients, isOtherEntity = false) {
  let isStriped = striped
  objectives.forEach((objective) => {
    isStriped = !isStriped
    const objectiveSection = {
      heading: 'Objective summary',
      data: {
        'TTA objective': objective.title,
        ...(objective.citations && objective.citations.length > 0
          ? { 'Citations addressed': <RenderReviewCitations citations={objective.citations} activityRecipients={activityRecipients} className="" /> }
          : {}),
        Topics: formatSimpleArray(objective.topics.map(({ name }) => name)),
        'Resource links': formatObjectiveLinks(objective.resources, isOtherEntity),
        'iPD courses': formatSimpleArray(objective.courses.map(({ name }) => name)),
        'Resource attachments': objective.files.length ? mapAttachments(objective.files) : 'None provided',
        'TTA provided': objective.ttaProvided,
        'Support type': objective.supportType,
        'Objective status': objective.status,
        ...(objective.status === OBJECTIVE_STATUS.SUSPENDED
          ? {
              'Reason suspended': (objective.closeSuspendReason || '') + (` - ${objective.closeSuspendContext}` || ''),
            }
          : {}),
      },
      isStriped,
    }

    sections.push(objectiveSection)
  })
}

/**
 *
 * @param {object} report an activity report object
 * @returns an array of two arrays, each of which contains strings
 */
function calculateGoalsAndObjectives(report) {
  const sections = []

  if (report.activityRecipientType === 'recipient') {
    report.goalsAndObjectives.forEach((goal) => {
      let goalSection = {
        heading: 'Goal summary',
        data: {
          "Recipient's goal": (
            <>
              <span className="text-bold">{goal.goalNumbers.join(',')}</span>: {goal.name}
            </>
          ),
        },
        striped: false,
      }

      if (goal.activityReportGoals && goal.activityReportGoals.length) {
        goalSection = {
          heading: goalSection.heading,
          data: {
            ...goalSection.data,
            Source: <>{goal.activityReportGoals[0].source}</>,
          },
          striped: false,
        }
      }

      const { prompts } = goal
      if (prompts && prompts.length) {
        const promptData = {}
        prompts.forEach((prompt) => {
          if (prompt.reportResponse.length > 0) {
            promptData[prompt.title] = prompt.reportResponse.join(', ')
          }
        })
        goalSection.data = { ...goalSection.data, ...promptData }
      }

      sections.push(goalSection)

      addObjectiveSectionsToArray(goal.objectives, sections, false, report.activityRecipients)
    })
  } else if (report.activityRecipientType === 'other-entity') {
    addObjectiveSectionsToArray(report.objectivesWithoutGoals, sections, false, report.activityRecipients, true)
  }

  return sections
}

export default function ApprovedReportV2({ data }) {
  const { reportId, ttaType, deliveryMethod, virtualDeliveryType } = data

  // first table
  const isRecipient = data.activityRecipientType === 'recipient'
  let recipientType = isRecipient ? 'Recipient' : 'Other entity'
  if (data.activityRecipients.length > 1) {
    recipientType = isRecipient ? 'Recipients' : 'Other entities'
  }

  const arRecipients = data.activityRecipients
    .map((arRecipient) => arRecipient.name)
    .sort()
    .join(', ')
  const targetPopulations = data.targetPopulations.map((population) => population).join(', ') // Approvers.
  const approvingManagers = data.approvers.map((a) => a.user.fullName).join(', ')
  const collaborators = data.activityReportCollaborators.map((a) => a.fullName)

  const attendees = formatSimpleArray(data.participants)
  const languages = formatSimpleArray(data.language)
  const participantCount = data.numberOfParticipants.toString()
  const reasons = formatSimpleArray(data.reason)
  const startDate = moment(data.startDate, DATEPICKER_VALUE_FORMAT).format('MMMM D, YYYY')
  const endDate = moment(data.endDate, DATEPICKER_VALUE_FORMAT).format('MMMM D, YYYY')
  const duration = `${data.duration} hours`
  const requester = formatRequester(data.requester)

  const goalSections = calculateGoalsAndObjectives(data)

  // second table
  const attachments = mapAttachments(data.files)

  // third table
  const { context, displayId } = data

  // next steps table
  const specialistNextSteps = formatNextSteps(data.specialistNextSteps, "Specialist's next steps", true)
  const nextStepsLabel = isRecipient ? "Recipient's next steps" : 'Other entities next steps'
  const recipientNextSteps = formatNextSteps(data.recipientNextSteps, nextStepsLabel, false)
  const approvedAt = data.approvedAt ? moment(data.approvedAt).format(DATE_DISPLAY_FORMAT) : ''
  const createdAt = moment(data.createdAt).format(DATE_DISPLAY_FORMAT)
  const submittedAt = data.submittedDate ? moment(data.submittedDate).format(DATE_DISPLAY_FORMAT) : ''

  const creator = data.author.fullName
  return (
    <Container className="ttahub-activity-report-view margin-top-2">
      <h1 className="landing">TTA activity report {displayId}</h1>
      <div className="ttahub-activity-report-view-creator-data margin-bottom-4">
        <p>
          <strong>Creator:</strong> {creator}
        </p>
        <p>
          <strong>Collaborators:</strong> {collaborators.map((collaborator) => collaborator).join(', ')}
        </p>
        <p>
          <strong>Managers:</strong> {approvingManagers}
        </p>
        <p className="no-print">
          <strong>Date created:</strong> {createdAt}
        </p>
        {submittedAt !== '' ? (
          <p>
            <strong>Date submitted:</strong> {submittedAt}
          </p>
        ) : null}
        {approvedAt !== '' ? (
          <p>
            <strong>Date approved:</strong> {approvedAt}
          </p>
        ) : null}
      </div>

      <ReadOnlyContent
        key={`activity-summary-${reportId}`}
        title="Activity summary"
        sections={[
          {
            heading: 'Who was the activity for?',
            data: {
              'Recipient or other entity': recipientType,
              'Recipient names': arRecipients,
              'Target populations': targetPopulations,
            },
            striped: false,
          },
          {
            heading: 'Reason for activity',
            data: {
              'Who requested the activity': requester,
              Reasons: reasons,
            },
            striped: false,
          },
          {
            heading: 'Activity date',
            data: {
              'Start date': startDate,
              'End date': endDate,
              Duration: duration,
            },
            striped: false,
          },
          {
            heading: 'Context',
            data: {
              Context: context,
            },
            striped: false,
          },
          {
            heading: 'Training or technical assistance',
            data: {
              'TTA provided': formatTtaType(ttaType),
              'Language used': languages,
              'TTA conducted': formatDelivery(deliveryMethod, virtualDeliveryType),
            },
            striped: true,
          },
          {
            heading: 'Participants',
            data: {
              Participants: attendees,
              'Number of participants': participantCount,
            },
            striped: false,
          },
        ]}
      />

      <ReadOnlyContent key={`goals-and-objectives-${reportId}`} title="Goals and objectives" sections={goalSections} />

      <ReadOnlyContent
        key={`supporting-attachments${reportId}`}
        title="Supporting attachments"
        sections={[
          {
            heading: '',
            data: {
              Attachments: attachments,
            },
            striped: false,
          },
        ]}
      />

      <ReadOnlyContent key={`next-steps${reportId}`} title="Next steps" sections={[...specialistNextSteps, ...recipientNextSteps]} />
    </Container>
  )
}

ApprovedReportV2.propTypes = reportDataPropTypes
