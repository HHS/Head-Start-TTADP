import React from 'react';
import PropTypes from 'prop-types';

export function formatSimpleArray(arr) {
  return arr.sort().join(', ');
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

  return [];
}

export const reportDataPropTypes = {
  data: PropTypes.shape({
    activityRecipientType: PropTypes.string,
    activityRecipients: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
    })),
    targetPopulations: PropTypes.arrayOf(PropTypes.string),
    approvers: PropTypes.arrayOf(PropTypes.shape({
      User: PropTypes.shape({
        fullName: PropTypes.string,
      }),
    })),
    activityReportCollaborators: PropTypes.arrayOf(PropTypes.shape({
      User: PropTypes.shape({
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
    ttaType: PropTypes.string,
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
    specialistNextSteps: PropTypes.arrayOf({
      note: PropTypes.string,
    }),
    recipientNextSteps: PropTypes.arrayOf({
      note: PropTypes.string,
    }),
    context: PropTypes.string,
    displayId: PropTypes.string,
    additionalNotes: PropTypes.string,
    approvedAt: PropTypes.string,
    createdAt: PropTypes.string,
  }).isRequired,
};
