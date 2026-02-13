import { PassThrough } from 'stream'
import { Base64Stream } from '../base64'

describe('Base64Stream', () => {
  describe('encoding', () => {
    it('should encode data to base64', async () => {
      const input = Buffer.from('Hello, World!')
      const expectedOutput = 'SGVsbG8sIFdvcmxkIQ=='
      const base64Stream = new Base64Stream('encode')
      const passThrough = new PassThrough()

      let output = ''
      passThrough.pipe(base64Stream).on('data', (chunk) => {
        output += chunk.toString()
      })

      await new Promise((resolve) => {
        passThrough.end(input, resolve)
      })

      expect(output).toBe(expectedOutput)
    })
  })

  describe('decoding', () => {
    it('should decode base64 data', async () => {
      const input = 'SGVsbG8sIFdvcmxkIQ=='
      const expectedOutput = Buffer.from('Hello, World!')
      const base64Stream = new Base64Stream('decode')
      const passThrough = new PassThrough()

      let output = Buffer.alloc(0)
      passThrough.pipe(base64Stream).on('data', (chunk) => {
        output = Buffer.concat([output, chunk])
      })

      await new Promise((resolve) => {
        passThrough.end(input, resolve)
      })

      expect(output).toEqual(expectedOutput)
    })

    it('should handle leftover characters and decode them in flush', async () => {
      const input = 'SGVsbG8sIFdvcmxkIQ' // Missing the last character to make it a multiple of 4
      const expectedOutput = Buffer.from('Hello, World!')
      const base64Stream = new Base64Stream('decode')
      const passThrough = new PassThrough()

      let output = Buffer.alloc(0)
      passThrough.pipe(base64Stream).on('data', (chunk) => {
        output = Buffer.concat([output, chunk])
      })

      await new Promise((resolve) => {
        passThrough.on('end', resolve)
        passThrough.end(input)
      })

      expect(output).toEqual(expectedOutput)
    })

    it('should throw an error for invalid base64 data', async () => {
      const input = 'Invalid base64 string!'
      const base64Stream = new Base64Stream('decode')
      const passThrough = new PassThrough()
      let err

      try {
        await new Promise((resolve, reject) => {
          passThrough.pipe(base64Stream).on('error', reject).on('finish', resolve) // Listen for the 'finish' event as well
          passThrough.end(input)
        })
      } catch (error) {
        err = error
      }

      expect(err).toBeInstanceOf(Error)
    })

    it('should handle errors in _transform method', async () => {
      const base64Stream = new Base64Stream('decode')
      const invalidBase64Chunk = Buffer.from('invalid base64')

      // Wrap the _transform call in a promise to use async/await
      await expect(
        new Promise((resolve, reject) => {
          // eslint-disable-next-line no-underscore-dangle
          base64Stream._transform(invalidBase64Chunk, 'utf8', (error) => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })
      ).resolves.toEqual(undefined)
    })

    it('should handle errors in _flush method', async () => {
      const base64Stream = new Base64Stream('decode')
      // Set leftover to an invalid base64 string length (not a multiple of 4)
      base64Stream.leftover = 'abc' // Bypass private access for testing

      // Wrap the _flush call in a promise to use async/await
      await expect(
        new Promise((resolve, reject) => {
          // eslint-disable-next-line no-underscore-dangle
          base64Stream._flush((error) => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })
      ).resolves.toEqual(undefined)
    })
  })
})
