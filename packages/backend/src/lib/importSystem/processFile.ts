import { Readable } from 'stream';
import processRecords from './processRecords';
import EncodingConverter from '../stream/encoding';
import Hasher from '../stream/hasher';
import XMLStream, { SchemaNode } from '../stream/xml';
import { FileInfo as ZipFileInfo } from '../stream/zip';
import { auditLogger } from '../../logger';
import { ProcessDefinition } from './types';

/**
 * Processes a file based on the provided process definition.
 *
 * @param processDefinition - The process definition object that contains information
 * about how to process the file.
 * @param fileInfo - Information about the file being processed.
 * @param fileStream - The stream of the file being processed.
 * @returns A promise that resolves to an object containing arrays of promises for
 * inserts, updates, and deletes.
 * @throws An error if the remapDefs property is not found in the processDefinition.
 * @throws An error if the model property is not found in the processDefinition.
 * @throws An error if the key property is not found in the processDefinition.
 */
const processFile = async (
  processDefinition: ProcessDefinition,
  fileInfo: ZipFileInfo,
  fileStream: Readable,
): Promise<{
  hash?: string,
  schema?: SchemaNode,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inserts?: Promise<any>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates?: Promise<any>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deletes?: Promise<any>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: Promise<any>[],
}> => {
  let result: {
    hash?: string,
    schema?: SchemaNode,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inserts?: Promise<any>[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updates?: Promise<any>[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deletes?: Promise<any>[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errors: Promise<any>[],
  } = {
    errors: [],
  };

  try {
    // Check if remapDefs property exists in processDefinition, if not throw an error
    if (!processDefinition?.remapDef) throw new Error('Remapping definitions not found');
    // Check if model property exists in processDefinition, if not throw an error
    if (!processDefinition?.tableName) throw new Error('Model not found');
    // Check if key property exists in processDefinition, if not throw an error
    if (!processDefinition?.keys) throw new Error('Keys not found');
    // Check if key property exists in processDefinition, if not throw an error
    if (!processDefinition?.encoding) throw new Error('Encoding not found');

    const hashStream = new Hasher('sha256');

    const encodingConverter = new EncodingConverter('utf8', processDefinition.encoding);

    // Convert the fileStream to a usable stream while also calculation the hash
    const usableStream = fileStream.pipe(hashStream).pipe(encodingConverter);

    // Create a new instance of XMLStream using the usableStream
    const xmlClient = new XMLStream(usableStream, true);
    await xmlClient.initialize();

    const processedRecords = await processRecords(processDefinition, xmlClient, fileInfo.date);

    // hash needs to be collected after processRecords returns to make sure all the data has
    // been processed for all records in the file
    const hash = await hashStream.getHash();
    const schema = await xmlClient.getObjectSchema();

    result = {
      hash,
      schema,
      ...processedRecords,
    };
  } catch (err) {
    result.errors.push(err.message);
    auditLogger.log('error', ` processFile ${err.message}`, err);
  }

  return result;
};

export default processFile;
