import { ValidFor } from '..';

describe('ValidFor Model', () => {
  it('should return correct latestName when mapsTo is not defined', () => {
    const newInstance = ValidFor.build({ name: 'Standalone ValidFor' });
    expect(newInstance.latestName).toEqual('Standalone ValidFor');
  });

  it('should return correct latestId when mapsTo is not defined', () => {
    const newInstance = ValidFor.build({ name: 'Standalone ValidFor' });
    expect(newInstance.latestId).toBeNull();
  });
});
