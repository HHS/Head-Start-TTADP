import { Op } from 'sequelize';
import db, {
  RequestErrors,
} from '../models';
import createRequestError, {
  requestErrors, requestErrorById, requestErrorsByIds, delRequestErrors,
} from './requestErrors';

describe('RequestErrors DB service', () => {
  const operation = 'OPERATION';
  const uri = 'http://smarthub';
  const method = 'POST';
  const requestBody = { foo: 'bar' };
  const responseBody = { error: { foo: 'encountered problems' } };
  const responseCode = '400';

  beforeAll(async () => {
    await RequestErrors.destroy({ where: { uri } });
  });

  afterAll(async () => {
    await RequestErrors.destroy({ where: { uri } });
    await db.sequelize.close();
  });

  describe('createRequestError', () => {
    it('creates request error', async () => {
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

    it('throws on error', async () => {
      await expect(createRequestError(undefined)).rejects.toThrow();
    });
  });

  describe('requestErrors', () => {
    it('returns request errors', async () => {
      const requestErrorId = await createRequestError({
        operation,
        uri,
        method,
        requestBody,
        responseBody,
        responseCode,
      });
      const retrievedRequestErrors = await requestErrors({ filter: JSON.stringify({ uri }), range: '[0,1]' });
      expect(retrievedRequestErrors).toBeDefined();
      expect(retrievedRequestErrors.count).toBe(1);
      await RequestErrors.destroy({ where: { id: requestErrorId } });
    });
  });

  describe('requestErrorById', () => {
    it('returns request error', async () => {
      const requestErrorId = await createRequestError({
        operation,
        uri,
        method,
        requestBody,
        responseBody,
        responseCode,
      });
      const retrievedRequestErrors = await requestErrorById(requestErrorId);
      expect(retrievedRequestErrors).toBeDefined();
      expect(retrievedRequestErrors.method).toBe('POST');
      await RequestErrors.destroy({ where: { id: requestErrorId } });
    });
  });

  describe('requestErrorsByIds', () => {
    it('returns ids of found records', async () => {
      const requestErrorId = await createRequestError({
        operation,
        uri,
        method,
        requestBody,
        responseBody,
        responseCode,
      });
      const retrievedRequestErrors = await requestErrorsByIds({
        filter: JSON.stringify({ id: requestErrorId }),
      });
      expect(retrievedRequestErrors).toBeDefined();
      expect(retrievedRequestErrors.length).toBe(1);
      await RequestErrors.destroy({ where: { id: requestErrorId } });
    });
  });

  describe('delRequestErrors', () => {
    it('deletes records', async () => {
      const requestErrorId = await createRequestError({
        operation,
        uri,
        method,
        requestBody,
        responseBody,
        responseCode,
      });
      const retrievedRequestErrors = await requestErrorsByIds({
        filter: JSON.stringify({ id: requestErrorId }),
      });
      expect(retrievedRequestErrors).toBeDefined();
      expect(retrievedRequestErrors.length).toBe(1);
      const response = await delRequestErrors({ filter: `{"id":[${requestErrorId}]}` });
      expect(response).toBe(1);
      const retrievedRequestErrorsAfterDel = await requestErrorsByIds({
        filter: JSON.stringify({ id: requestErrorId }),
      });
      expect(retrievedRequestErrorsAfterDel.length).toBe(0);
    });
  });
});
