import {
  validateListOfResources,
  FORM_FIELD_DEFAULT_ERRORS,
  FORM_FIELD_INDEXES,
  objectivesWithValidResourcesOnly,
  noDisallowedUrls,
} from '../constants'

describe('form constants', () => {
  it('the amount of form fields and the amount of default errors should match', () => {
    expect(Object.keys(FORM_FIELD_INDEXES).length).toBe(FORM_FIELD_DEFAULT_ERRORS.length)
  })

  describe('noDisallowedUrls', () => {
    const goodUrls = [{ value: 'https://www.google.com' }]

    const badUrls = [
      'https://eclkc.ohs.acf.hhs.gov/professional-development/individualized-professional-development-ipd-portfolio/course-catalog',
      'https://eclkc.ohs.acf.hhs.gov/professional-development/individualized-professional-development-ipd-portfolio/individualized-professional-development-ipd-portfolio',
      'https://eclkc.ohs.acf.hhs.gov/cas/login',
      'https://headstart.gov/professional-development/individualized-professional-development-ipd-portfolio/course-catalog',
      'https://headstart.gov/professional-development/individualized-professional-development-ipd-portfolio/individualized-professional-development-ipd-portfolio',
      'https://headstart.gov/cas/login',
    ]

    it('returns true if the url is not in the disallowed list', () => {
      expect(noDisallowedUrls(goodUrls)).toBe(true)
    })

    it('returns false if the url is in the disallowed list', () => {
      badUrls.forEach((url) => {
        expect(noDisallowedUrls([{ value: url }])).toBe(
          'This link is no longer accepted in this field. Enter iPD courses used during your TTA session in the other field in this section.'
        )
      })
    })
  })

  describe('validateListOfResources', () => {
    it('returns false if there is an invalid resource', () => {
      expect(
        validateListOfResources([
          {
            value:
              'http://www.test-domain.com/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain',
          },
        ])
      ).toBe(true)
      expect(validateListOfResources([{ value: 'https://test.com' }])).toBe(true)
      expect(validateListOfResources([{ value: 'http://test.com' }])).toBe(true)
      expect(validateListOfResources([{ value: 'https://www.test.com' }])).toBe(true)
      expect(validateListOfResources([{ value: 'http://www.test.com' }])).toBe(true)
      expect(validateListOfResources([{ value: 'file://test.com' }])).toBe(false)
      expect(validateListOfResources([{ value: 'http://test' }])).toBe(false)
      expect(validateListOfResources([{ value: 'https://test' }])).toBe(false)
      expect(validateListOfResources([{ value: 'http:mickeymouse.com' }])).toBe(false)
      expect(validateListOfResources([{ value: 'http://google.comhttp://ask.comhttp://aol.com' }])).toBe(false)
      expect(
        validateListOfResources([
          {
            value:
              ' https://eclkc.ohs.acf.hhs.gov/sites/default/files/pdf/healthy-children-ready-learn.pdf cf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-d-health-program-services •\tHealth Competencies https://eclkc.ohs.acf.hhs.gov/sites/default/files/pdf/health-competencies.pdf Non-ECLKC resources\t https://nrckids.org/CFOC/ https://ufhealth.org/well-child-visits#:~:text=15%20months,2%201%2F2%20years",117689',
          },
        ])
      ).toBe(false)
      // eslint-disable-next-line no-useless-escape
      expect(validateListOfResources([{ value: 'http:lkj http:/test.v' }])).toBe(false)
      expect(validateListOfResources([{ value: 'https://www.google.com' }, { value: 'not a valid url' }, { value: 'https://www.google.com' }])).toBe(
        false
      )
    })
  })

  describe('objectivesWithValidResourcesOnly', () => {
    it('strips invalid resources', () => {
      const objectives = [
        {
          resources: [
            { value: 'https://www.google.com' },
            { value: 'not a valid url' },
            { value: 'https://www.google.com' },
            { value: 'https://www.google.com ' },
            { value: ' https://www.google.com' },
          ],
        },
      ]

      expect(objectivesWithValidResourcesOnly(objectives)).toEqual([
        {
          resources: [
            { value: 'https://www.google.com' },
            { value: 'https://www.google.com' },
            { value: 'https://www.google.com' },
            { value: 'https://www.google.com' },
          ],
        },
      ])
    })
  })
})
