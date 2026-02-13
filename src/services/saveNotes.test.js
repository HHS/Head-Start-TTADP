import { saveNotes } from './activityReports'
import parseDate from '../lib/date'
import { NextStep } from '../models'

jest.mock('../models', () => ({
  NextStep: {
    destroy: jest.fn(),
    bulkCreate: jest.fn(),
  },
}))

describe('saveNotes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const activityReportId = 12345

  it('saves valid notes with correct date', async () => {
    const notes = [
      {
        note: 'Valid note',
        completeDate: '05/13/2025',
      },
    ]

    await saveNotes(activityReportId, notes, false)

    expect(NextStep.destroy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          activityReportId,
          noteType: 'SPECIALIST',
        }),
        individualHooks: true,
      })
    )

    expect(NextStep.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          note: 'Valid note',
          completeDate: parseDate('05/13/2025'),
          activityReportId,
          noteType: 'SPECIALIST',
        }),
      ],
      expect.objectContaining({
        updateOnDuplicate: ['note', 'completeDate', 'updatedAt'],
      })
    )
  })

  it('handles invalid completeDate gracefully', async () => {
    const notes = [
      {
        note: 'No date here',
        completeDate: 'not-a-date',
      },
    ]

    await saveNotes(activityReportId, notes, false)

    expect(NextStep.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          note: 'No date here',
          completeDate: null,
        }),
      ],
      expect.anything()
    )
  })

  it('filters out notes with no id, no note, and no date', async () => {
    const notes = [{ note: '', completeDate: '' }]

    await saveNotes(activityReportId, notes, false)

    expect(NextStep.bulkCreate).not.toHaveBeenCalled()
  })

  it('uses RECIPIENT type when isRecipientNotes is true', async () => {
    const notes = [{ note: 'Recipient note', completeDate: '5.13.2025' }]

    await saveNotes(activityReportId, notes, true)

    expect(NextStep.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          noteType: 'RECIPIENT',
        }),
      ],
      expect.anything()
    )
  })

  it('preserves note id if present', async () => {
    const notes = [{ id: '42', note: 'Updated note', completeDate: '5/13/2025' }]

    await saveNotes(activityReportId, notes, false)

    expect(NextStep.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: 42,
        }),
      ],
      expect.anything()
    )
  })
})
