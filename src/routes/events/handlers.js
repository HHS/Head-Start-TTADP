import httpCodes from 'http-codes';
import handleErrors from '../../lib/apiErrorHandler';
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

const namespace = 'SERVICE:EVENTS';

const logContext = { namespace };

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

    if (!event) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Event not found' });
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

    const event = await updateEvent(eventId, req.body);
    return res.status(httpCodes.CREATED).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const deleteHandler = async (req, res) => {
  try {
    const { eventId } = req.params;
    await destroyEvent(eventId);
    return res.status(httpCodes.OK);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};
