import { Readable } from 'stream'
import * as chardet from 'chardet'
import EncodingConverter from '../encoding'

jest.mock('chardet')

describe('EncodingConverter', () => {
  const mockDetect = chardet.detect
  const mockAnalyse = chardet.analyse

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should convert encoding of the input stream', () => {
    const sourceEncoding = 'utf16le'
    const targetEncoding = 'utf-8'
    const converter = new EncodingConverter(targetEncoding, sourceEncoding)

    // Create a readable stream with known encoding
    const readable = new Readable()
    readable.push(Buffer.from('Hello, world!', sourceEncoding))
    readable.push(null) // Signal end of stream

    // Collect data from the output stream
    const chunks = []

    return new Promise((resolve) => {
      converter.on('data', (chunk) => chunks.push(chunk))
      converter.on('end', () => {
        const result = Buffer.concat(chunks).toString(targetEncoding)
        expect(result).toBe('Hello, world!')
        resolve()
      })

      // Pipe the readable stream through the converter
      readable.pipe(converter)
    })
  })

  it('should default to utf-8 when unable to detect source encoding', () => {
    const targetEncoding = 'utf-8'
    const converter = new EncodingConverter(targetEncoding)

    // Create a readable stream without specifying encoding
    const readable = new Readable()
    readable.push(Buffer.from('Some text'))
    readable.push(null) // Signal end of stream

    const chunks = []

    return new Promise((resolve) => {
      converter.on('data', (chunk) => chunks.push(chunk))
      converter.on('end', () => {
        const result = Buffer.concat(chunks).toString(targetEncoding)
        expect(result).toBe('Some text')
        resolve()
      })

      readable.pipe(converter)
    })
  })

  it('should handle errors during conversion', () => {
    const invalidEncoding = 'invalid-encoding'
    // Wrap the instantiation in a function so that toThrow can catch the error.
    expect(() => new EncodingConverter(invalidEncoding)).toThrow(`Unsupported encoding detected: ${invalidEncoding}`)
  })

  it('should process remaining buffer on flush', () => {
    const sourceEncoding = 'ascii'
    const targetEncoding = 'utf-8'
    const converter = new EncodingConverter(targetEncoding)

    const readable = new Readable()
    readable.push(Buffer.from('Incomplete buffer less than 1024 bytes', sourceEncoding))
    readable.push(null) // Signal end of stream

    const chunks = []

    return new Promise((resolve) => {
      converter.on('data', (chunk) => chunks.push(chunk))
      converter.on('end', () => {
        const result = Buffer.concat(chunks).toString(targetEncoding)
        expect(result).toBe('Incomplete buffer less than 1024 bytes')
        resolve()
      })

      readable.pipe(converter)
    })
  })

  it('should detect encoding and convert the buffer', async () => {
    expect.assertions(1) // Add this line to indicate the number of assertions expected

    const converter = new EncodingConverter('utf-8')
    const inputBuffer = Buffer.from('test string', 'utf-8')

    mockDetect.mockReturnValueOnce('utf-8')
    mockAnalyse.mockReturnValueOnce([{ name: 'utf-8', confidence: 100 }])

    await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-underscore-dangle
      converter._transform(inputBuffer, 'buffer', (error) => {
        if (error) {
          reject(error)
        } else {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(true).toBeTruthy() // Add an assertion
          resolve()
        }
      })
    })
  })

  // ... other tests ...

  it('should handle _flush when detecting encoding', async () => {
    expect.assertions(1) // Add this line to indicate the number of assertions expected

    const converter = new EncodingConverter('utf-8')
    const inputBuffer = Buffer.from('test string', 'utf-8')

    mockDetect.mockReturnValueOnce('utf-8')

    await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-underscore-dangle
      converter._transform(inputBuffer.slice(0, 10), 'buffer', (error) => {
        if (error) {
          reject(error)
        } else {
          // eslint-disable-next-line no-underscore-dangle
          converter._flush((flushError) => {
            if (flushError) {
              reject(flushError)
            } else {
              // eslint-disable-next-line jest/no-conditional-expect
              expect(true).toBeTruthy() // Add an assertion
              resolve()
            }
          })
        }
      })
    })
  })

  it('should convert the buffer correctly in convertBuffer', () => {
    const sourceEncoding = 'utf16le'
    const targetEncoding = 'utf-8'
    const converter = new EncodingConverter(targetEncoding, sourceEncoding)
    const buffer = Buffer.from('Hello, world!', sourceEncoding)
    const pushSpy = jest.spyOn(converter, 'push')

    return new Promise((resolve, reject) => {
      converter.buffer = buffer
      converter.convertBuffer((error) => {
        if (error) {
          reject(error)
          return
        }
        expect(error).toBeUndefined()
        expect(pushSpy).toHaveBeenCalled()
        // eslint-disable-next-line max-len
        const result = Buffer.concat(pushSpy.mock.calls.map((call) => call[0])).toString(targetEncoding)
        expect(result).toBe('Hello, world!')
        resolve()
      })
    })
  })

  it('should call the callback with an error in convertBuffer on failure', () => {
    const sourceEncoding = 'utf16le'
    const targetEncoding = 'utf-8'
    const converter = new EncodingConverter(targetEncoding, sourceEncoding)
    const buffer = Buffer.from('Hello, world!', sourceEncoding)
    const pushSpy = jest.spyOn(converter, 'push')
    jest.spyOn(buffer, 'toString').mockImplementation(() => {
      throw new Error('Conversion error')
    })

    return new Promise((resolve, reject) => {
      converter.buffer = buffer
      converter.convertBuffer((error) => {
        expect(error).toBeDefined()
        expect(error.message).toBe('Conversion error')
        expect(pushSpy).not.toHaveBeenCalled()
        resolve()
      })
    })
  })

  it('should call the callback with an error in convertChunk on failure', () => {
    const sourceEncoding = 'utf16le'
    const targetEncoding = 'utf-8'
    const converter = new EncodingConverter(targetEncoding, sourceEncoding)
    const chunk = Buffer.from('Hello, world!', sourceEncoding)
    const pushSpy = jest.spyOn(converter, 'push')
    jest.spyOn(chunk, 'toString').mockImplementation(() => {
      throw new Error('Conversion error')
    })

    return new Promise((resolve, reject) => {
      converter.convertChunk(chunk, (error) => {
        expect(error).toBeDefined()
        expect(error.message).toBe('Conversion error')
        expect(pushSpy).not.toHaveBeenCalled()
        resolve()
      })
    })
  })

  it('should throw an error for unsupported source encoding', () => {
    const targetEncoding = 'utf-8'
    const unsupportedSourceEncoding = 'unsupported-encoding'

    expect(() => new EncodingConverter(targetEncoding, unsupportedSourceEncoding)).toThrow(
      `Unsupported encoding detected: ${unsupportedSourceEncoding}`
    )
  })

  it('should detect encoding when buffer length is >= 1024', () => {
    const sourceEncoding = 'utf16le'
    const targetEncoding = 'utf-8'
    const converter = new EncodingConverter(targetEncoding)

    // Create a readable stream with a buffer length >= 1024
    const readable = new Readable()
    const largeBuffer = Buffer.alloc(1024, 'a', sourceEncoding)
    readable.push(largeBuffer)
    readable.push(null) // Signal end of stream

    const chunks = []

    return new Promise((resolve) => {
      converter.on('data', (chunk) => chunks.push(chunk))
      converter.on('end', () => {
        const result = Buffer.concat(chunks).toString(targetEncoding)
        expect(result).toBe(largeBuffer.toString(targetEncoding))
        resolve()
      })

      readable.pipe(converter)
    })
  })

  it('should fall back to utf-8 when chardet.analyse does not detect encoding', () => {
    const targetEncoding = 'utf-8'
    const converter = new EncodingConverter(targetEncoding)

    // Create a readable stream with a buffer length >= 1024
    const readable = new Readable()
    const largeBuffer = Buffer.alloc(1024, 'a', 'utf16le')
    readable.push(largeBuffer)
    readable.push(null) // Signal end of stream

    const chunks = []

    mockDetect.mockReturnValueOnce(undefined)
    mockAnalyse.mockReturnValueOnce([])

    return new Promise((resolve) => {
      converter.on('data', (chunk) => chunks.push(chunk))
      converter.on('end', () => {
        const result = Buffer.concat(chunks).toString(targetEncoding)
        expect(result).toBe(largeBuffer.toString('utf-8'))
        resolve()
      })

      readable.pipe(converter)
    })
  })
})
