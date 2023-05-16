import handleErrors from '../../lib/apiErrorHandler';
import { Events } from '../../models';
import {
  createEvent,
  findEventByCollaboratorId,
  findEventById,
  findEventByOwnerId,
  findEventByPocId,
  findEventByRegionId,
} from '../../services/event';

const namespace = 'SERVICE:EVENTS';

const logContext = {
  namespace,
};

export const readHandler = async (req, res) => {
};

export const getEvent = async (req, res) => {
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
      event = await findEventByRegionId(regionId);
    } else if (ownerId) {
      event = await findEventByOwnerId(ownerId);
    } else if (pocId) {
      event = await findEventByPocId(pocId);
    } else if (collaboratorId) {
      event = await findEventByCollaboratorId(collaboratorId);
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
