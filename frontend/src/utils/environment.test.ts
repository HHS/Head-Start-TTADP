import { isNonProductionEnvironment } from './environment';

describe('isNonProductionEnvironment', () => {
  it.each(['tta-smarthub-staging.app.cloud.gov', 'localhost', '127.0.0.1'])(
    'returns true for %p',
    (hostname) => {
      expect(isNonProductionEnvironment(hostname)).toBe(true);
    }
  );

  it.each(['ttahub.ohs.acf.hhs.gov', 'app.cloud.gov.example.com', ''])(
    'returns false for %p',
    (hostname) => {
      expect(isNonProductionEnvironment(hostname)).toBe(false);
    }
  );

  it('defaults to the current hostname', () => {
    // jsdom runs on localhost
    expect(isNonProductionEnvironment()).toBe(true);
  });
});
