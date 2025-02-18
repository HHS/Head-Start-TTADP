import { mapUrlValue } from '../ReviewItem';

describe('mapUrlValue', () => {
  it('should return Recipient when passed recipient', () => {
    expect(mapUrlValue('recipient')).toEqual('Recipient');
  });

  it('should return Regional Office when passed regionalOffice', () => {
    expect(mapUrlValue('regionalOffice')).toEqual('Regional Office');
  });

  it('should return Other entity when passed other-entity', () => {
    expect(mapUrlValue('other-entity')).toEqual('Other entity');
  });

  it('should return Technical assistance when passed technical-assistance', () => {
    expect(mapUrlValue('technical-assistance')).toEqual('Technical assistance');
  });

  it('should return Training when passed training', () => {
    expect(mapUrlValue('training')).toEqual('Training');
  });

  it('should return In Person when passed in-person', () => {
    expect(mapUrlValue('in-person')).toEqual('In Person');
  });

  it('should return Virtual when passed virtual', () => {
    expect(mapUrlValue('virtual')).toEqual('Virtual');
  });

  it('should return Hybrid when passed hybrid', () => {
    expect(mapUrlValue('hybrid')).toEqual('Hybrid');
  });

  it('should return the value when passed an invalid value', () => {
    expect(mapUrlValue('invalid')).toEqual('invalid');
  });

  it('should return the value when passed an empty string', () => {
    expect(mapUrlValue('')).toEqual('');
  });
});
