import httpCodes from 'http-codes';
import handleErrors from '../../lib/apiErrorHandler';
import {
  createSession,
  findSessionsByEventId,
  findSessionById,
  updateSession,
  destroySession,
} from '../../services/sessionReports';

const namespace = 'SERVICE:SESSIONREPORTS';

const logContext = { namespace };

export const getHandler = async (req, res) => {
  try {
    let tr;

    const {
      id,
      eventId,
    } = req.params;

    if (id) {
      tr = await findSessionById(id);
    } else if (eventId) {
      tr = await findSessionsByEventId(eventId);
    }

    if (!tr) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Session Report not found' });
    }

    return res.status(httpCodes.OK).send(tr);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const createHandler = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(httpCodes.BAD_REQUEST).send({ message: 'Request body is empty' });
    }

    const event = await createSession(req.body);
    return res.status(httpCodes.CREATED).send(event);
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

    const event = await updateSession(id, req.body);
    return res.status(httpCodes.CREATED).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const deleteHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await destroySession(id);
    return res.status(httpCodes.OK);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};
