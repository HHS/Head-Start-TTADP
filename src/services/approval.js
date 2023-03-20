import { ActivityReportApproval } from '../models';

export async function setRatioRequired(entityType, entityId, ratioRequired) {
  return ActivityReportApproval.update({ ratioRequired }, { where: { entityType, entityId } });
}

export async function getRatioRequired(approvalModel, foreignKeyId, genericId) {
  const approval = await approvalModel.findOne({
    attributes: ['ratioRequired'],
    where: { [foreignKeyId]: genericId },
  });
  return approval.ratioRequired;
}

export const getReportRatioRequired = async (genericId) => getRatioRequired(
  ActivityReportApproval,
  'activityReportId',
  genericId,
);
