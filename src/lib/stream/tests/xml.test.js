```typescript
import { Readable } from 'stream';
import XMLStream from './XMLStream';

describe('XMLStream', () => {
  let xmlStream: Readable;
  let stream: XMLStream;

  beforeEach(() => {
    xmlStream = new Readable();
    stream = new XMLStream(xmlStream);
  });

  describe('initialize', () => {
    it('should parse the XML stream and populate parsedObjects array', async () => {
      const xmlData = '<objects>{"id": 1}</objects><objects>{"id": 2}</objects>';
      xmlStream.push(xmlData);
      xmlStream.push(null);

      await stream.initialize();

      expect(stream.getObjectCount()).toBe(2);
    });

    it('should reject with an error if there is an error in parsing the XML stream', async () => {
      const xmlData = '<objects>{"id": 1}</objects><objects>{"id": 2}</objects>';
      xmlStream.push(xmlData);
      xmlStream.push('<invalid-xml');
      xmlStream.push(null);

      await expect(stream.initialize()).rejects.toThrow();
    });
  });

  describe('getObjectCount', () => {
    it('should return the number of parsed objects', () => {
      stream['parsedObjects'] = [{ id: 1 }, { id: 2 }, { id: 3 }];

      expect(stream.getObjectCount()).toBe(3);
    });
  });

  describe('processingComplete', () => {
    it('should return false if all objects have not been read', () => {
      stream['isFullyRead'] = false;

      expect(stream.processingComplete()).toBe(false);
    });

    it('should return true if all objects have been read', () => {
      stream['isFullyRead'] = true;

      expect(stream.processingComplete()).toBe(true);
    });
  });

  describe('getNextObject', () => {
    it('should return the next object in parsedObjects array', async () => {
      stream['parsedObjects'] = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const object = await stream.getNextObject();

      expect(object).toEqual({ id: 1 });
      expect(stream['currentIndex']).toBe(1);
    });

    it('should return null if all objects have been read', async () => {
      stream['parsedObjects'] = [{ id: 1 }];
      stream['isFullyRead'] = true;

      const object = await stream.getNextObject();

      expect(object).toBeNull();
      expect(stream['currentIndex']).toBe(0);
    });

    it('should wait for readable event if parsedObjects array is empty', async () => {
      const promise = stream.getNextObject();

      xmlStream.push('<objects>{"id": 1}</objects>');
      xmlStream.push(null);

      await expect(promise).resolves.toEqual({ id: 1 });
    });
  });

  describe('getObjectSchema', () => {
    it('should return the schema of the first parsed object', async () => {
      stream['parsedObjects'] = [{ id: 1 }];

      const schema = await stream.getObjectSchema();

      expect(schema).toBe('{"id":1}');
    });

    it('should return an empty string if parsedObjects array is empty', async () => {
      const promise = stream.getObjectSchema();

      xmlStream.push('<objects>{"id": 1}</objects>');
      xmlStream.push(null);

      await expect(promise).resolves.toBe('');
    });
  });
});
```
```
