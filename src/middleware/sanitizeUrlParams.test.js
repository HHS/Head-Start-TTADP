import sanitizeUrlParams from './sanitizeUrlParams'

describe('sanitizeUrlParams middleware', () => {
  let req
  let res
  let next

  beforeEach(() => {
    req = {
      query: {},
      params: {},
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    next = jest.fn()
  })

  it('should sanitize malicious HTML in query parameters', () => {
    req.query = {
      normal: 'normalvalue',
      malicious: '<script>alert("XSS")</script>',
    }

    sanitizeUrlParams(req, res, next)

    expect(req.query.normal).toEqual('normalvalue')
    expect(req.query.malicious).not.toContain('<script>')
  })

  it('should sanitize malicious HTML in path parameters', () => {
    req.params = {
      id: '123',
      malicious: '<img src="x" onerror="alert(\'XSS\')" />',
    }

    sanitizeUrlParams(req, res, next)

    expect(req.params.id).toEqual('123')
    expect(req.params.malicious).not.toContain('<img')
  })

  it('should handle URL-encoded malicious content', () => {
    // A URL-encoded version of HTML that could be injected
    const encodedMalicious =
      '%3Cbr%3E%3Chr%3E%3Ch1%3E%E2%9D%97%E2%9D%97%E2%9D%97%20SESSION%20CORRUPTION%20ERROR%20%E2%9D%97%E2%9D%97%E2%9D%97%3C%2fh1%3E%3Cb%3E%3Cpre%3EYour%20session%20information%20appears%20to%20have%20been%20corrupted.%3Cbr%3EPlease%20%3Ca%20href%3dhttps%3a%2f%2fwww.synack.com%2farbitrarylink%3Eclick%20here%3C%2fa%3E%20to%20refesh%20session%20and%20avoid%20losing%20account%20data.%3C%2fb%3E%3Cbr%3E%3Chr%3E%3Cbr%3E%3Cbr%3E%3Cpre%3ERef%20ID%3a%20%3Ca%20href%3dhttps%3a%2f%2fwww.synack.com%2farbitrarylink%3Ebf9d2c85-354e-47fd-91f6-6d186345248e%3C%2fa%3E%3C%2fpre%3E'

    req.params = {
      log: encodedMalicious,
    }

    sanitizeUrlParams(req, res, next)

    // After sanitization, no HTML tags should remain
    expect(req.params.log).not.toContain('<h1>')
    expect(req.params.log).not.toContain('<a href')
    expect(req.params.log).not.toContain('<br>')
    expect(req.params.log).not.toContain('<hr>')
  })

  it('should sanitize javascript: URLs', () => {
    req.query = {
      // eslint-disable-next-line no-script-url
      redirect: 'javascript:alert("XSS")',
    }

    sanitizeUrlParams(req, res, next)

    expect(req.query.redirect).toEqual('about:blank')
  })

  it('should handle non-string values', () => {
    req.query = {
      page: 1,
      filters: { status: 'active' },
    }

    sanitizeUrlParams(req, res, next)

    expect(req.query.page).toEqual(1)
    expect(req.query.filters).toEqual({ status: 'active' })
  })

  it('should gracefully handle malformed URL encoding', () => {
    req.query = {
      badEncoding: '%E0%A4%A', // Incomplete UTF-8 sequence
    }

    sanitizeUrlParams(req, res, next)

    // Should not throw error and still sanitize the parameter
    expect(next).toHaveBeenCalled()
  })

  it('should call next() after sanitization', () => {
    sanitizeUrlParams(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('should sanitize malicious content in URL path', () => {
    // Example malicious URL similar to the one in the issue (now passed as param)
    req.params = {
      log: '%3Cbr%3E%3Chr%3E%3Ch1%3E%E2%9D%97%E2%9D%97%E2%9D%97%20SESSION%20CORRUPTION%20ERROR%20%E2%9D%97%E2%9D%97%E2%9D%97%3C%2fh1%3E',
    }

    sanitizeUrlParams(req, res, next)

    // Verify the param was sanitized - HTML tags should be removed
    expect(req.params.log).not.toContain('<br>')
    expect(req.params.log).not.toContain('<h1>')
    expect(req.params.log).not.toContain('</h1>')
    // The middleware should still call next() - sanitization should not block
    expect(next).toHaveBeenCalled()
  })

  it('should allow normal URLs to pass through', () => {
    req.params = {
      log: '12345',
    }

    sanitizeUrlParams(req, res, next)

    expect(req.params.log).toEqual('12345')
    expect(next).toHaveBeenCalled()
  })

  it('should handle errors gracefully and return 500', () => {
    // Mock Object.keys to throw an error when called
    const originalObjectKeys = Object.keys
    Object.keys = jest.fn((obj) => {
      if (obj && obj.willThrow) {
        throw new Error('Test error')
      }
      return originalObjectKeys(obj)
    })

    req.query = { willThrow: true, param: 'value' }

    // eslint-disable-next-line no-console
    jest.spyOn(console, 'error').mockImplementation()

    sanitizeUrlParams(req, res, next)

    // Should return 500 error response
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'An error occurred while processing your request',
    })
    // eslint-disable-next-line no-console
    expect(console.error).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()

    // Restore
    Object.keys = originalObjectKeys
    // eslint-disable-next-line no-console
    console.error.mockRestore()
  })

  it('should return 400 Bad Request when URL contains malicious content', () => {
    req.originalUrl = '/path/with/<script>alert("XSS")</script>/endpoint'
    req.url = '/path/with/<script>alert("XSS")</script>/endpoint'

    sanitizeUrlParams(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Bad Request',
      message: 'Request contains potentially malicious content',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should return 400 Bad Request when URL contains HTML tags', () => {
    req.originalUrl = '/api/logs/<img src="x" onerror="alert(\'XSS\')" />/view'
    req.url = '/api/logs/<img src="x" onerror="alert(\'XSS\')" />/view'

    sanitizeUrlParams(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Bad Request',
      message: 'Request contains potentially malicious content',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should allow normal URLs with > or < in encoded form to pass', () => {
    // URL-encoded angle brackets that don't decode to actual HTML tags
    req.originalUrl = '/api/data/5%3C10'
    req.url = '/api/data/5%3C10'
    req.query = {}
    req.params = {}

    sanitizeUrlParams(req, res, next)

    expect(res.status).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('should return 400 Bad Request when URL contains encoded malicious HTML (%3C)', () => {
    // This is the exact URL from the issue - encoded HTML tags in URL path
    req.originalUrl =
      '/api/communication-logs/region/1/log/%3Cbr%3E%3Chr%3E%3Ch1%3E%E2%9D%97%E2%9D%97%E2%9D%97%20SESSION%20CORRUPTION%20ERROR%20%E2%9D%97%E2%9D%97%E2%9D%97%3C%2fh1%3E%3Cb%3E%3Cpre%3EYour%20session%20information%20appears%20to%20have%20been%20corrupted.%3Cbr%3EPlease%20%3Ca%20href%3dhttps%3a%2f%2fwww.synack.com%2farbitrarylink%3Eclick%20here%3C%2fa%3E%20to%20refesh%20session%20and%20avoid%20losing%20account%20data.%3C%2fb%3E%3Cbr%3E%3Chr%3E%3Cbr%3E%3Cbr%3E%3Cpre%3ERef%20ID%3a%20%3Ca%20href%3dhttps%3a%2f%2fwww.synack.com%2farbitrarylink%3Ebf9d2c85-354e-47fd-91f6-6d186345248e%3C%2fa%3E%3C%2fpre%3E'
    req.url = req.originalUrl
    req.query = {}
    req.params = {}

    sanitizeUrlParams(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Bad Request',
      message: 'Request contains potentially malicious content',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should return 400 Bad Request when URL contains encoded closing tag (%2f + %3E)', () => {
    // URL with encoded closing HTML tag
    req.originalUrl = '/api/data/test%3Cscript%3E/endpoint'
    req.url = req.originalUrl
    req.query = {}
    req.params = {}

    sanitizeUrlParams(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Bad Request',
      message: 'Request contains potentially malicious content',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should return 400 Bad Request when URL contains lowercase encoded angle brackets with tag pattern (%3c)', () => {
    req.originalUrl = '/api/path/%3cscript%3ealert("xss")%3c/script%3e'
    req.url = req.originalUrl
    req.query = {}
    req.params = {}

    sanitizeUrlParams(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Bad Request',
      message: 'Request contains potentially malicious content',
    })
    expect(next).not.toHaveBeenCalled()
  })
})
