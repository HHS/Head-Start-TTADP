import { downloadFilesFromSource } from './download';
import { processZipFileFromS3 } from './process';
import { importHasMoreToDownload, importHasMoreToProcess } from './record';

//---------------------------------------------------------------------------------------

const download = async (
  importId: number,
) => downloadFilesFromSource(importId);

const process = async (
  importId: number,
) => processZipFileFromS3(importId);

const moreToDownload = async (
  importId: number,
): Promise<boolean> => importHasMoreToDownload(importId);

const moreToProcess = async (
  importId: number,
): Promise<boolean> => importHasMoreToProcess(importId);

export {
  download,
  process,
  moreToDownload,
  moreToProcess,
};
