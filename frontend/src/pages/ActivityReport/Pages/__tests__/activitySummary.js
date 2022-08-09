import { isPageComplete } from '../activitySummary';

const FORM_DATA = {
  activityRecipientType: 'specialist',
  requester: 'specialist',
  deliveryMethod: 'test',
  virtualDeliveryType: '',
  activityRecipients: [{}],
  targetPopulations: ['people'],
  reason: ['reason'],
  ttaType: ['tta'],
  participants: ['participant'],
  duration: 1,
  numberOfParticipants: 3,
  startDate: '09/01/2020',
  endDate: '09/01/2020',
};

describe('activitySummary isPageComplete', () => {
  it('returns true if validated by hook form', async () => {
    const result = isPageComplete({}, { isValid: true });
    expect(result).toBe(true);
  });

  it('validates strings', async () => {
    const result = isPageComplete({ ...FORM_DATA, requester: null }, { isValid: false });
    expect(result).toBe(false);
  });

  it('validates arrays', async () => {
    const result = isPageComplete({ ...FORM_DATA, activityRecipients: [] }, { isValid: false });
    expect(result).toBe(false);
  });

  it('validates numbers', async () => {
    const result = isPageComplete({ ...FORM_DATA, duration: null }, { isValid: false });
    expect(result).toBe(false);
  });

  it('validates dates', async () => {
    const result = isPageComplete({ ...FORM_DATA, startDate: null }, { isValid: false });
    expect(result).toBe(false);
  });

  it('validates delivery method', async () => {
    const result = isPageComplete({ ...FORM_DATA, deliveryMethod: 'virtual' }, { isValid: false });
    expect(result).toBe(false);
  });
});
