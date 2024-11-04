import {
  INTERNAL_SERVER_ERROR,
} from 'http-codes';
import { getSource } from './handlers';
import { getSourceFromTemplate } from '../../services/goalTemplates';

jest.mock('../../services/goalTemplates');

const mockResponse = {
  attachment: jest.fn(),
  json: jest.fn(),
  send: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
    send: jest.fn(),
  })),
};

describe('goalTemplates handlers', () => {
  describe('getSource', () => {
    it('handles success', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
        },
        query: {
          grantIds: [1],
        },
      };

      getSourceFromTemplate.mockResolvedValue('RTTAPA Development');

      await getSource(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith({ source: 'RTTAPA Development' });
    });
    it('handles null source', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
        },
        query: {
          grantIds: [1],
        },
      };

      getSourceFromTemplate.mockResolvedValue(undefined);

      await getSource(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith({ source: '' });
    });
  });
  it('handles error', async () => {
    const req = {
      params: {
        goalTemplateId: 1,
      },
      query: {
        grantIds: [1],
      },
    };

    getSourceFromTemplate.mockRejectedValue(new Error('error'));

    await getSource(req, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });
});
