/* eslint-disable  @typescript-eslint/no-explicit-any */
import { CronJob } from 'cron';
import db from '../../models';
import { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } from '../../constants';
import {
  addQueueProcessor,
  enqueueMaintenanceJob,
  maintenanceCommand,
  addCronJob,
} from './common';
import {
  download as downloadImport,
  process as processImport,
} from '../importSystem';

const {
  sequelize,
  MaintenanceLog,
  Import,
} = db;

const enqueueImportMaintenanceJob = (
  type: typeof MAINTENANCE_TYPE[keyof typeof MAINTENANCE_TYPE],
  id?: number,
) => enqueueMaintenanceJob(
  MAINTENANCE_CATEGORY.IMPORT,
  {
    type,
    id,
  },
);

const scheduleImportCrons = async () => {
  const imports = await Import.findAll({
    attributes: [
      'id',
      'name',
      'schedule',
    ],
    where: {
      enabled: true,
    },
    raw: true,
  });

  imports.forEach(({
    id,
    name,
    schedule: importSchedule,
  }) => addCronJob(
    MAINTENANCE_CATEGORY.IMPORT,
    MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
    (category, type, timezone, schedule) => CronJob(
      schedule,
      () => enqueueImportMaintenanceJob(
        MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
        id,
      ),
      null,
      null,
      timezone,
    ),
    importSchedule,
  ));

  return { imports };
};

const importSchedule = async () => maintenanceCommand(
  async (logMessages, logBenchmarks, triggeredById) => {
    try {
      const scheduleResults = await scheduleImportCrons();
      return {
        isSuccessful: !Object.keys(scheduleResults).includes('error'),
        ...scheduleResults,
      };
    } catch (err) {
      return { isSuccessful: false, error: err };
    }
  },
  MAINTENANCE_CATEGORY.IMPORT,
  MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
);

const importDownload = async (id) => maintenanceCommand(
  async (logMessages, logBenchmarks, triggeredById) => {
    try {
      const downloadResults = await downloadImport(id);
      return {
        isSuccessful: !Object.keys(downloadResults).includes('error'),
        ...downloadResults,
      };
    } catch (err) {
      return { isSuccessful: false, error: err };
    }
  },
  MAINTENANCE_CATEGORY.IMPORT,
  MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
  { id },
);

const importProcess = async (id) => maintenanceCommand(
  async (logMessages, logBenchmarks, triggeredById) => {
    try {
      const processResults = await processImport(id);
      return {
        isSuccessful: !Object.keys(processResults).includes('error'),
        ...processResults,
      };
    } catch (err) {
      return { isSuccessful: false, error: err };
    }
  },
  MAINTENANCE_CATEGORY.IMPORT,
  MAINTENANCE_TYPE.IMPORT_PROCESS,
  { id },
);

const importMaintenance = async (job) => {
  const {
    type,
    id,
  } = job.data;

  let action;

  switch (type) {
    case MAINTENANCE_TYPE.IMPORT_SCHEDULE:
      action = importSchedule();
      break;
    case MAINTENANCE_TYPE.IMPORT_DOWNLOAD:
      action = importDownload(id);
      break;
    case MAINTENANCE_TYPE.IMPORT_PROCESS:
      action = importProcess(id);
      break;
    default:
      throw new Error();
  }

  return action;
};

addQueueProcessor(MAINTENANCE_CATEGORY.IMPORT, importMaintenance);
enqueueImportMaintenanceJob(MAINTENANCE_TYPE.IMPORT_SCHEDULE);
