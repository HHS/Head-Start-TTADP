import httpCodes from 'http-codes'
import multiparty from 'multiparty'
import { importTrainingReport } from './trainingReport'
import { handleError } from '../../lib/apiErrorHandler'
import { csvImport } from '../../services/event'
import { bufferFromPath } from './helpers'

jest.mock('multiparty', () => ({
  Form: jest.fn(() => ({
    parse: jest.fn(),
  })),
}))

jest.mock('../../lib/apiErrorHandler', () => ({
  handleError: jest.fn(),
}))

jest.mock('../../services/event', () => ({
  csvImport: jest.fn(),
}))

jest.mock('./helpers', () => ({
  bufferFromPath: jest.fn(),
}))

describe('importTrainingReport', () => {
  let req
  let res

  beforeEach(() => {
    req = {}
    res = {
      status: jest.fn(() => ({
        json: jest.fn(),
      })),
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should handle error when form parsing fails', async () => {
    const err = new Error('Form parsing failed')
    const logContext = { namespace: 'ADMIN:TRAINING_REPORT' }

    multiparty.Form.mockImplementationOnce(() => ({
      parse: jest.fn((_request, callback) => {
        callback(err)
      }),
    }))

    await importTrainingReport(req, res)

    expect(handleError).toHaveBeenCalledWith(req, res, err, logContext)
  })

  it('should return error response when file type is invalid', async () => {
    const headers = { 'content-type': 'application/json' }
    const files = {
      file: [
        {
          headers,
          path: '/path/to/file.csv',
        },
      ],
    }

    multiparty.Form.mockImplementationOnce(() => ({
      parse: jest.fn((_request, callback) => {
        callback(null, {}, files)
      }),
    }))

    await importTrainingReport(req, res)

    expect(res.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST)
  })

  it('should import training report successfully', async () => {
    const headers = { 'content-type': 'text/csv' }
    const files = {
      file: [
        {
          headers,
          path: '/path/to/file.csv',
        },
      ],
    }
    const buf = Buffer.from('csv data')
    const response = { success: true }

    multiparty.Form.mockImplementationOnce(() => ({
      parse: jest.fn((_request, callback) => {
        callback(null, {}, files)
      }),
    }))

    bufferFromPath.mockReturnValueOnce(buf)
    csvImport.mockResolvedValueOnce(response)

    await importTrainingReport(req, res)

    expect(bufferFromPath).toHaveBeenCalledWith('/path/to/file.csv')
    expect(csvImport).toHaveBeenCalledWith(buf)
  })
})
