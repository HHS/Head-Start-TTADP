import { getStatus } from '../FileTable';

describe('getStatus tests', () => {
  it('returns the correct statuses', () => {
    let newStatus;
    newStatus = getStatus('UPLOADING');
    expect(newStatus).toBe('Uploading');
    newStatus = getStatus('UPLOADED');
    expect(newStatus).toBe('Uploaded');
    newStatus = getStatus('UPLOAD_FAILED');
    expect(newStatus).toBe('Upload Failed');
    newStatus = getStatus('QUEUEING_FAILED');
    expect(newStatus).toBe('Upload Failed');
    newStatus = getStatus('SCANNING_QUEUED');
    expect(newStatus).toBe('Scanning');
    newStatus = getStatus('SCANNING');
    expect(newStatus).toBe('Scanning');
    newStatus = getStatus('APPROVED');
    expect(newStatus).toBe('Approved');
    newStatus = getStatus('REJECTED');
    expect(newStatus).toBe('Rejected');
  });
});
