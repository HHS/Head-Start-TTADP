import Queue from 'bull';
import addToS3Queue, { s3Queue } from './s3Queue';

jest.mock('bull');

describe('queue tests', () => {
  beforeAll(() => {
  });
  afterAll(() => {
  });

  it('calls addToS3Queue.add', async () => {
    await addToS3Queue('24323423-4353453-43564564-34534');
    expect(Queue).toHaveBeenCalledWith('s3', 'redis://undefined:6379', { redis: { password: undefined } });
    expect(s3Queue.add).toHaveBeenCalled();
  });
});
