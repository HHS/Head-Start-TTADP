const httpContext = require('express-http-context')
const referenceData = require('./referenceData').default

jest.mock('express-http-context')

describe('referenceData', () => {
  it('should return default values when httpContext has no values set', () => {
    httpContext.get.mockImplementation(() => undefined)

    const result = referenceData()

    expect(result).toEqual({
      referenceData: {
        userId: '',
        impersonationId: '',
        transactionId: '',
        sessionSig: '',
      },
    })
  })

  it('should return correct values when httpContext has values set', () => {
    httpContext.get.mockImplementation((key) => {
      switch (key) {
        case 'loggedUser':
          return 123
        case 'impersonationUserId':
          return 456
        case 'transactionId':
          return 'abc-123'
        case 'sessionSig':
          return 'sig-456'
        default:
          return undefined
      }
    })

    const result = referenceData()

    expect(result).toEqual({
      referenceData: {
        userId: 123,
        impersonationId: 456,
        transactionId: 'abc-123',
        sessionSig: 'sig-456',
      },
    })
  })

  it('should handle mixed undefined and defined values from httpContext', () => {
    httpContext.get.mockImplementation((key) => {
      switch (key) {
        case 'loggedUser':
          return 123
        case 'impersonationUserId':
          return undefined
        case 'transactionId':
          return 'abc-123'
        case 'sessionSig':
          return undefined
        default:
          return undefined
      }
    })

    const result = referenceData()

    expect(result).toEqual({
      referenceData: {
        userId: 123,
        impersonationId: '',
        transactionId: 'abc-123',
        sessionSig: '',
      },
    })
  })
})
