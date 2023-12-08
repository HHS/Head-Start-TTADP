import { Request, Response } from 'express';
import { DECIMAL_BASE } from '@ttahub/common';
import { Op } from 'sequelize';
import httpCodes from 'http-codes';
import db from '../../models';
import { auditLogger } from '../../logger';
import { userById } from '../../services/users';
import { currentUserId } from '../../services/currentUser';
import {
  group,
  groups,
  editGroup,
  createNewGroup,
  destroyGroup,
} from '../../services/groups';
import GroupPolicy from '../../policies/group';
import { GROUP_COLLABORATORS } from '../../constants';

const NAMESPACE = 'GROUPS';
const {
  Group,
  Grant,
  CollaboratorType,
  GroupCollaborator,
} = db;

interface GQuery {
  id: number;
  name: string;
}

const GROUP_ERRORS = {
  ALREADY_EXISTS: 'This group name already exists, please use a different name',
  ERROR_SAVING: 'There was an error saving your group',
};

export async function getGroups(req: Request, res: Response) {
  try {
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const userRegions = user.permissions.map((p) => p.regionId);
    const usersGroups = await groups(userId, userRegions);
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
    if (!policy.ownsGroup() && !policy.isPublic()) {
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
    const grants = await Grant.findAll({
      where: {
        id: req.body.grants,
      },
    });

    const user = await userById(userId);
    const policy = new GroupPolicy(user, grants);

    if (!policy.canAddToGroup()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    // check for name uniqueness
    const existingGroup = await Group.findOne({
      where: {
        name: {
          [Op.iLike]: req.body.name.trim(),
        },
      },
    });

    if (existingGroup) {
      res.status(httpCodes.ACCEPTED).json({
        error: 'new-group-name',
        message: GROUP_ERRORS.ALREADY_EXISTS,
      });
      return;
    }

    const groupResponse = await createNewGroup({ ...req.body, userId });
    res.json(groupResponse);
  } catch (e) {
    auditLogger.error(`${NAMESPACE} createGroup ${e}`);
    res.status(httpCodes.INTERNAL_SERVER_ERROR).json({
      message: GROUP_ERRORS.ERROR_SAVING,
    });
  }
}

export async function updateGroup(req: Request, res: Response) {
  try {
    const { groupId } = req.params;
    const userId = await currentUserId(req, res);

    const existingGroups = await Group.findAll({
      where: {
        [Op.or]: [
          {
            id: groupId,
          },
          {
            name: {
              [Op.iLike]: req.body.name.trim(),
            },
            id: {
              [Op.not]: groupId,
            },
          },
        ],
      },
      attribtes: ['id'],
      include: [{
        model: GroupCollaborator,
        as: 'groupCollaborators',
        required: true,
        include: [{
          model: CollaboratorType,
          as: 'collaboratorType',
          required: true,
          where: { name: [GROUP_COLLABORATORS.CREATOR, GROUP_COLLABORATORS.EDITOR] },
          attributes: ['name'],
        }],
        attributes: ['userId'],
      }],
    });

    // there can only be one
    const existingGroupById = existingGroups.find(
      (g: GQuery) => g.id === parseInt(groupId, DECIMAL_BASE),
    );
    const existingGroupByName = existingGroups.find(
      (g: GQuery) => g.name === req.body.name && g.id !== parseInt(groupId, DECIMAL_BASE),
    );

    if (existingGroupByName) {
      res.status(httpCodes.ACCEPTED).json({
        error: 'new-group-name',
        message: GROUP_ERRORS.ALREADY_EXISTS,
      });
      return;
    }

    const policy = new GroupPolicy({ id: userId, permissions: [] }, [], existingGroupById);
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
    res.status(httpCodes.INTERNAL_SERVER_ERROR).json({
      message: GROUP_ERRORS.ERROR_SAVING,
    });
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

    // We should check that the group exists before we attempt to delete it.
    if (!existingGroup) {
      res.status(httpCodes.OK).json({});
      return;
    }

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
