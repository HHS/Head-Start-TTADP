import join from 'url-join'
import fetchMock from 'fetch-mock'
import { DECIMAL_BASE } from '@ttahub/common'
import {
  getReports,
  createReport,
  deleteReport,
  getReport,
  getCSV,
  getReportsCSVById,
  getReportsCSV,
  getAlerts,
  reviewReport,
  saveReport,
  submitReport,
} from '../collaborationReports'

// Mock the utils module
jest.mock('../../utils', () => ({
  blobToCsvDownload: jest.fn(),
}))

describe('CollaboratorReports Fetcher', () => {
  afterEach(() => fetchMock.restore())

  describe('getReports', () => {
    it('fetches collaboration reports', async () => {
      const mockResponse = { rows: [{ id: 1, name: 'Report 1' }] }
      fetchMock.get(join('/api/collaboration-reports'), mockResponse)

      const reports = await getReports({})

      expect(fetchMock.called()).toBeTruthy()
      expect(reports).toEqual(mockResponse)
    })
  })

  describe('createReport', () => {
    it('creates a new collaboration report', async () => {
      const mockData = { name: 'New Report', regionId: 1 }
      const mockResponse = { id: 1, ...mockData }
      fetchMock.post('/api/collaboration-reports', mockResponse)

      const result = await createReport(mockData)

      expect(fetchMock.called()).toBeTruthy()
      expect(result).toEqual(mockResponse)
    })
  })

  describe('deleteReport', () => {
    it('deletes a collaboration report', async () => {
      const reportId = 123
      fetchMock.delete(join('/api/collaboration-reports', reportId.toString(DECIMAL_BASE)), 204)

      await deleteReport(reportId)

      expect(fetchMock.called()).toBeTruthy()
    })
  })

  describe('getReport', () => {
    it('fetches a single collaboration report', async () => {
      const reportId = 123
      const mockResponse = { id: reportId, name: 'Test Report' }
      fetchMock.get(join('/api/collaboration-reports', reportId.toString(DECIMAL_BASE)), mockResponse)

      const result = await getReport(reportId)

      expect(fetchMock.called()).toBeTruthy()
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getCSV', () => {
    it('downloads CSV data', async () => {
      const mockCsvData = 'id,name\n1,Report 1'
      const testUrl = '/api/collaboration-reports/csv'
      fetchMock.get(testUrl, mockCsvData)

      await getCSV(testUrl)

      expect(fetchMock.called()).toBeTruthy()
    })
  })

  describe('getReportsCSVById', () => {
    it('downloads CSV for specific report IDs', async () => {
      const ids = [1, 2, 3]
      const sortConfig = { sortBy: 'name', direction: 'asc' }
      const mockCsvData = 'id,name\n1,Report 1\n2,Report 2'

      fetchMock.get('begin:/api/collaboration-reports/csv', mockCsvData)

      await getReportsCSVById(ids, sortConfig)

      expect(fetchMock.called()).toBeTruthy()
    })
  })

  describe('getReportsCSV', () => {
    it('downloads CSV for all reports', async () => {
      const sortConfig = { sortBy: 'name', direction: 'asc' }
      const mockCsvData = 'id,name\n1,Report 1'

      fetchMock.get('begin:/api/collaboration-reports/csv', mockCsvData)

      await getReportsCSV(sortConfig)

      expect(fetchMock.called()).toBeTruthy()
    })
  })

  describe('getAlerts', () => {
    it('fetches collaboration report alerts', async () => {
      const mockResponse = { rows: [{ id: 1, alertType: 'deadline' }] }
      const sortConfig = { sortBy: 'date', direction: 'desc' }

      fetchMock.get('begin:/api/collaboration-reports/alerts', mockResponse)

      const result = await getAlerts(sortConfig)

      expect(fetchMock.called()).toBeTruthy()
      expect(result).toEqual(mockResponse)
    })
  })

  describe('reviewReport', () => {
    it('reviews a collaboration report', async () => {
      const reportId = 123
      const reviewData = { status: 'approved', comments: 'Looks good' }
      const mockResponse = { id: reportId, ...reviewData }

      fetchMock.put(join('/api/collaboration-reports', reportId.toString(DECIMAL_BASE), 'review'), mockResponse)

      const result = await reviewReport(reportId, reviewData)

      expect(fetchMock.called()).toBeTruthy()
      expect(result).toEqual(mockResponse)
    })
  })

  describe('saveReport', () => {
    it('saves a collaboration report', async () => {
      const reportId = 123
      const saveData = { name: 'Updated Report', description: 'Updated description' }
      const mockResponse = { id: reportId, ...saveData }

      fetchMock.put(join('/api/collaboration-reports', reportId.toString(DECIMAL_BASE)), mockResponse)

      const result = await saveReport(reportId, saveData)

      expect(fetchMock.called()).toBeTruthy()
      expect(result).toEqual(mockResponse)
    })
  })

  describe('submitReport', () => {
    it('submits a collaboration report', async () => {
      const reportId = 123
      const submitData = { submissionStatus: 'submitted' }
      const mockResponse = { id: reportId, ...submitData }

      fetchMock.put(join('/api/collaboration-reports', reportId.toString(DECIMAL_BASE), 'submit'), mockResponse)

      const result = await submitReport(reportId, submitData)

      expect(fetchMock.called()).toBeTruthy()
      expect(result).toEqual(mockResponse)
    })
  })
})
