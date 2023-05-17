import handleErrors from '../../lib/apiErrorHandler';
import {
  createTR,
  findTRsByEventId,
  findTRById,
  updateTR,
} from '../../services/trainingReports';

const namespace = 'SERVICE:TRAININGREPORTS';

const logContext = { namespace };

export const getHandler = async (req, res) => {
  try {
    let tr;

    const {
      id,
      eventId,
    } = req.params;

    if (id) {
      tr = await findTRById(id);
    } else if (eventId) {
      tr = await findTRsByEventId(eventId);
    }

    if (!tr) {
      return res.status(404).send({ message: 'Training Report not found' });
    }

    return res.status(200).send(tr);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const createHandler = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).send({ message: 'Request body is empty' });
    }

    const event = await createTR(req.body);
    return res.status(201).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export const updateHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.body) {
      return res.status(400).send({ message: 'Request body is empty' });
    }

    const event = await updateTR(id, req.body);
    return res.status(201).send(event);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};
