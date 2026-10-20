function parseParticipantCount(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function hasParticipantCount(value) {
  return value !== null && value !== undefined;
}

export function getActivityReportParticipantCount(report) {
  const method = (report.deliveryMethod || '').toLowerCase();

  if (method !== 'hybrid') {
    return parseParticipantCount(report.numberOfParticipants);
  }

  const inPerson = parseParticipantCount(report.numberOfParticipantsInPerson);
  const virtual = parseParticipantCount(report.numberOfParticipantsVirtually);
  const hasInPerson = hasParticipantCount(report.numberOfParticipantsInPerson);
  const hasVirtual = hasParticipantCount(report.numberOfParticipantsVirtually);

  if (hasInPerson && hasVirtual) {
    return inPerson + virtual;
  }

  if (hasParticipantCount(report.numberOfParticipants)) {
    return parseParticipantCount(report.numberOfParticipants);
  }

  return inPerson + virtual;
}
