import { withTtaType, withoutTtaType } from './ttaType'
import { filterAssociation } from '../utils'

jest.mock('../utils', () => ({
  filterAssociation: jest.fn(),
}))

describe('ttaType scopes', () => {
  afterEach(() => {
    filterAssociation.mockClear()
  })

  describe('withTtaType', () => {
    it('returns an empty object for an empty query', () => {
      const query = []
      const result = withTtaType(query)
      expect(result).toEqual({})
      expect(filterAssociation).not.toHaveBeenCalled()
    })

    it('returns an empty object for invalid tta types', () => {
      const query = ['invalid-type', 'another-bad-one']
      const result = withTtaType(query)
      expect(result).toEqual({})
      expect(filterAssociation).not.toHaveBeenCalled()
    })

    it('calls filterAssociation with correct args for a single valid type', () => {
      const query = ['training']
      withTtaType(query)
      expect(filterAssociation).toHaveBeenCalledWith(
        expect.any(String), // baseSql
        ['training'],
        false,
        expect.any(Function),
        'ILIKE',
        true
      )
    })

    it('calls filterAssociation with correct args for multiple valid types', () => {
      const query = ['training', 'technical-assistance']
      withTtaType(query)
      expect(filterAssociation).toHaveBeenCalledWith(
        expect.any(String), // baseSql
        ['training,technical-assistance'],
        false,
        expect.any(Function),
        'ILIKE',
        true
      )
    })

    it('calls filterAssociation with correct args for combined valid types', () => {
      const query = ['training,technical-assistance']
      withTtaType(query)
      expect(filterAssociation).toHaveBeenCalledWith(
        expect.any(String), // baseSql
        ['training,technical-assistance'],
        false,
        expect.any(Function),
        'ILIKE',
        true
      )
    })

    it('filters out invalid types and calls filterAssociation with valid ones', () => {
      const query = ['training', 'invalid', 'technical-assistance']
      withTtaType(query)
      expect(filterAssociation).toHaveBeenCalledWith(
        expect.any(String), // baseSql
        ['training,technical-assistance'],
        false,
        expect.any(Function),
        'ILIKE',
        true
      )
    })

    it('handles duplicate valid types', () => {
      const query = ['training', 'training', 'technical-assistance']
      withTtaType(query)
      expect(filterAssociation).toHaveBeenCalledWith(
        expect.any(String), // baseSql
        ['training,technical-assistance'],
        false,
        expect.any(Function),
        'ILIKE',
        true
      )
    })
  })

  describe('withoutTtaType', () => {
    it('returns an empty object for an empty query', () => {
      const query = []
      const result = withoutTtaType(query)
      expect(result).toEqual({})
      expect(filterAssociation).not.toHaveBeenCalled()
    })

    it('returns an empty object for invalid tta types', () => {
      const query = ['invalid-type', 'another-bad-one']
      const result = withoutTtaType(query)
      expect(result).toEqual({})
      expect(filterAssociation).not.toHaveBeenCalled()
    })

    it('calls filterAssociation with correct args for a single valid type', () => {
      const query = ['training']
      withoutTtaType(query)
      expect(filterAssociation).toHaveBeenCalledWith(
        expect.any(String), // baseSql
        ['training'],
        false,
        expect.any(Function),
        'NOT ILIKE',
        true
      )
    })

    it('calls filterAssociation with correct args for multiple valid types', () => {
      const query = ['training', 'technical-assistance']
      withoutTtaType(query)
      expect(filterAssociation).toHaveBeenCalledWith(
        expect.any(String), // baseSql
        ['training,technical-assistance'],
        false,
        expect.any(Function),
        'NOT ILIKE',
        true
      )
    })

    it('calls filterAssociation with correct args for combined valid types', () => {
      const query = ['training,technical-assistance']
      withoutTtaType(query)
      expect(filterAssociation).toHaveBeenCalledWith(
        expect.any(String), // baseSql
        ['training,technical-assistance'],
        false,
        expect.any(Function),
        'NOT ILIKE',
        true
      )
    })

    it('filters out invalid types and calls filterAssociation with valid ones', () => {
      const query = ['training', 'invalid', 'technical-assistance']
      withoutTtaType(query)
      expect(filterAssociation).toHaveBeenCalledWith(
        expect.any(String), // baseSql
        ['training,technical-assistance'],
        false,
        expect.any(Function),
        'NOT ILIKE',
        true
      )
    })

    it('handles duplicate valid types', () => {
      const query = ['training', 'training', 'technical-assistance']
      withoutTtaType(query)
      expect(filterAssociation).toHaveBeenCalledWith(
        expect.any(String), // baseSql
        ['training,technical-assistance'],
        false,
        expect.any(Function),
        'NOT ILIKE',
        true
      )
    })
  })
})
