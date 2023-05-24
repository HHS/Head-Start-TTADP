import httpCodes from 'http-codes';
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
} from '../../services/event';
import { userById } from '../../services/users';

const namespace = 'SERVICE:EVENTS';

const logContext = { namespace };

export const getEventAuthorization = async (req, res, report) => {
  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  return new EventReport(user, report);
};

export const getHandler = async (req, res) => {
  try {
    let event;
    const {
      eventId,
      regionId,
      ownerId,
      pocId,
      collaboratorId,
    } = req.params;

    if (eventId) {
      event = await findEventById(eventId);
    } else if (regionId) {
      event = await findEventsByRegionId(regionId);
    } else if (ownerId) {
      event = await findEventsByOwnerId(ownerId);
    } else if (pocId) {
      event = await findEventsByPocId(pocId);
    } else if (collaboratorId) {
      event = await findEventsByCollaboratorId(collaboratorId);
    }

    const params = [eventId, regionId, ownerId, pocId, collaboratorId];

    if (params.every((param) => typeof param === 'undefined')) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Must provide a qualifier' });
    }

    if (!event) {
      return res.status(httpCodes.NOT_FOUND).send({ message: 'Event not found' });
    }

    const auth = getEventAuthorization(req, res, event);

    if (!auth.canRead()) {
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
    const auth = getEventAuthorization(req, res, { regionId });
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

    const { regionId } = req.body;
    const auth = getEventAuthorization(req, res, { regionId });
    if (!auth.canWriteInRegion()) { return res.sendStatus(403); }

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

    const auth = getEventAuthorization(req, res, event);
    if (!auth.canDelete()) { return res.sendStatus(403); }

    await destroyEvent(eventId);
    return res.status(httpCodes.OK);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};
