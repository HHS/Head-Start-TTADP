import { Op } from 'sequelize';
import {
  remap,
  collectChangedValues,
  lowercaseKeys,
  createRanges,
} from '../dataObjectUtils';
import { filterDataToModel, modelForTable } from '../modelUtils';
import { getHash } from '../stream/hasher';
import XMLStream from '../stream/xml';
import db from '../../models';
import { auditLogger } from '../../logger';
import { ProcessDefinition } from './types';

/**
 * Process records according to the given process definition and XML client.
 * @param processDefinition - The process definition object.
 * @param xmlClient - The XML client object.
 * @param fileDate -  the data the file was modified
 * @param recordActions - The record actions object containing arrays of promises for
 * inserts, updates, and deletes.
 * @param schema - the name of each of the columns within the data
 * @returns A promise that resolves to the updated recordActions object and schema.
 */
const processRecords = async (
  processDefinition: ProcessDefinition,
  xmlClient: XMLStream,
  fileDate: Date,
  recordActions: {
    inserts,
    updates,
    deletes,
    errors,
  } = {
    inserts: [],
    updates: [],
    deletes: [],
    errors: [],
  },
): Promise<{
  inserts,
  updates,
  deletes,
  errors,
}> => {
  let record;
  try {
    record = await xmlClient.getNextObject(true);
  } catch (err) {
    // record the error into the recordActions and continue on successfully as
    // other entries may be process successfully
    recordActions.errors.push(err.message);
    auditLogger.log('error', ` processRecords getNextObject ${err.message}`, err);
  }

  // @ts-ignore
  let model;
  try {
    model = modelForTable(db, processDefinition.tableName);
  } catch (err) {
    // record the error into the recordActions
    recordActions.errors.push(err.message);
    auditLogger.log('error', ` processRecords modelForTable ${err.message}`, err);

    // Unable to continue as a model is required to record any information
    return Promise.reject(recordActions);
  }

  if (record) {
    try {
      // TODO: column/key alpha sort to retain order
      // 1. use the remap method to format data to structure needed
      // 2. use the filterDataToModel to match what is expected
      // 3. check for existing record
      // 4a. if new
      //   1. insert
      //   2. recordActions.inserts.push(uuid)
      // 4b. if found
      //   1. use the collectChangedValues to find the values to update
      //   2. update
      //   2. recordActions.update.push(uuid)

      // Format the record data using the remap method
      // This changes the attribute names and structure into what will be saved
      const { mapped: data } = remap(
        record,
        lowercaseKeys(processDefinition.remapDef),
        {
          keepUnmappedValues: false,
          // defines a custom fuction that will replace the resulting structure
          // with the result of each function.
          targetFunctions: {
            // take in an object and generate a hash of that object
            'toHash.*': (toHash) => ({ hash: getHash(toHash) }),
          },
        },
      );

      // Filter the data to match the expected model
      const {
        matched: filteredData,
        unmatched: droppedData,
      } = await filterDataToModel(data, model);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordKey: Record<string, any> = {};
      processDefinition.keys.forEach((key) => {
        const value = filteredData[key];
        if (value) {
          recordKey[key] = value;
        }
        // TODO: handle case where all/part of the key may have been dropped
      });
      if (Object.keys(droppedData).length > 0) {
        // TODO: add some kind of note/warning that mapped data was filtered out at the model level
        // The message should include the importDataFileId, the recordKey, and the column names.
        // The column values should be excluded to prevent posable display of PII
      }

      // Check if there is an existing record with the same key value
      const currentData = await model.findOne({
        where: {
          ...recordKey,
        },
      });

      if (!currentData) {
        // If the record is new, create it
        const insert = model.create(
          {
            ...filteredData,
            sourceCreatedAt: fileDate,
            sourceUpdatedAt: fileDate,
          },
          {
            individualHooks: true,
            returning: true,
          },
        );
        recordActions.inserts.push(insert);
      } else if (fileDate > currentData.sourceUpdatedAt) {
        // If the record already exists, find the delta then update it
        const delta = collectChangedValues(filteredData, currentData);
        const update = model.update(
          {
            ...delta,
            sourceUpdatedAt: fileDate,
            ...(currentData.sourceDeletedAt && { sourceDeletedAt: null }),
            updatedAt: new Date(),
          },
          {
            where: { id: currentData.id },
            individualHooks: true,
            returning: true,
          },
        );
        recordActions.updates.push(update);
      }
    } /* istanbul ignore next: hard to test errors */ catch (err) {
      // record the error into the recordActions and continue on successfully as
      // other entries may be process successfully
      recordActions.errors.push(err.message);
      auditLogger.log('error', ` processRecords create/update ${err.message}`, err);
    }
  } else {
    try {
      // 1. Find all records not in recordActions.inserts and recordActions.update
      // 2. delete
      // 3. recordActions.delete.push(promises)
      // 4. pass back recordActions

      const [
        affectedDataInserts,
        affectedDataUpdates,
      ] = await Promise.all([
        Promise.all(recordActions.inserts),
        Promise.all(recordActions.updates),
      ]);

      // Flatten the affectedDataUpdates array and extract the objects
      const flattenedUpdates = affectedDataUpdates.flatMap(
        // Assuming the second element of each sub-array is the array of objects
        (update) => (Array.isArray(update[1]) ? update[1] : []),
      );

      // Combine the affected data from inserts and flattened updates
      const affectedData = [
        ...affectedDataInserts,
        ...flattenedUpdates,
      ];

      const affectedDataIds = affectedData?.map(({ id }) => id).filter((id) => id) || [];
      const affectedRanges = createRanges(affectedDataIds);

      // mark the source date when the records no longer are present in the processed file
      // "Delete" all records that are not in the affectedData array
      if (affectedDataIds.length) {
        const destroys = model.update(
          {
            sourceDeletedAt: fileDate,
          },
          {
            where: {
              [Op.and]: affectedRanges.map((range) => ({
                id: { [Op.notBetween]: range },
              })),
              sourceDeletedAt: null,
            },
            individualHooks: true,
          },
        );

        recordActions.deletes.push(destroys);
      }
    } /* istanbul ignore next: hard to test errors */ catch (err) {
      // record the error into the recordActions
      recordActions.deletes.push(err.message);
      auditLogger.log('error', ` processRecords destroy ${err.message}`, err);
    }

    return Promise.resolve(recordActions);
  }

  // Recursively call the processRecords function to process the next record
  return processRecords(
    processDefinition,
    xmlClient,
    fileDate,
    recordActions,
  );
};

export default processRecords;
