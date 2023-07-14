import httpCodes from 'http-codes';
import handleErrors from '../../lib/apiErrorHandler';
import SessionReport from '../../policies/sessionReport';
import { currentUserId } from '../../services/currentUser';
import { findEventById } from '../../services/event';
import {
  createSession,
  findSessionsByEventId,
  findSessionById,
  updateSession,
  destroySession,
  getPossibleSessionParticipants,
} from '../../services/sessionReports';
import { userById } from '../../services/users';
import { getEventAuthorization } from '../events/handlers';

const namespace = 'SERVICE:SESSIONREPORTS';

const logContext = { namespace };

export const getSessionAuthorization = async (req, res, report) => {
  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  return new SessionReport(user, report);
};

export const getHandler = async (req, res) => {
  try {
    let session;

    const {
      id,
      eventId,
    } = req.params;

    const params = [id, eventId];

    if (params.every((param) => typeof param === 'undefined')) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Must provide a qualifier' });
    }

    let sessionEventId;

    if (id) {
      session = await findSessionById(id);
    } else if (eventId) {
      sessionEventId = eventId;
      session = await findSessionsByEventId(eventId);
    }

    if (!session) {
      return res.status(httpCodes.NOT_FOUND).send({ message: 'Session Report not found' });
    }

    if (!sessionEventId) {
      sessionEventId = session.eventId;
    }

    // Get associated event to use for authorization for region write
    // we use the event rather than the session since the session in this context
    // can be an array or a single session and the event is a suitable proxy
    // for checking access
    const event = await findEventById(sessionEventId);
    const auth = await getEventAuthorization(req, res, event);

    if (!auth.canRead()) {
      return res.sendStatus(httpCodes.FORBIDDEN);
    }

    return res.status(httpCodes.OK).send(session);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const createHandler = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Request body is empty' });
    }

    const { eventId, data } = req.body;

    if (eventId === undefined) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Event ID is required' });
    }

    // Get associated event to use for authorization for region write
    const event = await findEventById(eventId);
    if (!event) { return res.status(httpCodes.NOT_FOUND).send({ message: 'Event not found' }); }
    const auth = await getEventAuthorization(req, res, event);
    if (!auth.canWriteInRegion()) { return res.sendStatus(403); }

    const session = await createSession({
      eventId,
      data: {
        ...data,
        eventName: event.data.eventName,
        eventDisplayId: event.data.eventId,
        regionId: event.regionId,
        eventOwner: event.ownerId,
      },
    });
    return res.status(httpCodes.CREATED).send(session);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const updateHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.body) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Request body is empty' });
    }

    if (id === undefined) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Session Report ID is required' });
    }

    const session = await findSessionById(id);

    const auth = await getSessionAuthorization(req, res, session);
    if (!auth.canDelete()) { return res.sendStatus(403); }

    const updatedSession = await updateSession(id, req.body);
    return res.status(httpCodes.CREATED).send(updatedSession);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const deleteHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === undefined) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Session Report ID is required' });
    }

    const session = await findSessionById(id);
    const auth = await getSessionAuthorization(req, res, session);
    if (!auth.canDelete()) { return res.sendStatus(403); }

    await destroySession(id);
    return res.status(httpCodes.OK).send({ message: 'Session report deleted' });
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const getParticipants = async (req, res) => {
  try {
    const { regionId } = req.params; // checked by middleware
    const participants = await getPossibleSessionParticipants(Number(regionId));
    return res.status(httpCodes.OK).send(participants);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};
