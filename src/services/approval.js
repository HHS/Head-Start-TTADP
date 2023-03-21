import { ActivityReportApproval } from '../models';

export async function setRatioRequired(approvalModel, foreignKeyId, genericId, ratioRequired) {
  return approvalModel.update({ ratioRequired }, { where: { [foreignKeyId]: genericId } });
}

export async function getRatioRequired(approvalModel, foreignKeyId, genericId) {
  const approval = await approvalModel.findOne({
    attributes: ['ratioRequired'],
    where: { [foreignKeyId]: genericId },
  });
  return approval.ratioRequired;
}

export const setReportRatioRequired = async (genericId, ratioRequired) => setRatioRequired(
  ActivityReportApproval,
  'activityReportId',
  genericId,
  ratioRequired,
);

export const getReportRatioRequired = async (genericId) => getRatioRequired(
  ActivityReportApproval,
  'activityReportId',
  genericId,
);
