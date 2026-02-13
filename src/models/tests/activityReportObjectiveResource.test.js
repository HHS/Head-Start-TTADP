import { ActivityReportObjectiveResource, Resource } from '../index'
import { SOURCE_FIELD } from '../../constants'

describe('ActivityReportObjectiveResource model', () => {
  describe('isAutoDetected getter', () => {
    it('returns false when sourceFields does not contain auto-detected fields', () => {
      const instance = ActivityReportObjectiveResource.build({
        sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.USER_PROVIDED],
      })
      expect(instance.isAutoDetected).toBe(false)
    })
  })

  describe('userProvidedUrl getter', () => {
    it('returns an empty string if resource is not present', () => {
      const instance = ActivityReportObjectiveResource.build({})
      expect(instance.userProvidedUrl).toBe('')
    })

    it('returns the resource URL if resource is present', () => {
      const resource = Resource.build({ url: 'http://example.com' })
      const instance = ActivityReportObjectiveResource.build({})
      instance.resource = resource
      expect(instance.userProvidedUrl).toBe('http://example.com')
    })
  })
})
