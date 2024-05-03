/* eslint-disable import/prefer-default-export */
import { type Request, type Response } from 'express';
import httpCodes from 'http-codes';
import db from '../../models';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import GoalPolicy from '../../policies/goals';
import { updateObjectiveStatusByIds } from '../../services/objectives';

const { Objective, Goal, Grant } = db;

export async function updateStatus(req: Request, res:Response) {
  try {
  // check permissions
    const userId = await currentUserId(req, res);
    const user = await userById(userId);

    const { regionId } = req.params;
    const { ids, status } = req.body;

    // verify the objectives match the region and recipient
    const objectives = await Objective.findAll({
      attributes: ['id', 'goalId', 'status'],
      where: { id: ids },
      include: [{
        model: Goal,
        attributes: ['id', 'grantId'],
        required: true,
        include: [{
          model: Grant,
          required: true,
          attributes: ['id'],
          where: { regionId },
        }],
      }],
    });

    if (objectives.length !== ids.length) {
      return res.status(httpCodes.BAD_REQUEST).json({ message: 'Invalid objectives' });
    }

    if (!new GoalPolicy(user, {}, regionId).canWriteInRegion()) {
      return res.status(httpCodes.FORBIDDEN).json({ message: 'You do not have permission to update objectives in this region' });
    }

    // call update status service
    await updateObjectiveStatusByIds(ids, status);

    return res.status(httpCodes.OK).json({
      objectives: objectives.map((o: { id: number }) => o.id),
    });
  } catch (err) {
    return res.status(httpCodes.INTERNAL_SERVER_ERROR).json({ message: 'An error occurred' });
  }
}
