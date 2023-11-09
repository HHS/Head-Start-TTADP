import { Readable, PassThrough } from 'stream';
import Cloner from '../cloner';

describe('Cloner', () => {
  let sourceStream;
  let cloner;

  beforeEach(() => {
    sourceStream = new Readable();
    cloner = new Cloner(sourceStream, 3);
  });

  afterEach(() => {
    // Clean up the source stream and clone streams
    sourceStream.destroy();
    cloner.getClones().forEach((clone) => clone.destroy());
  });

  describe('constructor', () => {
    it('should initialize the sourceStream and clones', () => {
      expect(cloner.sourceStream).toBe(sourceStream);
      expect(cloner.clones.length).toBe(3);
      expect(cloner.clones[0]).toBeInstanceOf(PassThrough);
      expect(cloner.clones[1]).toBeInstanceOf(PassThrough);
      expect(cloner.clones[2]).toBeInstanceOf(PassThrough);
    });
  });

  describe('cloneStreams', () => {
    it('should pipe data from sourceStream to each clone', () => {
      const clone1 = cloner.getClones()[0];
      const clone2 = cloner.getClones()[1];
      const clone3 = cloner.getClones()[2];

      const dataChunk = Buffer.from('test data');

      // Mock the write method of clone streams
      clone1.write = jest.fn();
      clone2.write = jest.fn();
      clone3.write = jest.fn();

      // Emit a data event on the source stream
      sourceStream.emit('data', dataChunk);

      expect(clone1.write).toHaveBeenCalledWith(dataChunk);
      expect(clone2.write).toHaveBeenCalledWith(dataChunk);
      expect(clone3.write).toHaveBeenCalledWith(dataChunk);
    });

    it('should end each clone stream when the sourceStream ends', () => {
      const clone1 = cloner.getClones()[0];
      const clone2 = cloner.getClones()[1];
      const clone3 = cloner.getClones()[2];

      // Mock the end method of clone streams
      clone1.end = jest.fn();
      clone2.end = jest.fn();
      clone3.end = jest.fn();

      // Emit an end event on the source stream
      sourceStream.emit('end');

      expect(clone1.end).toHaveBeenCalled();
      expect(clone2.end).toHaveBeenCalled();
      expect(clone3.end).toHaveBeenCalled();
    });

    it('should emit error to each clone stream when an error occurs in the sourceStream', () => {
      const clone1 = cloner.getClones()[0];
      const clone2 = cloner.getClones()[1];
      const clone3 = cloner.getClones()[2];

      const error = new Error('Test error');

      // Mock the emit method of clone streams
      clone1.emit = jest.fn();
      clone2.emit = jest.fn();
      clone3.emit = jest.fn();

      // Emit an error event on the source stream
      sourceStream.emit('error', error);

      expect(clone1.emit).toHaveBeenCalledWith('error', error);
      expect(clone2.emit).toHaveBeenCalledWith('error', error);
      expect(clone3.emit).toHaveBeenCalledWith('error', error);
    });
  });

  describe('getClones', () => {
    it('should return an array of clone streams', () => {
      const clones = cloner.getClones();

      expect(clones.length).toBe(3);
      expect(clones[0]).toBeInstanceOf(PassThrough);
      expect(clones[1]).toBeInstanceOf(PassThrough);
      expect(clones[2]).toBeInstanceOf(PassThrough);
    });
  });
});
