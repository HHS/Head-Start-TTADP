import { Transform } from 'stream';
import * as chardet from 'chardet';

class EncodingConverter extends Transform {
  private detectEncoding: boolean;

  private buffer: Buffer;

  // Define a set of supported encodings for Buffer methods
  private static readonly supportedEncodings: Set<BufferEncoding> = new Set([
    'ascii',
    'utf8',
    'utf-8',
    'utf16le',
    'ucs2',
    'ucs-2',
    'base64',
    'base64url',
    'latin1',
    'binary',
    'hex',
  ]);

  constructor(
    private targetEncoding: string,
    private sourceEncoding?: string,
  ) {
    super();
    if (targetEncoding
      && EncodingConverter.supportedEncodings
        .has(targetEncoding.toLowerCase() as BufferEncoding)) {
      this.targetEncoding = targetEncoding.toLowerCase();
    } else {
      throw new Error(`Unsupported encoding detected: ${targetEncoding}`);
    }
    if (sourceEncoding
      && EncodingConverter.supportedEncodings
        .has(sourceEncoding.toLowerCase() as BufferEncoding)) {
      this.sourceEncoding = sourceEncoding.toLowerCase();
    } else if (sourceEncoding) {
      throw new Error(`Unsupported encoding detected: ${sourceEncoding}`);
    }
    this.detectEncoding = !this.sourceEncoding; // Flag to indicate if we need to detect encoding
    this.buffer = Buffer.alloc(0); // Initialize an empty buffer
  }

  // eslint-disable-next-line no-underscore-dangle
  _transform(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error | null, data?: Buffer) => void,
  ): void {
    if (this.detectEncoding) {
      // Continue collecting chunks until we have enough to detect the encoding
      this.buffer = Buffer.concat([new Uint8Array(this.buffer), new Uint8Array(chunk)]);
      if (this.buffer.length >= 1024) {
        // We have enough data to detect the encoding
        this.detectEncoding = false; // Set flag to false as we've detected the encoding
        // Default to utf-8 if no encoding is detected
        const detectedEncoding = chardet.detect(new Uint8Array(this.buffer));

        // Check if the detected encoding is supported
        // eslint-disable-next-line max-len
        this.sourceEncoding = detectedEncoding && EncodingConverter.supportedEncodings.has(detectedEncoding.toLowerCase() as BufferEncoding)
          ? detectedEncoding.toLowerCase()
          : 'utf-8';

        // If the source encoding matches the target encoding, pass through the entire buffer
        if (this.sourceEncoding === this.targetEncoding) {
          this.push(this.buffer);
          this.buffer = Buffer.alloc(0);
          callback();
        } else {
          // Convert the buffered data with the detected encoding
          this.convertBuffer(callback);
        }
      } else {
        // Wait for more data to detect encoding
        callback();
      }
    } else {
      // Encoding has been detected, convert the chunk directly
      this.convertChunk(chunk, callback);
    }
  }

  convertBuffer(callback: (error?: Error | null, data?: Buffer) => void) {
    try {
      const data = this.buffer.toString(this.sourceEncoding as BufferEncoding);
      const convertedBuffer = Buffer.from(data, this.targetEncoding as BufferEncoding);
      this.push(convertedBuffer);
      this.buffer = Buffer.alloc(0); // Clear the buffer
      callback();
    } catch (error) {
      callback(error);
    }
  }

  convertChunk(chunk: Buffer, callback: (error?: Error | null, data?: Buffer) => void) {
    try {
      const data = chunk.toString(this.sourceEncoding as BufferEncoding);
      const convertedChunk = Buffer.from(data, this.targetEncoding as BufferEncoding);
      this.push(convertedChunk);
      callback();
    } catch (error) {
      callback(error);
    }
  }

  // eslint-disable-next-line no-underscore-dangle
  _flush(callback: (error?: Error | null, data?: Buffer) => void): void {
    if (this.detectEncoding && this.buffer.length > 0) {
      // If flush is called and we're still detecting the encoding,
      // perform the conversion on the remaining buffer.
      this.sourceEncoding = chardet.detect(new Uint8Array(this.buffer)) || 'utf-8';

      // If the source encoding matches the target encoding, pass through the remaining buffer
      if (this.sourceEncoding === this.targetEncoding) {
        this.push(this.buffer);
        this.buffer = Buffer.alloc(0);
        callback();
      } else {
        this.convertBuffer(callback);
      }
    } else {
      // No more data, just call the callback
      callback();
    }
  }
}

export default EncodingConverter;
