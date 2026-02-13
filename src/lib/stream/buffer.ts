import { Writable, Readable } from 'stream'

class BufferStream extends Writable {
  private chunks: Buffer[] = []

  private finished = false

  private resolveReadable: ((readable: Readable) => void) | null = null

  private readablePromise: Promise<Readable> | null = null

  /**
   * Constructs an instance by initializing event listeners and state.
   * The 'finish' event listener sets the 'finished' flag to true and,
   * if 'resolveReadable' is set, creates a readable stream from the buffer.
   *
   * @param options - Optional configuration options that may be used by the superclass constructor.
   */
  constructor(options?) {
    super(options)
    this.on('finish', () => {
      this.finished = true
      if (this.resolveReadable) {
        this.resolveReadable(Readable.from(this.getBuffer()))
      }
    })
  }

  /**
   * Writes the given chunk of data into an internal array after converting it to a Buffer.
   * This is an internal method used in stream implementations and should not be called directly.
   *
   * @param chunk - The data to write. If not a Buffer, it will be coerced to a Buffer.
   * @param encoding - The encoding of the string if `chunk` is a string.
   * @param callback - A function to call once the data has been written. It takes an optional
   *                   Error argument if there was an error during writing.
   */
  // eslint-disable-next-line no-underscore-dangle
  _write(chunk, encoding: string, callback: (error?: Error | null) => void) {
    this.chunks.push(Buffer.from(chunk))
    callback()
  }

  /**
   * Retrieves a Readable stream that represents the current state of the data.
   * If the stream has finished, it returns a promise that resolves immediately with the stream.
   * If the stream has not finished, it returns a promise that will resolve with the stream once
   * it is available.
   *
   * @returns {Promise<Readable>} A promise that resolves with a Readable stream.
   */
  getReadableStream(): Promise<Readable> {
    if (this.finished) {
      // If the stream is already finished, return a promise that resolves immediately.
      return Promise.resolve(Readable.from(this.getBuffer()))
    }
    // If the stream is not finished, return a promise that will resolve later.
    if (!this.readablePromise) {
      this.readablePromise = new Promise<Readable>((resolve) => {
        this.resolveReadable = resolve
      })
    }
    return this.readablePromise
  }

  /**
   * Retrieves the size of the chunks array.
   *
   * @returns {number} The number of elements in the chunks array.
   */
  getSize(): number {
    return this.chunks.length
  }

  /**
   * Retrieves a Buffer that is the result of concatenating all data chunks stored in the instance.
   *
   * @returns {Buffer} A Buffer instance representing the concatenated chunks.
   *
   * @throws {TypeError} If any of the chunks is not of a type that can be concatenated.
   */
  private getBuffer(): Buffer {
    return Buffer.concat(this.chunks)
  }
}

export default BufferStream
