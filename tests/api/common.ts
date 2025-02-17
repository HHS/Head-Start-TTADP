import { APIResponse } from '@playwright/test';
import Joi from '@hapi/joi';

export const root = `http://localhost:8080/api`;

/**
 * Validates the response body against a Joi schema.
 * @param response The API response to validate.
 * @param schema The Joi schema to use for validation.
 * @param expect The Jest expect function to use for asserting the validation result.
 * @throws If the response body could not be parsed as JSON or if validation fails.
 */
export const validateSchema = async (response: APIResponse, schema: Joi.ObjectSchema | Joi.ArraySchema, expect) => {
  const body = await response.body();
  const json = JSON.parse(String(body));
  const { error } = schema.validate(json);
  expect(error).toBe(undefined);
};