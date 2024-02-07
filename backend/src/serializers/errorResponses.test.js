import { notFound, unauthorized } from './errorResponses';

describe('errorResponses', () => {
  const mockResponse = jest.fn();

  describe('notFound', () => {
    it('sets a JSON:API 404 error', () => {
      mockResponse.status = jest.fn().mockReturnValue(mockResponse);
      mockResponse.json = jest.fn();

      notFound(mockResponse, 'Details string');

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: '404',
        title: 'Not Found',
        details: 'Details string',
      });
    });
  });

  describe('unauthorized', () => {
    it('sets a JSON:API 403 error', () => {
      mockResponse.status = jest.fn().mockReturnValue(mockResponse);
      mockResponse.json = jest.fn();

      unauthorized(mockResponse, 'Details string');

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: '403',
        title: 'Unauthorized User',
        details: 'Details string',
      });
    });
  });
});
