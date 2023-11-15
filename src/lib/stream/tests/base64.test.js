import { PassThrough } from 'stream';
import { Base64Stream } from '../base64';

describe('Base64Stream', () => {
  describe('encoding', () => {
    it('should encode data to base64', async () => {
      const input = Buffer.from('Hello, World!');
      const expectedOutput = 'SGVsbG8sIFdvcmxkIQ==';
      const base64Stream = new Base64Stream('encode');
      const passThrough = new PassThrough();

      let output = '';
      passThrough.pipe(base64Stream).on('data', (chunk) => {
        output += chunk.toString();
      });

      await new Promise((resolve) => {
        passThrough.end(input, resolve);
      });

      expect(output).toBe(expectedOutput);
    });
  });

  describe('decoding', () => {
    it('should decode base64 data', async () => {
      const input = 'SGVsbG8sIFdvcmxkIQ==';
      const expectedOutput = Buffer.from('Hello, World!');
      const base64Stream = new Base64Stream('decode');
      const passThrough = new PassThrough();

      let output = Buffer.alloc(0);
      passThrough.pipe(base64Stream).on('data', (chunk) => {
        output = Buffer.concat([output, chunk]);
      });

      await new Promise((resolve) => {
        passThrough.end(input, resolve);
      });

      expect(output).toEqual(expectedOutput);
    });

    it('should handle leftover characters and decode them in flush', async () => {
      const input = 'SGVsbG8sIFdvcmxkIQ'; // Missing the last character to make it a multiple of 4
      const expectedOutput = Buffer.from('Hello, World!');
      const base64Stream = new Base64Stream('decode');
      const passThrough = new PassThrough();

      let output = Buffer.alloc(0);
      passThrough.pipe(base64Stream).on('data', (chunk) => {
        output = Buffer.concat([output, chunk]);
      });

      await new Promise((resolve) => {
        passThrough.on('end', resolve);
        passThrough.end(input);
      });

      expect(output).toEqual(expectedOutput);
    });

    it('should throw an error for invalid base64 data', async () => {
      const input = 'Invalid base64 string!';
      const base64Stream = new Base64Stream('decode');
      const passThrough = new PassThrough();
      let err;

      try {
        await new Promise((resolve, reject) => {
          passThrough.pipe(base64Stream).on('error', reject);
          passThrough.end(input);
        });
      } catch (error) {
        err = error;
      }
      expect(err).toBeInstanceOf(Error);
    });
  });
});
