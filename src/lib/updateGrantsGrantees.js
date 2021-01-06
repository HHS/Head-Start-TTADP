import AdmZip from 'adm-zip';
import { toJson } from 'xml2json';
import {} from 'dotenv/config';
import axios from 'axios';
import {
  Grantee, Grant,
} from '../models';
import logger from '../logger';

const fs = require('mz/fs');
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
async function processFiles() {
  let grantGrantees;
  let grants;
  const granteesForDb = [];
  const grantsForDb = [];

  try {
    const grantAgencyData = await fs.readFile('./temp/grant_agency.xml');
    const json = toJson(grantAgencyData);
    const grantAgency = JSON.parse(json);
    // we are only interested in non-delegates
    grantGrantees = grantAgency.grant_agencies.grant_agency.filter(
      (g) => g.grant_agency_number === '0',
    );

    // process grantees aka agencies that are non-delegates
    const agencyData = await fs.readFile('./temp/agency.xml');
    const agency = JSON.parse(toJson(agencyData));

    // filter out delegates by matching to the non-delegates
    // eslint-disable-next-line max-len
    const grantees = agency.agencies.agency.filter((a) => grantGrantees.some((gg) => gg.agency_id === a.agency_id));

    grantees.forEach((g) => granteesForDb.push({
      id: parseInt(g.agency_id, 10),
      name: g.agency_name,
    }));

    await Grantee.bulkCreate(granteesForDb,
      {
        updateOnDuplicate: ['name', 'updatedAt'],
      });
    // process grants
    const grantData = await fs.readFile('./temp/grant_award.xml');
    const grant = JSON.parse(toJson(grantData));

    const hubGrantIds = await Grant.findAll({ attributes: ['id'] }).map((hgi) => hgi.id);

    grants = grant.grant_awards.grant_award.filter((ga) => hubGrantIds.some((id) => id === ga.grant_id) || ga.grant_status === 'Active');

    grants.forEach((g) => grantsForDb.push({
      id: parseInt(g.grant_award_id, 10),
      number: g.grant_number,
      regionId: parseInt(g.region_id, 10),
      granteeId: parseInt(g.agency_id, 10),
      status: g.grant_status,
      startDate: g.grant_start_date,
      endDate: g.grant_end_date,
    }));

    await Grant.bulkCreate(grantsForDb,
      {
        updateOnDuplicate: ['number', 'regionId', 'granteeId', 'status', 'startDate', 'endDate', 'updatedAt'],
      });
  } catch (error) {
    logger.error(`Error reading or updating database on HSES data import: ${error.message}`);
    throw error;
  }
}

// reading archives
const zip = new AdmZip('./hses.zip');

/**
 * Downloads the HSES grantee/grant zip, extracts to the "temp" directory
 * and calls processFiles to parse xml data and populate the Smart Hub db
 *
 * Note - file download needs to happen in deployed environments
 */
export default async function updateGrantsGrantees() {
  try {
    if (process.env.NODE_ENV === 'production') {
      const response = await axios(process.env.HSES_DATA_FILE_URL, {
        method: 'get',
        url: process.env.HSES_DATA_FILE_URL,
        responseType: 'stream',
        auth: {
          username: process.env.HSES_DATA_USERNAME,
          password: process.env.HSES_DATA_PASSWORD,
        },
      });

      await response.data.pipe(fs.createWriteStream('hses.zip'));
    }
    // extract to target path. Pass true to overwrite
    zip.extractAllTo('./temp', true);

    await processFiles();
  } catch (error) {
    logger.error(error);
  }
}
