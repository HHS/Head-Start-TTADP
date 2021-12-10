import AdmZip from 'adm-zip';
import { toJson } from 'xml2json';
import { } from 'dotenv/config';
import axios from 'axios';
import { keyBy, mapValues } from 'lodash';

import {
  Recipient, Grant, Program,
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
 * agency.xml - recipient and recipient that are delegates
 * grant_agency.xml - junction between grants and agencies
 * grant_award.xml - grants
 * grant_award_replacement.xml
 * grant_program.xml
 *
 * The recipient data is them filtered to exclude delegates
 *
 */
export async function processFiles() {
  try {
    const grantAgencyData = await fs.readFile('./temp/grant_agency.xml');
    const json = toJson(grantAgencyData);
    const grantAgency = JSON.parse(json);
    // we are only interested in non-delegates
    const grantRecipients = grantAgency.grant_agencies.grant_agency.filter(
      (g) => g.grant_agency_number === '0',
    );

    // process recipients aka agencies that are non-delegates
    const agencyData = await fs.readFile('./temp/agency.xml');
    const agency = JSON.parse(toJson(agencyData));

    // filter out delegates by matching to the non-delegates
    // eslint-disable-next-line max-len
    const recipientsNonDelegates = agency.agencies.agency.filter((a) => grantRecipients.some((gg) => gg.agency_id === a.agency_id));
    const recipientsForDb = recipientsNonDelegates.map((g) => ({
      id: parseInt(g.agency_id, 10),
      name: g.agency_name,
      recipientType: valueFromXML(g.agency_type),
    }));

    logger.debug(`updateGrantsRecipients: calling bulkCreate for ${recipientsForDb.length} recipients`);
    await Recipient.bulkCreate(recipientsForDb,
      {
        updateOnDuplicate: ['name', 'recipientType', 'updatedAt'],
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
        recipientId: parseInt(g.agency_id, 10),
        status: g.grant_status,
        stateCode: valueFromXML(g.grantee_state),
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
    const grantPrograms = grantRecipients.filter(
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

    logger.debug(`updateGrantsRecipients: calling bulkCreate for ${grantsForDb.length} grants`);
    await Grant.bulkCreate(nonCdiGrants,
      {
        updateOnDuplicate: ['number', 'regionId', 'recipientId', 'status', 'startDate', 'endDate', 'updatedAt', 'programSpecialistName', 'programSpecialistEmail', 'grantSpecialistName', 'grantSpecialistEmail'],
      });

    await Grant.bulkCreate(cdiGrants,
      {
        updateOnDuplicate: ['number', 'status', 'startDate', 'endDate', 'updatedAt', 'programSpecialistName', 'programSpecialistEmail', 'grantSpecialistName', 'grantSpecialistEmail'],
      });

    // Load and Process grant replacement data.
    const grantReplacementsData = await fs.readFile('./temp/grant_award_replacement.xml');
    const grantReplacementsJson = JSON.parse(toJson(grantReplacementsData));
    const grantReplacements = grantReplacementsJson
      .grant_award_replacements.grant_award_replacement;

    const grantsToUpdate = grantReplacements.filter(
      (g) => grantIds.includes(parseInt(g.replaced_grant_award_id, 10))
        && grantIds.includes(parseInt(g.replacement_grant_award_id, 10)),
    );

    const grantUpdatePromises = grantsToUpdate.map((g) => (
      Grant.update(
        { oldGrantId: parseInt(g.replaced_grant_award_id, 10) },
        {
          where: { id: parseInt(g.replacement_grant_award_id, 10) },
          fields: ['oldGrantId'],
          sideEffects: false,
        },
      )
    ));

    await Promise.all(grantUpdatePromises);

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
 * Downloads the HSES recipient/grant zip, extracts to the "temp" directory
 * and calls processFiles to parse xml data and populate the Smart Hub db
 *
 * Note - file download needs to happen in deployed environments
 */
export default async function updateGrantsRecipients(_processFiles = processFiles) {
  logger.info('updateGrantsRecipients: starting');
  logger.debug('updateGrantsRecipients: retrieving file from HSES');
  await axios(process.env.HSES_DATA_FILE_URL, {
    method: 'get',
    url: process.env.HSES_DATA_FILE_URL,
    responseType: 'stream',
    auth: {
      username: process.env.HSES_DATA_USERNAME,
      password: process.env.HSES_DATA_PASSWORD,
    },
  }).then(({ status, data }) => {
    logger.debug(`updateGrantsRecipients: Got file response: ${status}`);
    const writeStream = fs.createWriteStream('hses.zip');

    return new Promise((resolve, reject) => {
      let error = null;
      writeStream.on('error', (err) => {
        auditLogger.error(`updateGrantsRecipients: writeStream emitted error: ${err}`);
        error = err;
        reject(err);
      });
      writeStream.on('close', () => {
        logger.debug('updateGrantsRecipients: writeStream emitted close');
        if (!error) {
          resolve(true);
        }
      });
      data.pipe(writeStream);
    });
  });
  logger.debug('updateGrantsRecipients: wrote file from HSES');

  const zip = new AdmZip('./hses.zip');
  logger.debug('updateGrantsRecipients: extracting zip file');
  // extract to target path. Pass true to overwrite
  zip.extractAllTo('./temp', true);
  logger.debug('updateGrantsRecipients: unzipped files');

  await _processFiles();
  logger.info('updateGrantsRecipients: processFiles completed');
}
