import { downloadFilesFromSource } from './download'
import { processZipFileFromS3 } from './process'
import { importHasMoreToDownload, importHasMoreToProcess, importSchedules } from './record'

/**
 * Initiates the download of files associated with the given import ID.
 * @param importId - The ID of the import operation to download files for.
 * @param timeBox - Optional time limit for the download process in milliseconds.
 * @returns A Promise resolved with the result of the download operation.
 * @throws Will throw an error if the download operation fails.
 */
const download = async (importId: number, timeBox?: number) => downloadFilesFromSource(importId, timeBox)

/**
 * Processes the ZIP file from S3 for the given import ID.
 * @param importId - The ID of the import operation whose ZIP file should be processed.
 * @param timeBox - Optional time limit for the download process in milliseconds.
 * @returns A Promise resolved with the result of the processing operation.
 * @throws Will throw an error if the processing operation fails.
 */
const process = async (importId: number) => processZipFileFromS3(importId)

/**
 * Checks if there are more files to download for the given import ID.
 * @param importId - The ID of the import operation to check for more files.
 * @returns A Promise resolved with a boolean indicating whether there are more files to download.
 * @throws Will throw an error if the check operation fails.
 */
const moreToDownload = async (importId: number): Promise<boolean> => importHasMoreToDownload(importId)

/**
 * Checks if there is more processing to be done for the given import ID.
 * @param importId - The ID of the import operation to check for more processing.
 * @returns A Promise resolved with a boolean indicating whether there is more processing
 * to be done.
 * @throws Will throw an error if the check operation fails.
 */
const moreToProcess = async (importId: number): Promise<boolean> => importHasMoreToProcess(importId)

/**
 * Retrieves the import schedules.
 * @returns A Promise resolved with the list of import schedules.
 * @throws Will throw an error if retrieving the import schedules fails.
 */
const getImportSchedules = async () => importSchedules()

export { download, process, moreToDownload, moreToProcess, getImportSchedules }
