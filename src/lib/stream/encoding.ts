import { Transform } from 'stream';

class EncodingConverter {
  /**
   * Detects the encoding type of a readable stream.
   * @param stream - The readable stream to detect the encoding type from.
   * @returns A promise that resolves with the detected encoding type.
   */
  static detectEncodingType(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = '';
      // Accumulate data chunks from the stream
      stream.on('data', (chunk) => {
        data += chunk.toString();
      });

      // When all data has been read, check if it starts with BOM character '\uFEFF'
      stream.on('end', () => {
        if (data.startsWith('\uFEFF')) {
          resolve('utf16le'); // If it does, resolve with 'utf16le'
        } else {
          resolve('utf8'); // Otherwise, resolve with 'utf8'
        }
      });

      // If there is an error reading the stream, reject the promise with the error
      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Creates a transform stream that converts the encoding of the input data.
   * @param sourceEncoding - The source encoding of the input data.
   * @param targetEncoding - The target encoding for the output data.
   * @returns A transform stream that performs the encoding conversion.
   */
  static createEncodingConversionStream(sourceEncoding: string, targetEncoding: string): Transform {
    return new Transform({
      transform(chunk, encoding, callback) {
        const sourceString = chunk.toString(sourceEncoding as BufferEncoding);
        const targetBuffer = Buffer.from(sourceString, targetEncoding as BufferEncoding);
        this.push(targetBuffer); // Push the converted buffer to the output
        callback(); // Signal that the transformation is complete
      },
    });
  }

  /**
   * Creates a transform stream that converts UTF-16 encoded data to UTF-8.
   * @returns A transform stream that performs the encoding conversion from UTF-16 to UTF-8.
   */
  static createUtf16ToUtf8Stream(): Transform {
    return this.createEncodingConversionStream('utf16le', 'utf8');
  }

  /**
   * Creates a transform stream that converts UTF-8 encoded data to UTF-16.
   * @returns A transform stream that performs the encoding conversion from UTF-8 to UTF-16.
   */
  static createUtf8ToUtf16Stream(): Transform {
    return this.createEncodingConversionStream('utf8', 'utf16le');
  }

  /**
   * Forces the encoding of a readable stream to the specified target encoding.
   * If the source encoding matches the target encoding, a pass-through transform stream is returned.
   * Otherwise, a transform stream that performs the encoding conversion is returned.
   * @param stream - The readable stream to force the encoding on.
   * @param targetEncoding - The target encoding to force on the stream.
   * @returns A promise that resolves with the transform stream for the forced encoding.
   */
  static async forceStreamEncoding(
    stream: NodeJS.ReadableStream,
    targetEncoding: string,
  ): Promise<Transform> {
    const sourceEncoding = await EncodingConverter.detectEncodingType(stream);
    if (sourceEncoding === targetEncoding) {
      // If the source and target encodings are the same, return a pass-through transform stream
      return new Transform({
        transform(chunk, encoding, callback) {
          this.push(chunk); // Push the input chunk as-is to the output
          callback(); // Signal that the transformation is complete
        },
      });
    }
    // Otherwise, return a transform stream that performs the encoding conversion
    return EncodingConverter.createEncodingConversionStream(sourceEncoding, targetEncoding);
  }
}

export default EncodingConverter;
