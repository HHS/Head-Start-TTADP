import jwt from 'jsonwebtoken';
import { UserValidationStatus } from '../models';
import { createAndStoreVerificationToken, validateVerificationToken } from './token'; // Adjust the import path as necessary

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('../models', () => ({
  UserValidationStatus: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

describe('Verification Token', () => {
  const userId = 1;
  const type = 'email';
  const token = 'token';
  const secret = process.env.JWT_SECRET;
  const payload = { userId, type };

  beforeEach(() => {
    jwt.sign.mockReturnValue(token);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAndStoreVerificationToken', () => {
    it('creates and stores a new verification token', async () => {
      UserValidationStatus.findOne.mockResolvedValue(null);
      UserValidationStatus.create.mockResolvedValue({});

      const result = await createAndStoreVerificationToken(userId, type);
      expect(result).toBe(token);
      expect(jwt.sign).toHaveBeenCalledWith(payload, secret, { expiresIn: '7d' });
      expect(UserValidationStatus.create).toHaveBeenCalledWith({ userId, token, type });
    });

    it('updates an existing verification token', async () => {
      const mockRow = {
        set: jest.fn(),
        save: jest.fn(),
      };
      UserValidationStatus.findOne.mockResolvedValue(mockRow);

      const result = await createAndStoreVerificationToken(userId, type);
      expect(result).toBe(token);
      expect(mockRow.set).toHaveBeenCalledWith('token', token);
      expect(mockRow.set).toHaveBeenCalledWith('validatedAt', null);
      expect(mockRow.save).toHaveBeenCalled();
    });
  });

  describe('validateVerificationToken', () => {
    it('validates a verification token successfully', async () => {
      const mockPair = {
        validatedAt: null,
        set: jest.fn(),
        save: jest.fn(),
      };
      UserValidationStatus.findOne.mockResolvedValue(mockPair);
      jwt.verify.mockReturnValue(payload);

      const result = await validateVerificationToken(userId, token, type);
      expect(result).toEqual(payload);
      expect(jwt.verify).toHaveBeenCalledWith(token, secret);
      expect(mockPair.set).toHaveBeenCalledWith('validatedAt', expect.any(Date));
      expect(mockPair.save).toHaveBeenCalled();
    });

    it('throws an error for invalid token pair', async () => {
      UserValidationStatus.findOne.mockResolvedValue(null);

      await expect(validateVerificationToken(userId, token, type)).rejects.toThrow('Invalid token pair');
    });

    it('throws an error for invalid userId', async () => {
      UserValidationStatus.findOne.mockResolvedValue({});
      jwt.verify.mockReturnValue({ userId: 'wrong', type });

      await expect(validateVerificationToken(userId, token, type)).rejects.toThrow('Invalid userId');
    });

    it('throws an error for invalid type', async () => {
      UserValidationStatus.findOne.mockResolvedValue({});
      jwt.verify.mockReturnValue({ userId, type: 'wrong' });

      await expect(validateVerificationToken(userId, token, type)).rejects.toThrow('Invalid type');
    });

    it('returns payload without updating if token pair is already validated', async () => {
      const mockPair = {
        validatedAt: new Date(),
        set: jest.fn(),
        save: jest.fn(),
      };
      UserValidationStatus.findOne.mockResolvedValue(mockPair);
      jwt.verify.mockReturnValue(payload);

      const result = await validateVerificationToken(userId, token, type);
      expect(result).toEqual(payload);
      expect(mockPair.set).not.toHaveBeenCalled();
      expect(mockPair.save).not.toHaveBeenCalled();
    });
  });
});
