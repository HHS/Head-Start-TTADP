// uuidConverter.test.ts
import { validate as validateUUID } from 'uuid';
import convertToUUID from './uuidConverter';

describe('convertToUUID', () => {
  it('should return a valid UUID when given a numeric string', () => {
    const jobId = '123';
    const uuid = convertToUUID(jobId);
    expect(validateUUID(uuid)).toBe(true);
  });

  it('should return the same UUID when given a valid UUID', () => {
    const jobId = '550e8400-e29b-41d4-a716-446655440000';
    const uuid = convertToUUID(jobId);
    expect(uuid).toBe(jobId);
  });

  it('should return a valid UUID when given a custom string', () => {
    const jobId = 'custom-job-id-123';
    const uuid = convertToUUID(jobId);
    expect(validateUUID(uuid)).toBe(true);
  });

  it('should return different UUIDs for different numeric strings', () => {
    const jobId1 = '123';
    const jobId2 = '124';
    const uuid1 = convertToUUID(jobId1);
    const uuid2 = convertToUUID(jobId2);
    expect(uuid1).not.toBe(uuid2);
  });

  it('should return different UUIDs for different custom strings', () => {
    const jobId1 = 'custom-job-id-123';
    const jobId2 = 'custom-job-id-124';
    const uuid1 = convertToUUID(jobId1);
    const uuid2 = convertToUUID(jobId2);
    expect(uuid1).not.toBe(uuid2);
  });
});
