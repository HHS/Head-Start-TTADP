import { Op } from 'sequelize';
import httpCodes from 'http-codes';
import { TRAINING_REPORT_STATUSES_URL_PARAMS } from '@ttahub/common';
import handleErrors from '../../lib/apiErrorHandler';
import EventReport from '../../policies/event';
import { currentUserId } from '../../services/currentUser';
import {
  createEvent,
  findEventsByCollaboratorId,
  findEventById,
  findEventsByOwnerId,
  findEventsByPocId,
  findEventsByRegionId,
  updateEvent,
  destroyEvent,
  findEventsByStatus,
} from '../../services/event';
import { userById } from '../../services/users';
import { setReadRegions, setTrainingReportReadRegions, userIsPocRegionalCollaborator } from '../../services/accessValidation';
import filtersToScopes from '../../scopes';

const namespace = 'SERVICE:EVENTS';

const logContext = { namespace };

export const getEventAuthorization = async (req, res, report) => {
  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  return new EventReport(user, report);
};

export const getByStatus = async (req, res) => {
  try {
    const { status: statusParam } = req.params;
    const auth = await getEventAuthorization(req, res, {});
    const userId = await currentUserId(req, res);
    const status = TRAINING_REPORT_STATUSES_URL_PARAMS[statusParam];
    const updatedFilters = await setTrainingReportReadRegions(req.query, userId);
    const { trainingReport: scopes } = await filtersToScopes(updatedFilters, { userId });

    // If user is a collaborator we want o return all region events and collaborator events.
    if (await userIsPocRegionalCollaborator(userId)) {
      scopes.push({ pocIds: { [Op.contains]: [userId] } });
    }
    const events = await findEventsByStatus(
      status,
      auth.readableRegions,
      userId,
      null,
      false,
      scopes,
    );

    return res.status(httpCodes.OK).send(events);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const getHandler = async (req, res) => {
  try {
    let event;
    const {
      eventId,
      regionId,
      ownerId,
      pocIds,
      collaboratorId,
    } = req.params;

    const params = [eventId, regionId, ownerId, pocIds, collaboratorId];

    if (params.every((param) => typeof param === 'undefined')) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Must provide a qualifier' });
    }

    // Check if user is a collaborator.
    const userId = await currentUserId(req, res);
    const scopes = [];
    if (await userIsPocRegionalCollaborator(userId)) {
      scopes.push({ pocIds: { [Op.contains]: [userId] } });
    }

    if (eventId) {
      event = await findEventById(eventId, scopes);
    } else if (regionId) {
      event = await findEventsByRegionId(regionId);
    } else if (ownerId) {
      event = await findEventsByOwnerId(ownerId);
    } else if (pocIds) {
      event = await findEventsByPocId(pocIds);
    } else if (collaboratorId) {
      event = await findEventsByCollaboratorId(collaboratorId);
    }

    if (!event) {
      return res.status(httpCodes.NOT_FOUND).send({ message: 'Event not found' });
    }

    const auth = await getEventAuthorization(req, res, event);

    if (!auth.canRead() && !auth.isPoc()) {
      return res.sendStatus(403);
    }

    return res.status(httpCodes.OK).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const createHandler = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Request body is empty' });
    }

    const { regionId } = req.body;
    const auth = await getEventAuthorization(req, res, { regionId });
    if (!auth.canWriteInRegion()) { return res.sendStatus(403); }

    const event = await createEvent(req.body);
    return res.status(httpCodes.CREATED).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const updateHandler = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!req.body) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Request body is empty' });
    }

    // Get event to update.
    const eventToUpdate = await findEventById(eventId);
    const auth = await getEventAuthorization(req, res, eventToUpdate);
    if (!auth.canUpdate()) { return res.sendStatus(403); }

    const event = await updateEvent(eventId, req.body);
    return res.status(httpCodes.CREATED).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const deleteHandler = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await findEventById(eventId);
    if (!event) {
      return res.status(httpCodes.NOT_FOUND).send({ message: 'Event not found' });
    }

    const auth = await getEventAuthorization(req, res, event);
    if (!auth.canDelete()) { return res.sendStatus(403); }

    await destroyEvent(eventId);
    return res.status(httpCodes.OK);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};
