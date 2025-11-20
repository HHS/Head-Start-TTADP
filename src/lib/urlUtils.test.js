import { isValidResourceUrl } from '@ttahub/common';

describe('urlUtils', () => {
  describe('isValidResourceUrl', () => {
    const validUrls = [
      'http://www.test-domain.com/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain',
      'https://test.com',
      'http://test.com',
      'https://www.test.com',
      'http://www.test.com',
      'https://www.google.com',
      'https://www.google.com',
    ];

    const invalidUrls = [
      'http://test',
      'https://test',
      'http:mickeymouse.com',
      'not a valid url',
      'file://test.com',
      'https://eclkc.ohs.acf.hhs.gov/sites/default/files/pdf/healthy-children-ready-learn.pdf cf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-d-health-program-services •\tHealth Competencies https://eclkc.ohs.acf.hhs.gov/sites/default/files/pdf/health-competencies.pdf Non-ECLKC resources\t https://nrckids.org/CFOC/ https://ufhealth.org/well-child-visits#:~:text=15%20months,2%201%2F2%20years",117689',
      'http://google.comhttp://ask.comhttp://aol.com',
      // eslint-disable-next-line no-useless-escape
      'http:\lkj http:/test.v',
      'https://eclkc.ohs.acf.hhs.gov/professional-development/individualized-professional-development-ipd-portfolio/individualized-professional-development-ipd-portfolio',
      'https://eclkc.ohs.acf.hhs.gov/cas/login',
      'https://eclkc.ohs.acf.hhs.gov/professional-development/individualized-professional-development-ipd-portfolio/course-catalog',
      'https://headstart.gov/sites/default/files/pdf/healthy-children-ready-learn.pdf cf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-d-health-program-services •\tHealth Competencies https://headstart.gov/sites/default/files/pdf/health-competencies.pdf Non-ECLKC resources\t https://nrckids.org/CFOC/ https://ufhealth.org/well-child-visits#:~:text=15%20months,2%201%2F2%20years",117689',
      'https://headstart.gov/professional-development/individualized-professional-development-ipd-portfolio/individualized-professional-development-ipd-portfolio',
      'https://headstart.gov/cas/login',
      'https://headstart.gov/professional-development/individualized-professional-development-ipd-portfolio/course-catalog',
      'https://www.headstart.gov/professional-development/individualized-professional-development-ipd-portfolio/course-catalog',
      'https://www.headstart.gov/professional-development/individualized-professional-development-ipd-portfolio/individualized-professional-development-ipd-portfolio',
      'https://www.headstart.gov/cas/login',
      'https://www.eclkc.ohs.acf.hhs.gov/professional-development/individualized-professional-development-ipd-portfolio/course-catalog',
      'https://www.eclkc.ohs.acf.hhs.gov/professional-development/individualized-professional-development-ipd-portfolio/individualized-professional-development-ipd-portfolio',
      'https://www.eclkc.ohs.acf.hhs.gov/cas/login',
    ];

    it('correctly validates resources', () => {
      validUrls.forEach((url) => {
        expect(isValidResourceUrl(url)).toBe(true);
      });

      invalidUrls.forEach((url) => {
        expect(isValidResourceUrl(url)).toBe(false);
      });
    });
  });
});
