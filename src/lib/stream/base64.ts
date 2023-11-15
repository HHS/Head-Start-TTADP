// base64-stream.ts
import { Transform } from 'stream';

type Base64StreamMode = 'encode' | 'decode';

class Base64Stream extends Transform {
  private leftover: string;

  constructor(private mode: Base64StreamMode) {
    super();
    this.leftover = '';
  }

  // eslint-disable-next-line no-underscore-dangle
  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: Buffer) => void,
  ): void {
    try {
      if (this.mode === 'encode') {
        // Convert the chunk to a Base64 string
        const base64Encoded = chunk.toString('base64');
        this.push(base64Encoded);
        callback();
      } else {
        // Decode mode: Concatenate any leftover with the current chunk
        const base64Data = this.leftover + chunk.toString();
        // Calculate how many leftover characters we should keep for the next chunk
        const leftoverCount = base64Data.length % 4;
        // Keep the leftover characters for the next transform call
        this.leftover = base64Data.substring(base64Data.length - leftoverCount);
        // Process the rest of the data
        const toDecode = base64Data.substring(0, base64Data.length - leftoverCount);
        const decoded = Buffer.from(toDecode, 'base64');
        this.push(decoded);
        callback();
      }
    } catch (error) {
      callback(error);
    }
  }

  // eslint-disable-next-line no-underscore-dangle
  _flush(
    callback: (error?: Error | null, data?: Buffer) => void,
  ): void {
    if (this.mode === 'decode' && this.leftover.length > 0) {
      // Attempt to process any remaining leftover data
      try {
        const decoded = Buffer.from(this.leftover, 'base64');
        this.push(decoded);
      } catch (error) {
        callback(error);
      }
    }
    callback();
  }
}

export {
  type Base64StreamMode,
  Base64Stream,
};
