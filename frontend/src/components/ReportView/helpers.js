import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import RenderReviewCitations from '../../pages/ActivityReport/Pages/components/RenderReviewCitations';
import { getEditorState } from '../../utils';
import { OBJECTIVE_STATUS } from '../../Constants';

function renderEditor(heading, data) {
  /**
   * sometimes, we may receive JSX
   */
  if (typeof data === 'object') {
    return data;
  }

  let wrapperId = '';

  if (typeof heading === 'string') {
    wrapperId = `${heading.toLowerCase().replace(' ', '-')}-${uuidv4()}`;
  } else {
    wrapperId = uuidv4();
  }

  /**
   * otherwise, we render the contents via react-draft
   */
  const defaultEditorState = getEditorState(data || '');

  return (
    <Editor
      readOnly
      toolbarHidden
      defaultEditorState={defaultEditorState}
      wrapperId={wrapperId}
      ariaLabel={typeof heading === 'string' ? heading : 'Content'}
    />
  );
}

export function renderData(heading, data) {
  if (Array.isArray(data)) {
    const cleanData = data.filter((d) => d);
    return (
      <ul>
        {cleanData.map((line) => <li key={uuidv4()} className="margin-bottom-1">{renderEditor(heading, line)}</li>)}
      </ul>
    );
  }

  return renderEditor(heading, data);
}

export function formatSimpleArray(arr) {
  return arr ? arr.sort().join(', ') : '';
}

export function mapAttachments(attachments) {
  if (Array.isArray(attachments) && attachments.length > 0) {
    return (
      <ul>
        {
            attachments.map((attachment) => (
              <li key={attachment.url.url}>
                <a
                  href={attachment.url.url}
                  target={attachment.originalFileName.endsWith('.txt') ? '_blank' : '_self'}
                  rel="noreferrer"
                >
                  {
                    `${attachment.originalFileName}
                     ${attachment.originalFileName.endsWith('.txt')
                      ? ' (opens in new tab)'
                      : ''}`
                  }
                </a>
              </li>
            ))
          }
      </ul>
    );
  }

  return 'None provided';
}

export function formatRequester(requester) {
  if (requester === 'recipient') {
    return 'Recipient';
  }

  if (requester === 'regionalOffice') {
    return 'Regional Office';
  }

  return '';
}

export const reportDataPropTypes = {
  data: PropTypes.shape({
    activityRecipientType: PropTypes.string,
    activityRecipients: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
    })),
    targetPopulations: PropTypes.arrayOf(PropTypes.string),
    approvers: PropTypes.arrayOf(PropTypes.shape({
      user: PropTypes.shape({
        fullName: PropTypes.string,
      }),
    })),
    activityReportCollaborators: PropTypes.arrayOf(PropTypes.shape({
      user: PropTypes.shape({
        fullName: PropTypes.string,
        note: PropTypes.string,
      }),
    })),
    author: PropTypes.shape({
      fullName: PropTypes.string,
      note: PropTypes.string,
    }),
    participants: PropTypes.arrayOf(PropTypes.string),
    numberOfParticipants: PropTypes.number,
    reason: PropTypes.arrayOf(PropTypes.string),
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    duration: PropTypes.string,
    ttaType: PropTypes.arrayOf(PropTypes.string),
    virtualDeliveryType: PropTypes.string,
    deliveryMethod: PropTypes.string,
    requester: PropTypes.string,
    topics: PropTypes.arrayOf(PropTypes.string),
    ECLKCResourcesUsed: PropTypes.arrayOf(PropTypes.string),
    nonECLKCResourcesUsed: PropTypes.arrayOf(PropTypes.string),
    files: PropTypes.arrayOf(PropTypes.shape({
      url: PropTypes.shape({ url: PropTypes.string }),
      originalFileName: PropTypes.string,
    })),
    specialistNextSteps: PropTypes.arrayOf(PropTypes.shape({
      note: PropTypes.string,
    })),
    recipientNextSteps: PropTypes.arrayOf(PropTypes.shape({
      note: PropTypes.string,
    })),
    context: PropTypes.string,
    displayId: PropTypes.string,
    additionalNotes: PropTypes.string,
    approvedAt: PropTypes.string,
    createdAt: PropTypes.string,
  }).isRequired,
};

export function formatNextSteps(nextSteps, heading) {
  return nextSteps.map((step, index) => ({
    heading: index === 0 ? heading : '',
    data: {
      [`Step ${index + 1}`]: step.note,
      'Anticipated completion': step.completeDate,
    },
    striped: false,
  }));
}

export function formatObjectiveLinks(resources, isOtherEntity = false) {
  if (Array.isArray(resources) && resources.length > 0) {
    return (
      <ul>
        {resources.map((resource) => {
          const resourceValue = isOtherEntity ? resource.url : resource.value;
          return (
            <li key={uuidv4()}>
              <a
                href={resourceValue}
                rel="noreferrer"
              >
                { resourceValue }
              </a>
            </li>
          );
        })}
      </ul>
    );
  }
  return 'None provided';
}

export function formatDelivery(method, virtualDeliveryType) {
  if (method === 'in-person') {
    return 'In Person';
  }

  if (method === 'virtual') {
    return virtualDeliveryType ? `Virtual: ${virtualDeliveryType}` : 'Virtual';
  }

  if (method === 'hybrid') {
    return 'Hybrid';
  }

  return '';
}

/**
 *
 * @param {String[]} ttaType
 * @returns String[]
 */

export function formatTtaType(ttaType) {
  const dict = {
    training: 'Training',
    'technical-assistance': 'Technical assistance',
  };

  return ttaType.map((type) => dict[type]).join(', ');
}

export function addObjectiveSectionsToArray(
  objectives,
  sections,
  activityRecipients,
  isOtherEntity = false,
) {
  const isStriped = false;
  objectives.forEach((objective) => {
    const objectiveSection = {
      heading: 'Objective summary',
      headingLevel: 4,
      data: {
        'TTA objective': objective.title,
        ...(objective.citations && objective.citations.length > 0
          ? { 'Citations addressed': <RenderReviewCitations citations={objective.citations} activityRecipients={activityRecipients} className="" /> } : {}),
        Topics: formatSimpleArray(objective.topics.map(({ name }) => name)),
        'iPD courses': objective.courses.length ? formatSimpleArray(objective.courses.map(({ name }) => name)) : 'None provided',
        'Resource links': objective.resources.length ? formatObjectiveLinks(objective.resources, isOtherEntity) : 'None provided',
        'Resource attachments': objective.files.length ? mapAttachments(objective.files) : 'None provided',
        'TTA provided': objective.ttaProvided,
        'Support type': objective.supportType,
        'Objective status': objective.status,
        ...(objective.status === OBJECTIVE_STATUS.SUSPENDED ? {
          'Reason suspended': (
            objective.closeSuspendReason || ''
          ) + (` - ${objective.closeSuspendContext}` || ''),
        } : {}),
      },
      isStriped,
    };

    sections.push(objectiveSection);
  });
}

/**
 * @param {object[]} responses an array of FEI Goal response objects
 */
export function getResponses(responses) {
  return responses[0].response.map((r) => r).join(', ');
}

/**
   *
   * @param {object} report an activity report object
   * @returns an array of two arrays, each of which contains strings
   */
export function calculateGoalsAndObjectives(report) {
  const sections = [];
  const striped = false;

  if (report.activityRecipientType === 'recipient') {
    report.goalsAndObjectives.forEach((goal) => {
      const goalSection = {
        heading: 'Goal summary',
        data: {
          'Recipient\'s goal': goal.name,
          'Goal numbers': goal.goalNumbers.join(','),
        },
        striped,
      };

      // Adds "root cause" to the goal section if there are FEI responses
      const { responses } = goal;
      if (responses && responses.length) {
        const rootCauseData = {
          'Root cause': getResponses(responses),
        };
        goalSection.data = { ...goalSection.data, ...rootCauseData };
      }

      const { prompts } = goal;
      if (prompts && prompts.length) {
        const promptData = {};
        prompts.forEach((prompt) => {
          if (prompt.reportResponse.length > 0) {
            promptData[prompt.title] = prompt.reportResponse.join(', ');
          }
        });
        goalSection.data = { ...goalSection.data, ...promptData };
      }

      sections.push(goalSection);

      addObjectiveSectionsToArray(goal.objectives, sections, report.activityRecipients);
    });
  } else if (report.activityRecipientType === 'other-entity') {
    addObjectiveSectionsToArray(
      report.objectivesWithoutGoals,
      sections,
      report.activityRecipients,
      true,
    );
  }

  return sections;
}
