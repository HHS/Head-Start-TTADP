import handleErrors from '../../lib/apiErrorHandler';
import { Events } from '../../models';
import {
  createEvent,
  findEventsByCollaboratorId,
  findEventById,
  findEventsByOwnerId,
  findEventsByPocId,
  findEventsByRegionId,
  updateEvent,
} from '../../services/event';

const namespace = 'SERVICE:EVENTS';

const logContext = {
  namespace,
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

    if (!event) {
      return res.status(404).send({ message: 'Event not found' });
    }

    return res.status(200).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const createHandler = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).send({ message: 'Request body is empty' });
    }

    const event = await createEvent(req.body);
    return res.status(201).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const updateHandler = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).send({ message: 'Request body is empty' });
    }

    const event = await updateEvent(req.body);
    return res.status(201).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};
