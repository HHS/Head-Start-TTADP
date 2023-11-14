import { Readable } from 'stream';
import EncodingConverter from '../encoding';

describe('EncodingConverter', () => {
  it('should convert encoding of the input stream', () => {
    const sourceEncoding = 'utf16le';
    const targetEncoding = 'utf-8';
    const converter = new EncodingConverter(targetEncoding, sourceEncoding);

    // Create a readable stream with known encoding
    const readable = new Readable();
    readable.push(Buffer.from('Hello, world!', sourceEncoding));
    readable.push(null); // Signal end of stream

    // Collect data from the output stream
    const chunks = [];

    return new Promise((resolve) => {
      converter.on('data', (chunk) => chunks.push(chunk));
      converter.on('end', () => {
        const result = Buffer.concat(chunks).toString(targetEncoding);
        expect(result).toBe('Hello, world!');
        resolve();
      });

      // Pipe the readable stream through the converter
      readable.pipe(converter);
    });
  });

  it('should default to utf-8 when unable to detect source encoding', () => {
    const targetEncoding = 'utf-8';
    const converter = new EncodingConverter(targetEncoding);

    // Create a readable stream without specifying encoding
    const readable = new Readable();
    readable.push(Buffer.from('Some text'));
    readable.push(null); // Signal end of stream

    const chunks = [];

    return new Promise((resolve) => {
      converter.on('data', (chunk) => chunks.push(chunk));
      converter.on('end', () => {
        const result = Buffer.concat(chunks).toString(targetEncoding);
        expect(result).toBe('Some text');
        resolve();
      });

      readable.pipe(converter);
    });
  });

  it('should handle errors during conversion', () => {
    const invalidEncoding = 'invalid-encoding';
    // Wrap the instantiation in a function so that toThrow can catch the error.
    expect(() => new EncodingConverter(invalidEncoding))
      .toThrow(`Unsupported encoding detected: ${invalidEncoding}`);
  });

  it('should process remaining buffer on flush', () => {
    const sourceEncoding = 'ascii';
    const targetEncoding = 'utf-8';
    const converter = new EncodingConverter(targetEncoding);

    const readable = new Readable();
    readable.push(Buffer.from('Incomplete buffer less than 1024 bytes', sourceEncoding));
    readable.push(null); // Signal end of stream

    const chunks = [];

    return new Promise((resolve) => {
      converter.on('data', (chunk) => chunks.push(chunk));
      converter.on('end', () => {
        const result = Buffer.concat(chunks).toString(targetEncoding);
        expect(result).toBe('Incomplete buffer less than 1024 bytes');
        resolve();
      });

      readable.pipe(converter);
    });
  });
});
