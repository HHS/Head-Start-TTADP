// base64-stream.ts
import { Transform } from 'stream'

type Base64StreamMode = 'encode' | 'decode'

class Base64Stream extends Transform {
  private leftover: string

  constructor(private mode: Base64StreamMode) {
    super()
    this.leftover = ''
  }

  // eslint-disable-next-line no-underscore-dangle
  _transform(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null, data?: Buffer) => void): void {
    try {
      if (this.mode === 'encode') {
        // Convert the chunk to a Base64 string
        const base64Encoded = chunk.toString('base64')
        this.push(base64Encoded)
        callback()
      } else {
        // Decode mode: Concatenate any leftover with the current chunk
        const base64Data = this.leftover + chunk.toString()
        // Calculate how many leftover characters we should keep for the next chunk
        const leftoverCount = base64Data.length % 4
        // Keep the leftover characters for the next transform call
        this.leftover = base64Data.substring(base64Data.length - leftoverCount)
        // Process the rest of the data
        const toDecode = base64Data.substring(0, base64Data.length - leftoverCount)
        const decoded = Buffer.from(toDecode, 'base64')
        this.push(decoded)
        callback()
      }
    } catch (error) {
      callback(error)
    }
  }

  // eslint-disable-next-line no-underscore-dangle
  _flush(callback: (error?: Error | null, data?: Buffer) => void): void {
    if (this.mode === 'decode' && this.leftover.length > 0) {
      // Pad the leftover data to make it a multiple of 4 characters
      const paddedLeftover = this.leftover.padEnd(this.leftover.length + (4 - (this.leftover.length % 4)), '=')

      try {
        const decoded = Buffer.from(paddedLeftover, 'base64')
        if (decoded.length === 0) {
          callback(new Error('Invalid base64 data'))
          return // Explicit return after callback
        }
        this.push(decoded)
        callback()
        return // Explicit return after callback
      } catch (error) {
        callback(error)
      }
    } else {
      callback()
    }
  }
}

export { type Base64StreamMode, Base64Stream }
