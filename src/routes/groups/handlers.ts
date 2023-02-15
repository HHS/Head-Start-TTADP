import { Request, Response } from 'express';
import httpCodes from 'http-codes';
import db from '../../models';
import { auditLogger } from '../../logger';
import { currentUserId } from '../../services/currentUser';
import {
  group,
  groups,
  editGroup,
  createNewGroup,
  destroyGroup,
} from '../../services/groups';
import GroupPolicy from '../../policies/group';

const NAMESPACE = 'GROUPS';
const { Group } = db;

export async function getGroups(req: Request, res: Response) {
  try {
    const userId = await currentUserId(req, res);
    const usersGroups = await groups(userId);
    res.json(usersGroups);
  } catch (e) {
    auditLogger.error(`${NAMESPACE}, 'getGroups', ${e}`);
    res.status(httpCodes.INTERNAL_SERVER_ERROR);
  }
}

export async function getGroup(req: Request, res: Response) {
  try {
    const { groupId } = req.params;
    const userId = await currentUserId(req, res);
    const groupResponse = await group(parseInt(groupId, 10));
    const policy = new GroupPolicy({ id: userId, permissions: [] }, [], groupResponse);
    if (!policy.ownsGroup()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }
    res.json(groupResponse);
  } catch (e) {
    auditLogger.error(`${NAMESPACE} getGroup ${e}`);
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR);
  }
}

export async function createGroup(req: Request, res: Response) {
  try {
    const userId = await currentUserId(req, res);
    const groupResponse = await createNewGroup({ ...req.body, userId });
    res.json(groupResponse);
  } catch (e) {
    auditLogger.error(`${NAMESPACE} createGroup ${e}`);
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR);
  }
}

export async function updateGroup(req: Request, res: Response) {
  try {
    const { groupId } = req.params;
    const userId = await currentUserId(req, res);

    const existingGroup = await Group.findOne({
      where: {
        id: groupId,
      },
      attribtes: ['userId', 'id'],
    });

    const policy = new GroupPolicy({ id: userId, permissions: [] }, [], existingGroup);
    if (!policy.ownsGroup()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    const groupResponse = await editGroup(parseInt(groupId, 10), {
      ...req.body,
      userId,
    });
    res.json(groupResponse);
  } catch (e) {
    auditLogger.error(`${NAMESPACE} updateGroup ${e}`);
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR);
  }
}

export async function deleteGroup(req: Request, res: Response) {
  try {
    const { groupId } = req.params;
    const userId = await currentUserId(req, res);

    const existingGroup = await Group.findOne({
      where: {
        id: groupId,
      },
      attribtes: ['userId', 'id'],
    });

    const policy = new GroupPolicy({ id: userId, permissions: [] }, [], existingGroup);
    if (!policy.ownsGroup()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    const groupResponse = await destroyGroup(parseInt(groupId, 10));
    res.json(groupResponse);
  } catch (e) {
    auditLogger.error(`${NAMESPACE} deleteGroup ${e}`);
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR);
  }
}
