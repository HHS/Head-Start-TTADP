import { Readable } from 'stream'
import Hasher, { Algorithms, getHash } from '../hasher'

describe('Hasher', () => {
  it('should hash data using the default algorithm (SHA256)', async () => {
    const hasher = new Hasher()
    const testData = 'Hello, World!'
    const readable = Readable.from(testData)
    readable.pipe(hasher)

    const hash = await hasher.getHash()
    expect(hash).toBe(getHash(testData, Algorithms.SHA256))
  })

  it('should hash data using a specified algorithm', async () => {
    const hasher = new Hasher(Algorithms.MD5)
    const testData = 'Hello, World!'
    const readable = Readable.from(testData)
    readable.pipe(hasher)

    const hash = await hasher.getHash()
    expect(hash).toBe(getHash(testData, Algorithms.MD5))
  })

  it('should handle errors during hashing', async () => {
    const hasher = new Hasher()
    const error = new Error('Test error')
    const promise = hasher.getHash()

    hasher.emit('error', error)
    await expect(promise).rejects.toThrow(error)
  })

  it('should hash empty data as an empty string', async () => {
    const hasher = new Hasher()
    const readable = Readable.from('')
    readable.pipe(hasher)

    const hash = await hasher.getHash()
    expect(hash).toBe(getHash('', Algorithms.SHA256))
  })
})

describe('getHash', () => {
  it('should return the correct hash for a string', () => {
    const testData = 'Hello, World!'
    const hash = getHash(testData, Algorithms.SHA256)
    expect(hash).toBe('dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f')
  })

  it('should return the correct hash for an object', () => {
    const testData = { hello: 'world' }
    const hash = getHash(testData, Algorithms.SHA256)
    expect(hash).toBe(getHash(JSON.stringify(testData), Algorithms.SHA256))
  })

  it('should return the same hash for the same content with the same algorithm - string', () => {
    const testData = 'Hello, World!'
    const hash1 = getHash(testData, Algorithms.SHA256)
    const hash2 = getHash(testData, Algorithms.SHA256)
    expect(hash1).toBe(hash2)
  })

  it('should return the same hash for the same content with the same algorithm - array', () => {
    const testData = ['Hello, World!']
    const hash1 = getHash(testData, Algorithms.SHA256)
    const hash2 = getHash(testData, Algorithms.SHA256)
    expect(hash1).toBe(hash2)
  })

  it('should return the same hash for the same content with the same algorithm - object', () => {
    const testData = { x: 'Hello, World!' }
    const hash1 = getHash(testData, Algorithms.SHA256)
    const hash2 = getHash(testData, Algorithms.SHA256)
    expect(hash1).toBe(hash2)
  })

  it('should return different hashes for different algorithms', () => {
    const testData = 'Hello, World!'
    const hash1 = getHash(testData, Algorithms.SHA256)
    const hash2 = getHash(testData, Algorithms.MD5)
    expect(hash1).not.toBe(hash2)
  })
})
