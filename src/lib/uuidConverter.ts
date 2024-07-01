import { v5 as uuidv5, validate as validateUUID, v4 as uuidv4 } from 'uuid';

const UUID_NAMESPACE = uuidv4(); // You can use a fixed namespace UUID

/**
 * Converts a given job ID to a UUID format.
 * @param jobId - The job ID to be converted.
 * @returns The UUID formatted job ID.
 */
export default function convertToUUID(jobId: string): string {
  // Check if jobId is already a valid UUID
  if (validateUUID(jobId)) {
    return jobId;
  }

  // Check if jobId is a numeric string
  if (/^\d+$/.test(jobId)) {
    // Convert the numeric string to a UUID using a namespace
    return uuidv5(jobId, UUID_NAMESPACE);
  }

  // If jobId is a custom string, generate a UUID based on the string
  return uuidv5(jobId, UUID_NAMESPACE);
}
