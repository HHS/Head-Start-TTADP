import { Op } from 'sequelize';
import db, {
  RequestErrors,
} from '../models';
import createRequestError from './requestErrors';

describe('createRequestError', () => {
  afterAll(async () => {
    db.sequelize.close();
  });

  it('creates request error', async () => {
    const operation = 'TEST OPERATION';
    const uri = 'http://smarthub';
    const method = 'POST';
    const requestBody = { foo: 'bar' };
    const responseBody = { error: { foo: 'bar' } };
    const responseCode = '500';
    const requestErrorId = await createRequestError({
      operation,
      uri,
      method,
      requestBody,
      responseBody,
      responseCode,
    });
    const retrievedRequestError = await RequestErrors.findOne({
      where: {
        id: {
          [Op.eq]: requestErrorId,
        },
      },
    });
    expect(retrievedRequestError).toBeDefined();
    expect(retrievedRequestError.id).toEqual(String(requestErrorId));
    expect(retrievedRequestError.operation).toEqual(operation);
    expect(retrievedRequestError.uri).toEqual(uri);
    expect(retrievedRequestError.method).toEqual(method);
    expect(retrievedRequestError.requestBody).toEqual(requestBody);
    expect(retrievedRequestError.responseBody).toEqual(responseBody);
    expect(retrievedRequestError.responseCode).toEqual(responseCode);
    expect(retrievedRequestError.createdAt).toBeDefined();
    expect(retrievedRequestError.updatedAt).toBeDefined();
    await RequestErrors.destroy({ where: { id: requestErrorId } });
  });

  it('Throws on error', async () => {
    await expect(createRequestError(undefined)).rejects.toThrow();
  });
});
