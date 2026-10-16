import { toApiPayload, toFormValues } from '../formData';

const GRANT = {
  id: 1,
  regionId: 14,
  status: 'Active',
  numberWithProgramTypes: '14HP1234 - EHS',
  name: 'Children and Families First - 14HP1234 - EHS',
};

const OTHER_GRANT = { ...GRANT, id: 2, numberWithProgramTypes: '14CH5678 - HS' };

const RECIPIENT_OPTION = {
  id: 10,
  name: 'Children and Families First',
  grants: [GRANT, OTHER_GRANT],
};

const SAVED_REQUEST = {
  id: 42,
  displayId: 'R14-REQ-42',
  regionId: 14,
  status: 'draft',
  recipientAware: true,
  originator: 'TTA Staff',
  context: '<p>context</p>',
  creatorNotes: 'notes',
  recipient: { id: 10, name: 'Children and Families First' },
  grants: [GRANT],
  goalTemplate: { id: 3, templateName: 'Monitoring goal', standard: 'Monitoring' },
  citations: [{ citation: 'ANC - 1302.91(e)(1)', findingType: 'Area of Noncompliance' }],
  reviewer: { id: 6, name: 'Ross Geller' },
};

const EMPTY_REQUEST = {
  ...SAVED_REQUEST,
  recipientAware: null,
  originator: null,
  context: null,
  creatorNotes: null,
  recipient: null,
  grants: [],
  goalTemplate: null,
  citations: [],
  reviewer: null,
};

describe('TTA request form data', () => {
  describe('toFormValues', () => {
    it('turns a saved request into the form values', () => {
      expect(toFormValues(SAVED_REQUEST, [RECIPIENT_OPTION])).toEqual({
        recipient: RECIPIENT_OPTION,
        grants: [GRANT],
        recipientAware: 'yes',
        originator: { value: 'TTA Staff', label: 'TTA Staff' },
        goal: { id: 3, name: 'Monitoring goal', standard: 'Monitoring' },
        citations: [
          {
            label: 'ANC - 1302.91(e)(1)',
            value: 'Area of Noncompliance::ANC - 1302.91(e)(1)',
            name: 'ANC - 1302.91(e)(1)',
            findingType: 'Area of Noncompliance',
            standardIds: [],
          },
        ],
        context: '<p>context</p>',
        creatorNotes: 'notes',
        reviewer: { value: 6, label: 'Ross Geller' },
      });
    });

    it('falls back to the saved grants when the recipient is not among the options', () => {
      const values = toFormValues(SAVED_REQUEST);
      expect(values.recipient).toEqual({
        id: 10,
        name: 'Children and Families First',
        grants: [GRANT],
      });
    });

    it('turns an empty draft into empty form values', () => {
      expect(toFormValues(EMPTY_REQUEST)).toEqual({
        recipient: null,
        grants: [],
        recipientAware: '',
        originator: null,
        goal: null,
        citations: [],
        context: '',
        creatorNotes: '',
        reviewer: null,
      });
    });

    it('reads a "no" for recipient awareness', () => {
      expect(toFormValues({ ...SAVED_REQUEST, recipientAware: false }).recipientAware).toBe('no');
    });
  });

  describe('toApiPayload', () => {
    it('turns the form values into what the API takes', () => {
      expect(toApiPayload(toFormValues(SAVED_REQUEST, [RECIPIENT_OPTION]))).toEqual({
        recipientId: 10,
        grantIds: [1],
        recipientAware: true,
        originator: 'TTA Staff',
        goalTemplateId: 3,
        citations: [{ citation: 'ANC - 1302.91(e)(1)', findingType: 'Area of Noncompliance' }],
        context: '<p>context</p>',
        creatorNotes: 'notes',
        reviewerId: 6,
      });
    });

    it('sends empty fields as cleared', () => {
      expect(toApiPayload(toFormValues(EMPTY_REQUEST))).toEqual({
        recipientId: null,
        grantIds: [],
        recipientAware: null,
        originator: null,
        goalTemplateId: null,
        citations: [],
        context: '',
        creatorNotes: '',
        reviewerId: null,
      });
    });
  });
});
