/* eslint-disable import/prefer-default-export */
import handleErrors from '../../lib/apiErrorHandler';
import { findAll } from '../../services/enums/generic';

const namespace = 'HANDLERS:ENUM';

const logContext = {
  namespace,
};

export async function findAllFromEnum(req, res) {
  try {
    const { enumName, enumType } = req.params;
    res.json(await findAll(enumName, enumType));
  } catch (err) {
    await handleErrors(req, res, err, logContext);
  }
}
