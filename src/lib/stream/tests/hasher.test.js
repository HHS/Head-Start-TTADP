import * as crypto from 'crypto';
import { Readable } from 'stream';
import Hasher, { Algorithms } from '../hasher';

describe('Hasher', () => {
  let mockStream;
  let hasher;

  beforeEach(() => {
    let count = 0;
    mockStream = new Readable({
      read(size) {
        this.push(' ');
        if (count === 1) this.push(null);
        count += 1;
      },
    });
    hasher = new Hasher(mockStream);
  });

  describe('generateHash', () => {
    it('should generate a hash using the specified algorithm', async () => {
      const expectedHash = '6c179f21e6f62b629055d8ab40f454ed02e48b68563913473b857d3638e23b28';
      const actualHash = await hasher.generateHash(Algorithms.SHA256);

      expect(actualHash).toBe(expectedHash);
    });

    it('should default to SHA256 algorithm if no algorithm is specified', async () => {
      const expectedHash = '6c179f21e6f62b629055d8ab40f454ed02e48b68563913473b857d3638e23b28';
      const actualHash = await hasher.generateHash();

      expect(actualHash).toBe(expectedHash);
    });
  });

  describe('generateSha1', () => {
    it('should generate a SHA1 hash', async () => {
      const expectedHash = '099600a10a944114aac406d136b625fb416dd779';
      const actualHash = await hasher.generateSha1();

      expect(actualHash).toBe(expectedHash);
    });
  });

  describe('generateSha256', () => {
    it('should generate a SHA256 hash', async () => {
      const expectedHash = '6c179f21e6f62b629055d8ab40f454ed02e48b68563913473b857d3638e23b28';
      const actualHash = await hasher.generateSha256();

      expect(actualHash).toBe(expectedHash);
    });
  });

  describe('generateSha384', () => {
    it('should generate a SHA384 hash', async () => {
      const expectedHash = '1db699595d6971a9f1ee061b8ade6b29119606f5aa9b1cdccedef339fccc5def66db7a2f069ab53cf84ad07268b8e7d5';
      const actualHash = await hasher.generateSha384();

      expect(actualHash).toBe(expectedHash);
    });
  });

  describe('generateSha512', () => {
    it('should generate a SHA512 hash', async () => {
      const expectedHash = '16b7aa7f7e549ba129c776bb91ce1e692da103271242d44a9bc145cf338450c90132496ead2530f527b1bd7f50544f37e7d27a2d2bbb58099890aa320f40aca9';
      const actualHash = await hasher.generateSha512();

      expect(actualHash).toBe(expectedHash);
    });
  });

  describe('generateMD5', () => {
    it('should generate an MD5 hash', async () => {
      const expectedHash = '23b58def11b45727d3351702515f86af';
      const actualHash = await hasher.generateMD5();

      expect(actualHash).toBe(expectedHash);
    });
  });

  describe('generateRipemd160', () => {
    it('should generate a RIPEMD160 hash', async () => {
      const expectedHash = '2b663ea43157663a2a614e521aa64c1dad90c39e';
      const actualHash = await hasher.generateRipemd160();

      expect(actualHash).toBe(expectedHash);
    });
  });
});
