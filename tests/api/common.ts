import { APIResponse, expect } from '@playwright/test';
import Joi from 'joi';

export const root = `http://localhost:8080/api`;

export const validateSchema = async (response: APIResponse, schema: Joi.ObjectSchema | Joi.ArraySchema, expect) => {
  const body = await response.body();
  const json = JSON.parse(String(body));
  const { error } = schema.validate(json);
  expect(error).toBe(undefined);
};