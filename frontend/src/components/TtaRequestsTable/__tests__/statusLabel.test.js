import ttaRequestStatusLabel from '../statusLabel';

const CREATOR = 1;
const REVIEWER = 2;
const COR = 3;
const SOMEONE_ELSE = 4;

const request = (status, approverStatus) => ({
  status,
  creator: { id: CREATOR },
  reviewer: { id: REVIEWER },
  approvers: approverStatus === undefined ? [] : [{ userId: COR, status: approverStatus }],
});

const REVIEW_PENDING = 'TTAC/Manager review pending';
const COR_PENDING = 'COR approval pending';
const NEEDS_ACTION = 'Needs action';
const PENDING_CHANGES = 'Pending changes';

// the TTA request status matrix: what each user sees at each step
describe('ttaRequestStatusLabel', () => {
  it.each([
    // [step, request, creator, reviewer, COR, anyone else]
    ['drafted', request('draft'), 'Draft', 'Draft', 'Draft', 'Draft'],
    [
      'submitted',
      request('submitted'),
      REVIEW_PENDING,
      NEEDS_ACTION,
      REVIEW_PENDING,
      REVIEW_PENDING,
    ],
    [
      'sent back by the reviewer',
      request('needs_action'),
      NEEDS_ACTION,
      NEEDS_ACTION,
      REVIEW_PENDING,
      REVIEW_PENDING,
    ],
    [
      'sent to the COR',
      request('awaiting_approval', null),
      COR_PENDING,
      COR_PENDING,
      NEEDS_ACTION,
      COR_PENDING,
    ],
    [
      'sent back by the COR',
      request('awaiting_approval', 'needs_action'),
      COR_PENDING,
      NEEDS_ACTION,
      PENDING_CHANGES,
      COR_PENDING,
    ],
    [
      'approved by the COR',
      request('approved', 'approved'),
      'Approved',
      'Approved',
      'Approved',
      'Approved',
    ],
  ])('reads a request %s as the matrix has it', (_, req, creator, reviewer, cor, other) => {
    expect(ttaRequestStatusLabel(req, CREATOR).label).toBe(creator);
    expect(ttaRequestStatusLabel(req, REVIEWER).label).toBe(reviewer);
    expect(ttaRequestStatusLabel(req, COR).label).toBe(cor);
    expect(ttaRequestStatusLabel(req, SOMEONE_ELSE).label).toBe(other);
  });

  it('flags only what waits on the viewing user', () => {
    expect(ttaRequestStatusLabel(request('submitted'), REVIEWER).needsAction).toBe(true);
    expect(ttaRequestStatusLabel(request('submitted'), CREATOR).needsAction).toBe(false);
    expect(ttaRequestStatusLabel(request('needs_action'), CREATOR).needsAction).toBe(true);
    // the reviewer sent it back, so it reads as needing action but awaits the creator
    expect(ttaRequestStatusLabel(request('needs_action'), REVIEWER).needsAction).toBe(false);
  });

  it('reads as pending review without a user', () => {
    expect(ttaRequestStatusLabel(request('needs_action'), null).label).toBe(REVIEW_PENDING);
  });

  it('falls back to the stored status it does not know', () => {
    expect(ttaRequestStatusLabel(request('something_new'), CREATOR).label).toBe('something_new');
  });
});
