const { REPORT_STATUSES } = require('@ttahub/common')
const { validateSubmission, beforeUpdate } = require('./collabReport')

describe('collabReport hooks', () => {
  describe('validateSubmission', () => {
    let mockInstance

    beforeEach(() => {
      mockInstance = {
        changed: jest.fn(),
        previous: jest.fn(),
        submissionStatus: REPORT_STATUSES.DRAFT,
        name: 'Test Report',
        regionId: 1,
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        duration: 120,
        isStateActivity: true,
        conductMethod: ['virtual'],
        description: 'Test description',
      }
    })

    it('should not validate when submissionStatus is not changing', async () => {
      mockInstance.changed.mockReturnValue(['name'])
      mockInstance.submissionStatus = REPORT_STATUSES.DRAFT

      await expect(validateSubmission(mockInstance)).resolves.not.toThrow()
    })

    it('should not validate when submissionStatus is not being submitted', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockReturnValue(REPORT_STATUSES.DRAFT)
      mockInstance.submissionStatus = REPORT_STATUSES.APPROVED

      await expect(validateSubmission(mockInstance)).resolves.not.toThrow()
    })

    it('should not validate when already submitted', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockReturnValue(REPORT_STATUSES.SUBMITTED)
      mockInstance.submissionStatus = REPORT_STATUSES.APPROVED

      await expect(validateSubmission(mockInstance)).resolves.not.toThrow()
    })

    it('should validate successfully when all required fields are present', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockReturnValue(REPORT_STATUSES.DRAFT)
      mockInstance.submissionStatus = REPORT_STATUSES.SUBMITTED

      await expect(validateSubmission(mockInstance)).resolves.not.toThrow()
    })

    it('should throw error when name is missing', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockImplementation((field) => {
        if (field === 'submissionStatus') return REPORT_STATUSES.DRAFT
        return undefined
      })
      mockInstance.submissionStatus = REPORT_STATUSES.SUBMITTED
      mockInstance.name = null

      await expect(validateSubmission(mockInstance)).rejects.toThrow('Required field not provided: name')
    })

    it('should throw error when startDate is missing', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockImplementation((field) => {
        if (field === 'submissionStatus') return REPORT_STATUSES.DRAFT
        return undefined
      })
      mockInstance.submissionStatus = REPORT_STATUSES.SUBMITTED
      mockInstance.startDate = null

      await expect(validateSubmission(mockInstance)).rejects.toThrow('Required field not provided: startDate')
    })

    it('should throw error when endDate is missing', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockImplementation((field) => {
        if (field === 'submissionStatus') return REPORT_STATUSES.DRAFT
        return undefined
      })
      mockInstance.submissionStatus = REPORT_STATUSES.SUBMITTED
      mockInstance.endDate = null

      await expect(validateSubmission(mockInstance)).rejects.toThrow('Required field not provided: endDate')
    })

    it('should throw error when duration is missing', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockImplementation((field) => {
        if (field === 'submissionStatus') return REPORT_STATUSES.DRAFT
        return undefined
      })
      mockInstance.submissionStatus = REPORT_STATUSES.SUBMITTED
      mockInstance.duration = null

      await expect(validateSubmission(mockInstance)).rejects.toThrow('Required field not provided: duration')
    })

    it('should throw error when isStateActivity is missing', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockImplementation((field) => {
        if (field === 'submissionStatus') return REPORT_STATUSES.DRAFT
        return undefined
      })
      mockInstance.submissionStatus = REPORT_STATUSES.SUBMITTED
      mockInstance.isStateActivity = null

      await expect(validateSubmission(mockInstance)).rejects.toThrow('Required field not provided: isStateActivity')
    })

    it('should throw error when conductMethod is missing', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockImplementation((field) => {
        if (field === 'submissionStatus') return REPORT_STATUSES.DRAFT
        return undefined
      })
      mockInstance.submissionStatus = REPORT_STATUSES.SUBMITTED
      mockInstance.conductMethod = null

      await expect(validateSubmission(mockInstance)).rejects.toThrow('Required field not provided: conductMethod')
    })

    it('should throw error when description is missing', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockImplementation((field) => {
        if (field === 'submissionStatus') return REPORT_STATUSES.DRAFT
        return undefined
      })
      mockInstance.submissionStatus = REPORT_STATUSES.SUBMITTED
      mockInstance.description = null

      await expect(validateSubmission(mockInstance)).rejects.toThrow('Required field not provided: description')
    })

    it('should handle empty string values as missing', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockImplementation((field) => {
        if (field === 'submissionStatus') return REPORT_STATUSES.DRAFT
        return undefined
      })
      mockInstance.submissionStatus = REPORT_STATUSES.SUBMITTED
      mockInstance.name = ''

      await expect(validateSubmission(mockInstance)).rejects.toThrow('Required field not provided: name')
    })

    it('should handle undefined values as missing', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockImplementation((field) => {
        if (field === 'submissionStatus') return REPORT_STATUSES.DRAFT
        return undefined
      })
      mockInstance.submissionStatus = REPORT_STATUSES.SUBMITTED
      mockInstance.description = undefined

      await expect(validateSubmission(mockInstance)).rejects.toThrow('Required field not provided: description')
    })

    it('should handle false boolean values correctly for isStateActivity', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockImplementation((field) => {
        if (field === 'submissionStatus') return REPORT_STATUSES.DRAFT
        return undefined
      })
      mockInstance.submissionStatus = REPORT_STATUSES.SUBMITTED
      mockInstance.isStateActivity = false

      await expect(validateSubmission(mockInstance)).resolves.not.toThrow()
    })

    it('should handle zero values correctly for duration', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockImplementation((field) => {
        if (field === 'submissionStatus') return REPORT_STATUSES.DRAFT
        return undefined
      })
      mockInstance.submissionStatus = REPORT_STATUSES.SUBMITTED
      mockInstance.duration = 0

      await expect(validateSubmission(mockInstance)).rejects.toThrow('Required field not provided: duration')
    })

    it('should validate with changed array being null', async () => {
      mockInstance.changed.mockReturnValue(null)

      await expect(validateSubmission(mockInstance)).resolves.not.toThrow()
    })

    it('should throw error for first missing field when multiple fields are missing', async () => {
      mockInstance.changed.mockReturnValue(['submissionStatus'])
      mockInstance.previous.mockImplementation((field) => {
        if (field === 'submissionStatus') return REPORT_STATUSES.DRAFT
        return undefined
      })
      mockInstance.submissionStatus = REPORT_STATUSES.SUBMITTED
      mockInstance.name = null
      mockInstance.startDate = null

      await expect(validateSubmission(mockInstance)).rejects.toThrow('Required field not provided: name')
    })
  })

  describe('beforeUpdate', () => {
    it('should call validateSubmission with the instance', async () => {
      const mockInstance = {
        changed: jest.fn().mockReturnValue(['name']),
        previous: jest.fn(),
        submissionStatus: REPORT_STATUSES.DRAFT,
        name: 'Test Report',
      }
      const mockSequelize = {}

      await expect(beforeUpdate(mockSequelize, mockInstance)).resolves.not.toThrow()
      expect(mockInstance.changed).toHaveBeenCalled()
    })

    it('should propagate validation errors', async () => {
      const mockInstance = {
        changed: jest.fn().mockReturnValue(['submissionStatus']),
        previous: jest.fn().mockImplementation((field) => {
          if (field === 'submissionStatus') return REPORT_STATUSES.DRAFT
          return undefined
        }),
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        name: null,
      }
      const mockSequelize = {}

      await expect(beforeUpdate(mockSequelize, mockInstance)).rejects.toThrow('Required field not provided: name')
    })

    it('should handle successful validation', async () => {
      const mockInstance = {
        changed: jest.fn().mockReturnValue(['submissionStatus']),
        previous: jest.fn().mockReturnValue(REPORT_STATUSES.DRAFT),
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        name: 'Test Report',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        duration: 120,
        isStateActivity: true,
        conductMethod: ['virtual'],
        description: 'Test description',
      }
      const mockSequelize = {}

      await expect(beforeUpdate(mockSequelize, mockInstance)).resolves.not.toThrow()
    })
  })
})
