import { Approval } from '../models';

export async function setRatioRequired(entityType, entityId, tier, ratioRequired) {
  return Approval.update({ ratioRequired }, { where: { entityType, entityId, tier } });
}

export async function getRatioRequired(entityType, entityId, tier) {
  const approval = await Approval.findOne({
    attributes: ['ratioRequired'],
    where: { entityType, entityId, tier },
  });
  return approval.ratioRequired;
}
