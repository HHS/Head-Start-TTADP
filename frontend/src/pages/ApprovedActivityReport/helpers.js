import PropTypes from 'prop-types';

export function formatSimpleArray(arr) {
  return arr.sort().join(', ');
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
