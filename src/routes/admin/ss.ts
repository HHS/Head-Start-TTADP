/* eslint-disable import/prefer-default-export */
import express, { Response, Request } from 'express';
import transactionWrapper from '../transactionWrapper';
import handleErrors from '../../lib/apiErrorHandler';
import { auditLogger as logger } from '../../logger';
import smartsheet from 'smartsheet';

// import express from "express";

// const express = require('express');
// const { Response, Request }= require('express');
// const transactionWrapper = require('../transactionWrapper');
// const handleErrors = require('../../lib/apiErrorHandler');
// const { auditLogger: logger } = require('../../logger');
// const smartsheet = require('smartsheet');

const namespace = 'ADMIN:SMARTSHEET';
const logContext = { namespace };

const router = express.Router();

// PD23-24 b. Region 01 PD Plan WITH NCs
// PD23-24 b. Region 02 PD Plan WITH NCs
// PD23-24 b. Region 03 PD Plan WITH NCs
// PD23-24 b. Region 04 PD Plan WITH NCs
// PD23-24 b. Region 05 PD Plan WITH NCs
// PD23-24 b. Region 06 PD Plan WITH NCs
// PD23-24 b. Region 07 PD Plan WITH NCs
// PD23-24 b. Region 08 PD Plan WITH NCs
// PD23-24 b. Region 09 PD Plan WITH NCs
// PD23-24 b. Region 10 PD Plan WITH NCs
// PD23-24 b. Region 11 PD Plan WITH NCs
// PD23-24 b. Region 12 PD Plan WITH NCs

// Initialize the client with an API access token
// const smartsheetClient = smartsheet.createClient({
//   accessToken: process.env.SMARTSHEET_ACCESS_TOKEN,
//   baseUrl: process.env.SMARTSHEET_ENDPOINT,
//   logLevel: 'info'
// });

// Function to create and return the Smartsheet client
function createSmartsheetClient() {
  return smartsheet.createClient({
    accessToken: process.env.SMARTSHEET_ACCESS_TOKEN,
    baseUrl: process.env.SMARTSHEET_ENDPOINT,
    logLevel: 'info'
  });
}

const smartsheetClient = createSmartsheetClient();

interface SheetData {
  id: number;
  name: string;
  accessLevel: string;
  permalink: string;
  createdAt: string;
  modifiedAt: string;
}

export async function listSheets(req: { query: { pageSize: number; page: number; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: any): any; new(): any; }; }; }) {
  const pageSize = req.query.pageSize || 4400;
  const page = req.query.page || 1;
  const options = {
    queryParameters: {
      pageSize,
      page
    }
  };
  console.log(options);

  try {
    const result = await smartsheetClient.sheets.listSheets(options);
    console.log(result);
    if (!result) {
      throw new Error('Failed to list sheets');
    }
    const allSheets = result.data;
    result.data = allSheets.filter((sheet: SheetData) => {
      return sheet.name.startsWith('PD23-24 b. Region');
    });

    return res.status(200).json(result);
  } catch (error) {
    logger.error('something went wrong');
    return handleErrors(req, res, error, logContext);
  }
}

export async function getSheet(req: { params: { sheetId: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: any): any; new(): any; }; }; }) {
  const { sheetId } = req.params;
  const lastFourDigits = (sheetId && sheetId.length > 0) ? sheetId.slice(-8) : null;

  try {
    const result = await smartsheetClient.sheets.getSheet({ id: sheetId });
    if (!result) {
      throw new Error(`Failed to get sheet: ${lastFourDigits}`);
    }

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Failed to get sheet: ${lastFourDigits}`, error);
    return handleErrors(req, res, error, logContext);
  }
}

export function route(envi: string) {
  console.log(envi);  // Logging to check the environment variable
  if (envi && envi.endsWith('app.cloud.gov')) {
    router.get('/', transactionWrapper(listSheets));
    router.get('/sheet/:sheetId', transactionWrapper(getSheet));
  } else {
    router.get('/', (req, res) => res.status(403).send('Feature not available'));
    router.get('/sheet/:sheetId', (req, res) => res.status(403).send('Feature not available'));
  }
}

route(process.env.TTA_SMART_HUB_URI);
