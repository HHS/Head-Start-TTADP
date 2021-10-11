import AdmZip from 'adm-zip';
import { toJson } from 'xml2json';
import {} from 'dotenv/config';
import axios from 'axios';
import { keyBy, mapValues } from 'lodash';

import {
  Grantee, Grant, Program,
} from '../models';
import { logger, auditLogger } from '../logger';

const fs = require('mz/fs');

function valueFromXML(value) {
  const isObject = typeof value === 'object';
  const isUndefined = value === undefined;
  return isObject || isUndefined ? null : value;
}

function combineNames(firstName, lastName) {
  const names = [valueFromXML(firstName), valueFromXML(lastName)];
  // filter removes null names (if a user has a firstname but no lastname)
  const joinedName = names.filter((name) => name).join(' ');
  return joinedName === '' ? null : joinedName;
}

/**
 * Reads HSES data files that were previously extracted to the "temp" directory.
 * The files received from HSES are:
 *
 * agency.xml - grantee and grantee that are delegates
 * grant_agency.xml - junction between grants and agencies
 * grant_award.xml - grants
 * grant_award_replacement.xml
 * grant_program.xml
 *
 * The grantee data is them filtered to exclude delegates
 *
 */
export async function processFiles() {
  try {
    const grantAgencyData = await fs.readFile('./temp/grant_agency.xml');
    const json = toJson(grantAgencyData);
    const grantAgency = JSON.parse(json);
    // we are only interested in non-delegates
    const grantGrantees = grantAgency.grant_agencies.grant_agency.filter(
      (g) => g.grant_agency_number === '0',
    );

    // process grantees aka agencies that are non-delegates
    const agencyData = await fs.readFile('./temp/agency.xml');
    const agency = JSON.parse(toJson(agencyData));

    // filter out delegates by matching to the non-delegates
    // eslint-disable-next-line max-len
    const granteesNonDelegates = agency.agencies.agency.filter((a) => grantGrantees.some((gg) => gg.agency_id === a.agency_id));
    const granteesForDb = granteesNonDelegates.map((g) => ({
      id: parseInt(g.agency_id, 10),
      name: g.agency_name,
      granteeType: valueFromXML(g.agency_type),
    }));

    logger.debug(`updateGrantsGrantees: calling bulkCreate for ${granteesForDb.length} grantees`);
    await Grantee.bulkCreate(granteesForDb,
      {
        updateOnDuplicate: ['name', 'granteeType', 'updatedAt'],
      });

    // process grants
    const grantData = await fs.readFile('./temp/grant_award.xml');
    const grant = JSON.parse(toJson(grantData));

    const programData = await fs.readFile('./temp/grant_program.xml');
    const programs = JSON.parse(toJson(programData));

    const grantsForDb = grant.grant_awards.grant_award.map((g) => {
      let { grant_start_date: startDate, grant_end_date: endDate } = g;
      if (typeof startDate === 'object') { startDate = null; }
      if (typeof endDate === 'object') { endDate = null; }

      const programSpecialistName = combineNames(
        g.program_specialist_first_name,
        g.program_specialist_last_name,
      );
      const grantSpecialistName = combineNames(
        g.grants_specialist_first_name,
        g.grants_specialist_last_name,
      );

      const regionId = parseInt(g.region_id, 10);
      const cdi = regionId === 13;
      return {
        id: parseInt(g.grant_award_id, 10),
        number: g.grant_number,
        granteeId: parseInt(g.agency_id, 10),
        status: g.grant_status,
        startDate,
        endDate,
        regionId,
        cdi,
        programSpecialistName,
        programSpecialistEmail: valueFromXML(g.program_specialist_email),
        grantSpecialistName,
        grantSpecialistEmail: valueFromXML(g.grants_specialist_email),
      };
    });

    const grantIds = grantsForDb.map((g) => g.id);
    const grantPrograms = grantGrantees.filter(
      (ga) => grantIds.includes(parseInt(ga.grant_award_id, 10)),
    );

    const grantAgencyMap = mapValues(keyBy(grantPrograms, 'grant_agency_id'), 'grant_award_id');
    const programsWithGrants = programs.grant_programs.grant_program.filter(
      (p) => parseInt(p.grant_agency_id, 10) in grantAgencyMap,
    );

    const programsForDb = programsWithGrants.map((program) => ({
      id: parseInt(program.grant_program_id, 10),
      grantId: parseInt(grantAgencyMap[program.grant_agency_id], 10),
      programType: valueFromXML(program.program_type),
      startYear: valueFromXML(program.program_start_year),
      startDate: valueFromXML(program.grant_program_start_date),
      endDate: valueFromXML(program.grant_program_end_date),
      status: valueFromXML(program.program_status),
      name: valueFromXML(program.program_name),
    }));

    const cdiGrants = grantsForDb.filter((g) => g.regionId === 13);
    const nonCdiGrants = grantsForDb.filter((g) => g.regionId !== 13);

    logger.debug(`updateGrantsGrantees: calling bulkCreate for ${grantsForDb.length} grants`);
    await Grant.bulkCreate(nonCdiGrants,
      {
        updateOnDuplicate: ['number', 'regionId', 'granteeId', 'status', 'startDate', 'endDate', 'updatedAt', 'programSpecialistName', 'programSpecialistEmail', 'grantSpecialistName', 'grantSpecialistEmail'],
      });

    await Grant.bulkCreate(cdiGrants,
      {
        updateOnDuplicate: ['number', 'status', 'startDate', 'endDate', 'updatedAt', 'programSpecialistName', 'programSpecialistEmail', 'grantSpecialistName', 'grantSpecialistEmail'],
      });
    await Program.bulkCreate(programsForDb,
      {
        updateOnDuplicate: ['programType', 'startYear', 'startDate', 'endDate', 'status', 'name'],
      });
  } catch (error) {
    auditLogger.error(`Error reading or updating database on HSES data import: ${error.message}`);
    throw error;
  }
}

/**
 * Downloads the HSES grantee/grant zip, extracts to the "temp" directory
 * and calls processFiles to parse xml data and populate the Smart Hub db
 *
 * Note - file download needs to happen in deployed environments
 */
export default async function updateGrantsGrantees(_processFiles = processFiles) {
  logger.info('updateGrantsGrantees: starting');
  logger.debug('updateGrantsGrantees: retrieving file from HSES');
  await axios(process.env.HSES_DATA_FILE_URL, {
    method: 'get',
    url: process.env.HSES_DATA_FILE_URL,
    responseType: 'stream',
    auth: {
      username: process.env.HSES_DATA_USERNAME,
      password: process.env.HSES_DATA_PASSWORD,
    },
  }).then(({ status, data }) => {
    logger.debug(`updateGrantsGrantees: Got file response: ${status}`);
    const writeStream = fs.createWriteStream('hses.zip');

    return new Promise((resolve, reject) => {
      let error = null;
      writeStream.on('error', (err) => {
        auditLogger.error(`updateGrantsGrantees: writeStream emitted error: ${err}`);
        error = err;
        reject(err);
      });
      writeStream.on('close', () => {
        logger.debug('updateGrantsGrantees: writeStream emitted close');
        if (!error) {
          resolve(true);
        }
      });
      data.pipe(writeStream);
    });
  });
  logger.debug('updateGrantsGrantees: wrote file from HSES');

  const zip = new AdmZip('./hses.zip');
  logger.debug('updateGrantsGrantees: extracting zip file');
  // extract to target path. Pass true to overwrite
  zip.extractAllTo('./temp', true);
  logger.debug('updateGrantsGrantees: unzipped files');

  await _processFiles();
  logger.info('updateGrantsGrantees: processFiles completed');
}
