import AdmZip from 'adm-zip';
import { toJson } from 'xml2json';
import axios from 'axios';
import { keyBy, mapValues } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import { Op } from 'sequelize';
import { fileHash } from './fileUtils';
import db, {
  Recipient,
  Grant,
  Program,
  sequelize,
  ProgramPersonnel,
} from '../models';
import { logger, auditLogger } from '../logger';
import { GRANT_PERSONNEL_ROLES } from '../constants';

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

function getPersonnelField(role, field, program) {
  // return if program is not an object.
  if (typeof program !== 'object') {
    return null;
  }
  return typeof program[`${role}_${field}`] === 'object' ? null : program[`${role}_${field}`];
}

async function getProgramPersonnel(grantId, programId, program) {
  const programPersonnelArray = [];
  for (let i = 0; i < GRANT_PERSONNEL_ROLES.length; i += 1) {
    const currentRole = GRANT_PERSONNEL_ROLES[i];
    // Determine if this personnel exists wth a different name.
    const firstName = getPersonnelField(currentRole, 'first_name', program);
    const lastName = getPersonnelField(currentRole, 'last_name', program);
    const email = getPersonnelField(currentRole, 'email', program);

    if (firstName && lastName) {
      // eslint-disable-next-line no-await-in-loop
      const existingPersonnel = await ProgramPersonnel.findOne({
        where: {
          grantId,
          programId,
          role: currentRole,
          firstName: { [Op.eq]: firstName },
          lastName: { [Op.eq]: lastName },
          active: true,
        },
      });

      // Create personnel object (if exists then update).
      const personnelToAdd = {
        programId,
        grantId,
        role: currentRole,
        prefix: getPersonnelField(currentRole, 'prefix', program),
        firstName,
        lastName,
        suffix: getPersonnelField(currentRole, 'suffix', program),
        title: getPersonnelField(currentRole, 'title', program),
        email: getPersonnelField(currentRole, 'email', program),
        effectiveDate: null,
        active: true,
        originalPersonnelId: null,
      };

      // If the personnel exists with a different email.
      const existsWithDifferentEmail = existingPersonnel && existingPersonnel.email !== email;

      // If the personnel doesn't exist or the email is different, then add it.
      if (!existingPersonnel || existsWithDifferentEmail) {
        // eslint-disable-next-line no-await-in-loop
        const existingRole = await ProgramPersonnel.findOne({
          where: {
            grantId, // For this Grant
            programId, // For this Program
            role: currentRole, // For this Role
            active: true, // Is this person still active?
            firstName: { [Op.ne]: firstName }, // Does this exist with a different person?
            lastName: { [Op.ne]: lastName }, // Does this exist with a different person?
          },
        });

        // If this user doesn't exist or exists with a different email.
        if (!existingRole && !existsWithDifferentEmail) {
          // Personnel does not exist, create a new one.
          programPersonnelArray.push({ ...personnelToAdd, active: true });
        } else {
          // Add the new Grant Personnel record.
          programPersonnelArray.push(
            {
              ...personnelToAdd,
              active: true, // Activate this person.
              effectiveDate: new Date(),
            },
          );

          // Deactivate the old Grant Personnel record.
          let oldRecordToUpdate = null;
          if (existsWithDifferentEmail) {
            oldRecordToUpdate = { ...existingPersonnel.dataValues };
          } else {
            oldRecordToUpdate = { ...existingRole.dataValues };
          }

          // Also update the old Grant Personnel record with the active flag set to false.
          programPersonnelArray.push({
            ...oldRecordToUpdate,
            active: false, // deactivate this person.
          });
        }
      } else {
        // Update the existing personnel.
        const updatedPersonnel = {
          ...personnelToAdd,
          id: existingPersonnel.id,
          active: true,
          effectiveDate: existingPersonnel.effectiveDate,
        };
        programPersonnelArray.push(updatedPersonnel);
      }
    }
  }
  return programPersonnelArray;
}

export const updateCDIGrantsWithOldGrantData = async (grantsToUpdate) => {
  try {
    const updatePromises = grantsToUpdate.map(async (grant) => {
      if (grant.oldGrantId) {
        const oldGrant = await Grant.findByPk(grant.oldGrantId);
        if (oldGrant) {
          return grant.update({
            recipientId: oldGrant.recipientId,
            regionId: oldGrant.regionId,
          });
        }
      }
      return null;
    });

    await Promise.all(updatePromises);
  } catch (error) {
    logger.error('updateGrantsRecipients: Error updating grants:', error);
  }
};

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
export async function processFiles(hashSumHex) {
  try {
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `SELECT
          set_config('audit.loggedUser', '0', true) as "loggedUser",
          set_config('audit.transactionId', '${uuidv4()}', true) as "transactionId",
          set_config('audit.sessionSig', '${new Date().toISOString()}T${hashSumHex}', true) as "sessionSig",
          set_config('audit.auditDescriptor', 'Grant data import from HSES', true) as "auditDescriptor",
          set_config('audit.impersonationUserId', '3', true) as "impersonationUserId";`,
        { transaction },
      );

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

      // filter out delegates by matching to the non-delegates;
      // filter out recipient 5 (TTAHUB-705)
      // eslint-disable-next-line max-len
      const recipientsNonDelegates = agency.agencies.agency.filter((a) => grantRecipients.some((gg) => gg.agency_id === a.agency_id && a.agency_id !== '5'));
      const recipientsForDbTmp = recipientsNonDelegates.map((g) => ({
        id: parseInt(g.agency_id, 10),
        uei: valueFromXML(g.uei),
        name: g.agency_name,
        recipientType: valueFromXML(g.agency_type),
      }));

      // process grants
      const grantData = await fs.readFile('./temp/grant_award.xml');
      const grant = JSON.parse(toJson(grantData));

      // temporary workaround for recipient 628 where it's name is coming in as DBA one.
      // This issue is pending with HSES as of 12/22/22.
      // HSES is investigating whether they can rename it on their end.
      // In the meantime, we need to rename in the Hub to eliminate confusion for the users.
      const recipientsForDb = recipientsForDbTmp.map((r) => {
        if (r.id === 628) {
          const grantAward = grant.grant_awards.grant_award.find((g) => g.agency_id === '628' && g.grantee_name !== r.name);
          return ({
            id: r.id,
            uei: r.uei,
            name: grantAward ? grantAward.grantee_name : r.name,
            recipientType: r.recipientType,
          });
        } return r;
      });

      logger.debug(`updateGrantsRecipients: calling bulkCreate for ${recipientsForDb.length} recipients`);
      await Recipient.unscoped().bulkCreate(
        recipientsForDb,
        {
          updateOnDuplicate: ['uei', 'name', 'recipientType', 'updatedAt'],
          transaction,
        },
      );

      const programData = await fs.readFile('./temp/grant_program.xml');
      const programs = JSON.parse(toJson(programData));

      const grantsForDb = grant.grant_awards.grant_award.map((g) => {
        let {
          grant_start_date: startDate, grant_end_date: endDate,
          inactivation_date: inactivationDate,
        } = g;
        if (typeof startDate === 'object') { startDate = null; }
        if (typeof endDate === 'object') { endDate = null; }
        if (typeof inactivationDate === 'object') { inactivationDate = null; }

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
        // grant belonging to recipient's id 5 is merged under recipient's id 7782  (TTAHUB-705)
        return {
          id: parseInt(g.grant_award_id, 10),
          number: g.grant_number,
          recipientId: g.agency_id === '5' ? 7782 : parseInt(g.agency_id, 10),
          status: g.grant_status,
          stateCode: valueFromXML(g.grantee_state),
          startDate,
          endDate,
          inactivationDate,
          regionId,
          cdi,
          granteeName: g.grantee_name,
          programSpecialistName,
          programSpecialistEmail: valueFromXML(g.program_specialist_email),
          grantSpecialistName,
          grantSpecialistEmail: valueFromXML(g.grants_specialist_email),
          annualFundingMonth: valueFromXML(g.annual_funding_month),
          inactivationReason: valueFromXML(g.inactivation_reason),
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

      const programsForDb = await Promise.all(programsWithGrants.map(async (program) => ({
        id: parseInt(program.grant_program_id, 10),
        grantId: parseInt(grantAgencyMap[program.grant_agency_id], 10),
        programType: valueFromXML(program.program_type),
        startYear: valueFromXML(program.program_start_year),
        startDate: valueFromXML(program.grant_program_start_date),
        endDate: valueFromXML(program.grant_program_end_date),
        status: valueFromXML(program.program_status),
        name: valueFromXML(program.program_name),
        // Get grant personnel.
        programPersonnel: await getProgramPersonnel(
          parseInt(grantAgencyMap[program.grant_agency_id], 10),
          parseInt(program.grant_program_id, 10),
          program,
        ),
      })));

      // Extract an array of all grant personnel to update.
      const programPersonnel = programsForDb.flatMap((p) => p.programPersonnel);

      // Split grants between CDI and non-CDI grants.
      const cdiGrants = grantsForDb.filter((g) => g.regionId === 13);
      const nonCdiGrants = grantsForDb.filter((g) => g.regionId !== 13);

      // Update non-CDI grants.
      logger.debug(`updateGrantsRecipients: calling bulkCreate for ${grantsForDb.length} grants`);
      await Grant.unscoped().bulkCreate(
        nonCdiGrants,
        {
          updateOnDuplicate: ['number', 'regionId', 'recipientId', 'status', 'startDate', 'endDate', 'updatedAt', 'programSpecialistName', 'programSpecialistEmail', 'grantSpecialistName', 'grantSpecialistEmail', 'stateCode', 'annualFundingMonth', 'inactivationDate', 'inactivationReason'],
          transaction,
        },
      );

      // Update CDI grants.
      await Grant.unscoped().bulkCreate(
        cdiGrants,
        {
          updateOnDuplicate: ['number', 'status', 'startDate', 'endDate', 'updatedAt', 'programSpecialistName', 'programSpecialistEmail', 'grantSpecialistName', 'grantSpecialistEmail', 'stateCode', 'annualFundingMonth', 'inactivationDate', 'inactivationReason'],
          transaction,
        },
      );

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
        Grant.unscoped().update(
          { oldGrantId: parseInt(g.replaced_grant_award_id, 10) },
          {
            where: { id: parseInt(g.replacement_grant_award_id, 10) },
            fields: ['oldGrantId'],
            sideEffects: false,
            transaction,
            individualHooks: true,
          },
        )
      ));

      await Promise.all(grantUpdatePromises);

      // Automate CDI linking to preceding recipients
      const cdiGrantsToLink = await Grant.unscoped().findAll({
        where: { regionId: 13, endDate: { [Op.gte]: '2021-03-17' } },
        attributes: ['id', 'endDate', 'oldGrantId'],
      });

      await updateCDIGrantsWithOldGrantData(cdiGrantsToLink);

      await Program.bulkCreate(
        programsForDb,
        {
          updateOnDuplicate: ['programType', 'startYear', 'startDate', 'endDate', 'status', 'name'],
          transaction,
        },
      );

      // Update grant personnel.
      await ProgramPersonnel.bulkCreate(
        programPersonnel,
        {
          updateOnDuplicate: ['suffix', 'prefix', 'title', 'active', 'effectiveDate', 'updatedAt', 'mapsTo'], // Only pass what fields we want to update.
          transaction,
          individualHooks: false, // We don't run these for afterBulkCreate.
        },
      );
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
  const hex = fileHash('./hses.zip');

  logger.debug('updateGrantsRecipients: extracting zip file');
  // extract to target path. Pass true to overwrite
  zip.extractAllTo('./temp', true);
  logger.debug('updateGrantsRecipients: unzipped files');

  await _processFiles(hex);
  logger.info('updateGrantsRecipients: processFiles completed');
}
