import { Readable, Transform } from 'stream';
import EncodingConverter from '../encoding';

describe('EncodingConverter', () => {
  describe('detectEncodingType', () => {
    test('should return utf16le if data starts with BOM', async () => {
      const stream = Readable.from('\uFEFFHello, World!');
      const encodingType = await EncodingConverter.detectEncodingType(stream);
      expect(encodingType).toBe('utf16le');
    });

    test('should return utf8 if data does not start with BOM', async () => {
      const stream = Readable.from('Hello, World!');
      const encodingType = await EncodingConverter.detectEncodingType(stream);
      expect(encodingType).toBe('utf8');
    });

    test('should reject with error if stream emits an error', async () => {
      const stream = new Readable();
      const error = new Error('Stream error');
      const detectPromise = EncodingConverter.detectEncodingType(stream);

      process.nextTick(() => {
        stream.emit('error', error);
      });

      await expect(detectPromise).rejects.toThrow(error);
    });
  });

  describe('createEncodingConversionStream', () => {
    test('should transform source encoding to target encoding', async () => {
      const sourceEncoding = 'utf16le';
      const targetEncoding = 'utf8';
      const conversionStream = EncodingConverter.createEncodingConversionStream(
        sourceEncoding,
        targetEncoding,
      );

      const inputString = 'Hello, World!';
      const expectedOutputBuffer = Buffer.from(inputString, targetEncoding);

      const outputChunks = [];

      conversionStream.on('data', (chunk) => {
        outputChunks.push(chunk);
      });

      conversionStream.write(Buffer.from(inputString, sourceEncoding));
      conversionStream.end();

      await new Promise((resolve) => {
        conversionStream.on('end', () => {
          const outputBuffer = Buffer.concat(outputChunks);
          expect(outputBuffer).toEqual(expectedOutputBuffer);
          resolve();
        });
      });
    });
  });

  describe('createUtf16ToUtf8Stream', () => {
    test('should create a stream that converts utf16le to utf8', async () => {
      const conversionStream = EncodingConverter.createUtf16ToUtf8Stream();

      const inputString = 'Hello, World!';
      const expectedOutputBuffer = Buffer.from(inputString, 'utf8');

      const outputChunks = [];

      conversionStream.on('data', (chunk) => {
        outputChunks.push(chunk);
      });

      conversionStream.write(Buffer.from(inputString, 'utf16le'));
      conversionStream.end();

      await new Promise((resolve) => {
        conversionStream.on('end', () => {
          const outputBuffer = Buffer.concat(outputChunks);
          expect(outputBuffer).toEqual(expectedOutputBuffer);
          resolve();
        });
      });
    });
  });

  describe('createUtf8ToUtf16Stream', () => {
    test('should create a stream that converts utf8 to utf16le', async () => {
      const conversionStream = EncodingConverter.createUtf8ToUtf16Stream();

      const inputString = 'Hello, World!';
      const expectedOutputBuffer = Buffer.from(inputString, 'utf16le');

      const outputChunks = [];

      conversionStream.on('data', (chunk) => {
        outputChunks.push(chunk);
      });

      conversionStream.write(Buffer.from(inputString, 'utf8'));
      conversionStream.end();

      await new Promise((resolve) => {
        conversionStream.on('end', () => {
          const outputBuffer = Buffer.concat(outputChunks);
          expect(outputBuffer).toEqual(expectedOutputBuffer);
          resolve();
        });
      });
    });
  });

  describe('forceStreamEncoding', () => {
    test('should return a passthrough stream if source and target encodings are the same', async () => {
      const stream = new Readable({
        read() {},
      });
      const targetEncoding = 'utf8';
      const transformStream = await EncodingConverter.forceStreamEncoding(stream, targetEncoding);

      const inputString = 'Hello, World!';
      const expectedOutputBuffer = Buffer.from(inputString, targetEncoding);

      const onData = jest.fn();
      transformStream.on('data', onData);

      process.nextTick(() => {
        stream.push(Buffer.from(inputString, targetEncoding));
        stream.push(null);
      });

      await new Promise((resolve) => {
        transformStream.on('end', () => {
          expect(onData).toHaveBeenCalledTimes(1);
          expect(onData.mock.calls[0][0]).toEqual(expectedOutputBuffer);
          resolve();
        });
      });
    });

    test('should return a conversion stream if source and target encodings are different', async () => {
      const stream = new Readable({
        read() {},
      });
      const sourceEncoding = 'utf16le';
      const targetEncoding = 'utf8';
      const transformStream = await EncodingConverter.forceStreamEncoding(stream, targetEncoding);

      const inputString = 'Hello, World!';
      const expectedOutputBuffer = Buffer.from(inputString, targetEncoding);

      const onData = jest.fn();
      transformStream.on('data', onData);

      process.nextTick(() => {
        stream.push(Buffer.from(inputString, sourceEncoding));
        stream.push(null);
      });

      await new Promise((resolve) => {
        transformStream.on('end', () => {
          expect(onData).toHaveBeenCalledTimes(1);
          expect(onData.mock.calls[0][0]).toEqual(expectedOutputBuffer);
          resolve();
        });
      });
    });
  });
});
