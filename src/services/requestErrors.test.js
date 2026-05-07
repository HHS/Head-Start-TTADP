import { Op } from 'sequelize';
import db, { RequestErrors } from '../models';
import createRequestError, { requestErrorById, requestErrors } from './requestErrors';

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

    it('throws an error if RequestErrors.create fails', async () => {
      jest.spyOn(RequestErrors, 'create').mockImplementation(() => {
        throw new Error('Mocked create error');
      });

      await expect(
        createRequestError({
          operation: 'OPERATION',
          uri: 'http://smarthub.com',
          method: 'GET',
          requestBody: { foo: 'data' },
          responseBody: 'Test Response',
          responseCode: '500',
        })
      ).rejects.toThrow('Error creating RequestError entry');

      jest.restoreAllMocks();
    });

    it('uses default values for responseBody and responseCode', async () => {
      const requestErrorId = await createRequestError({
        operation: 'DEFAULT',
        uri: 'http://smarthub.com',
        method: 'GET',
        requestBody: { default: true },
      });

      const retrievedRequestError = await RequestErrors.findOne({
        where: {
          id: {
            [Op.eq]: requestErrorId,
          },
        },
      });

      expect(retrievedRequestError).toBeDefined();
      expect(retrievedRequestError.responseBody).toBe('N/A');
      expect(retrievedRequestError.responseCode).toBe('N/A');

      await RequestErrors.destroy({ where: { id: requestErrorId } });
    });

    it('returns request errors with default parameters', async () => {
      const requestErrorId = await createRequestError({
        operation: 'OPERATION',
        uri: 'http://smarthub.com',
        method: 'POST',
        requestBody: { foo: 'bar' },
        responseBody: 'Test Response',
        responseCode: '500',
      });

      const result = await requestErrors();

      expect(result).toBeDefined();
      expect(result.count).toBeGreaterThanOrEqual(1);

      await RequestErrors.destroy({ where: { id: requestErrorId } });
    });

    it('applies filter, range, and sort correctly', async () => {
      await createRequestError({
        operation: 'OPERATION_1',
        uri,
        method: 'GET',
        requestBody: { test: true },
      });

      await createRequestError({
        operation: 'OPERATION_2',
        uri,
        method: 'POST',
        requestBody: { test: false },
      });

      await createRequestError({
        operation: 'OPERATION_3',
        uri,
        method: 'PUT',
        requestBody: { test: null },
      });

      const result = await requestErrors({
        filter: JSON.stringify({ uri }),
        range: '[0,5]',
        sort: '["createdAt","ASC"]',
      });

      expect(result).toBeDefined();
      expect(result.rows.length).toBe(3);
      expect(result.rows[0].uri).toBe(uri);
      expect(result.rows[1].uri).toBe(uri);
      expect(result.rows[2].uri).toBe(uri);

      await RequestErrors.destroy({ where: { uri } });
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
      const retrievedRequestErrors = await requestErrors({
        filter: JSON.stringify({ uri }),
        range: '[0,1]',
      });
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
});
