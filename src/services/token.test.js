import db, { User, UserValidationStatus } from '../models'
import { createAndStoreVerificationToken, validateVerificationToken } from './token'
import { userEmailIsVerifiedByUserId } from './users'

describe('token service', () => {
  beforeEach(async () => {
    await User.create({
      id: 1000,
      name: 'user 1000',
      hsesUsername: 'user.1000',
      hsesUserId: '1000',
      lastLogin: new Date(),
    })
  })

  afterEach(async () => {
    await UserValidationStatus.destroy({ where: { userId: 1000 } })
    await User.destroy({ where: { id: 1000 } })
  })

  afterAll(async () => {
    await db.sequelize.close()
  })

  describe('createAndStoreVerificationToken', () => {
    it('creates a token', async () => {
      const token = await createAndStoreVerificationToken(1000, 'email')
      expect(token).toBeTruthy()

      const pair = await UserValidationStatus.findOne({
        where: {
          userId: 1000,
          type: 'email',
          token,
        },
      })

      expect(pair).toBeTruthy()
      expect(pair.dataValues.validatedAt).toBeNull()
    })

    it('updates a token where a token already exists', async () => {
      const token = await createAndStoreVerificationToken(1000, 'email')
      const token2 = await createAndStoreVerificationToken(1000, 'email')
      expect(token).toEqual(token2)

      const pair = await UserValidationStatus.findOne({
        where: {
          userId: 1000,
          type: 'email',
          token: token2,
        },
      })

      expect(pair).toBeTruthy()
      expect(pair.dataValues.validatedAt).toBeNull()
    })
  })

  describe('validateVerificationToken', () => {
    it('validates a token', async () => {
      const token = await createAndStoreVerificationToken(1000, 'email')
      const payload = await validateVerificationToken(1000, token, 'email')
      expect(payload.userId).toBe(1000)
      expect(payload.type).toBe('email')

      const pair = await UserValidationStatus.findOne({
        where: {
          userId: 1000,
          type: 'email',
          token,
        },
      })

      expect(pair).toBeTruthy()
      expect(pair.dataValues.validatedAt).not.toBeNull()
    })

    it('throws an error if the token is invalid', async () => {
      const token = await createAndStoreVerificationToken(1000, 'email')
      const badToken = `${token}bad`
      await expect(validateVerificationToken(1000, badToken, 'email')).rejects.toThrow()
    })

    it('throws an error if the userId is invalid', async () => {
      const token = await createAndStoreVerificationToken(1000, 'email')
      await expect(validateVerificationToken(1001, token, 'email')).rejects.toThrow()
    })

    it('throws an error if the type is invalid', async () => {
      const token = await createAndStoreVerificationToken(1000, 'email')
      await expect(validateVerificationToken(1000, token, 'phone')).rejects.toThrow()
    })

    it('returns early if validateAt is not null', async () => {
      const token = await createAndStoreVerificationToken(1000, 'email')
      await validateVerificationToken(1000, token, 'email')
      await expect(validateVerificationToken(1000, token, 'email')).resolves.toEqual({
        userId: 1000,
        type: 'email',
        exp: expect.any(Number),
        iat: expect.any(Number),
      })
    })
  })

  describe('validationStatus', () => {
    it('userEmailIsVerifiedByUserId', async () => {
      const token = await createAndStoreVerificationToken(1000, 'email')
      await validateVerificationToken(1000, token, 'email')
      const verified = await userEmailIsVerifiedByUserId(1000)
      expect(verified).toBe(true)
    })
  })
})
