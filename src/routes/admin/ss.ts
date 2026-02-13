/* eslint-disable import/prefer-default-export */
import express from 'express'
import { createClient } from 'smartsheet'
import transactionWrapper from '../transactionWrapper'
import handleErrors from '../../lib/apiErrorHandler'
import { auditLogger as logger } from '../../logger'

const namespace = 'ADMIN:SMARTSHEET'
const logContext = { namespace }

const router = express.Router()

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

// Function to create and return the Smartsheet client
function createSmartsheetClient() {
  return createClient({
    accessToken: process.env.SMARTSHEET_ACCESS_TOKEN,
    baseUrl: process.env.SMARTSHEET_ENDPOINT,
    logLevel: 'info',
  })
}

const smartsheetClient = createSmartsheetClient()
interface SheetData {
  id: number
  name: string
  accessLevel: string
  permalink: string
  createdAt: string
  modifiedAt: string
}
export async function listSheets(req, res) {
  const pageSize = req.query.pageSize || 4400
  const page = req.query.page || 1
  const options = {
    queryParameters: {
      pageSize,
      page,
    },
  }

  try {
    const result = await smartsheetClient.sheets.listSheets(options)

    if (!result) {
      throw new Error('Failed to list sheets')
    }
    const allSheets = result.data
    result.data = allSheets.filter((sheet: SheetData) => sheet.name.startsWith('PD23-24 b. Region'))

    return res.status(200).json(result)
  } catch (error) {
    logger.error('something went wrong')
    return handleErrors(req, res, error, logContext)
  }
}

export async function getSheet(req, res) {
  const { sheetId } = req.params
  const lastFourDigits = sheetId && sheetId.length > 0 ? sheetId.slice(-8) : null

  try {
    const result = await smartsheetClient.sheets.getSheet({ id: sheetId })
    if (!result) {
      throw new Error(`Failed to get sheet: ${lastFourDigits}`)
    }

    return res.status(200).json(result)
  } catch (error) {
    logger.error(`Failed to get sheet: ${lastFourDigits}`, error)
    return handleErrors(req, res, error, logContext)
  }
}

export function route(envi: string) {
  if ((envi && envi.endsWith('app.cloud.gov')) || process.env.SMARTSHEET_LOCAL) {
    router.get('/', transactionWrapper(listSheets))
    router.get('/sheet/:sheetId', transactionWrapper(getSheet))
  } else {
    router.get('/', (req, res) => res.status(403).send('Feature not available'))
    router.get('/sheet/:sheetId', (req, res) => res.status(403).send('Feature not available'))
  }
}

route(process.env.TTA_SMART_HUB_URI)

export default router
