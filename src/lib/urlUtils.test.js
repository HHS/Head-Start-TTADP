import { isValidResourceUrl } from './urlUtils';

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
    ];

    it('correctly validates resources', () => {
      validUrls.forEach((url) => {
        try {
          expect(isValidResourceUrl(url)).toBe(true);
        } catch (err) { console.log(err, url); throw err; }
      });

      invalidUrls.forEach((url) => {
        expect(isValidResourceUrl(url)).toBe(false);
      });
    });
  });
});
