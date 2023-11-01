import { Transform } from 'stream';

class EncodingConverter {
  static detectEncodingType(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = '';
      stream.on('data', (chunk) => {
        data += chunk.toString();
      });

      stream.on('end', () => {
        if (data.startsWith('\uFEFF')) {
          resolve('utf16le');
        } else {
          resolve('utf8');
        }
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  static createEncodingConversionStream(sourceEncoding: string, targetEncoding: string): Transform {
    return new Transform({
      transform(chunk, encoding, callback) {
        const sourceString = chunk.toString(sourceEncoding as BufferEncoding);
        const targetBuffer = Buffer.from(sourceString, targetEncoding as BufferEncoding);
        this.push(targetBuffer);
        callback();
      },
    });
  }

  static createUtf16ToUtf8Stream(): Transform {
    return this.createEncodingConversionStream('utf16le', 'utf8');
  }

  static createUtf8ToUtf16Stream(): Transform {
    return this.createEncodingConversionStream('utf8', 'utf16le');
  }

  static async forceStreamEncoding(
    stream: NodeJS.ReadableStream,
    targetEncoding: string,
  ): Promise<Transform> {
    const sourceEncoding = await EncodingConverter.detectEncodingType(stream);
    if (sourceEncoding === targetEncoding) {
      return new Transform({
        transform(chunk, encoding, callback) {
          this.push(chunk);
          callback();
        },
      });
    }
    return EncodingConverter.createEncodingConversionStream(sourceEncoding, targetEncoding);
  }
}

export default EncodingConverter;
