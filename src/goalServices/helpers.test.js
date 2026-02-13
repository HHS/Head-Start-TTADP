import { findOrFailExistingGoal } from './helpers'

describe('findOrFailExistingGoal', () => {
  const needle = {
    status: 'Draft',
    name: 'Test Goal',
    source: 'Test Source',
    dataValues: { isFei: true },
    responses: [{ response: 'Response 1' }, { response: 'Response 2' }],
    collaborators: [],
  }

  const haystack = [
    {
      goalStatus: 'Draft',
      goalText: 'Test Goal',
      source: 'Test Source',
      isFei: true,
      collaborators: [{ goalCreatorName: undefined }],
      responsesForComparison: 'Response 1,Response 2',
    },
    {
      goalStatus: 'Draft',
      goalText: 'Test Goal',
      source: 'Test Source',
      isFei: true,
      collaborators: [{ goalCreatorName: 'John Doe' }],
      responsesForComparison: 'Response 1,Response 2',
    },
  ]

  it('should return a goal with undefined collaborator names', () => {
    const result = findOrFailExistingGoal(needle, haystack)
    expect(result).toEqual(haystack[0])
  })

  it('should return a goal with a collaborator that matches the needle collaborator', () => {
    const customNeedle = {
      ...needle,
      collaborators: [{ goalCreatorName: 'John Doe' }],
    }
    const result = findOrFailExistingGoal(customNeedle, haystack)
    expect(result).toEqual(haystack[1])
  })
})
