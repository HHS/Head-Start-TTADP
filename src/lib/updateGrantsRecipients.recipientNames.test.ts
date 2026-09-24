import fs from 'mz/fs';
import xml2js from 'xml2js';
import { auditLogger, logger } from '../logger';
import db, { sequelize } from '../models';
import { processFiles, resolveRecipientNames } from './updateGrantsRecipients';

jest.mock('mz/fs', () => ({ readFile: jest.fn() }));
jest.mock('../logger', () => ({
  auditLogger: { error: jest.fn() },
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../models', () => {
  const model = () => {
    const result = {
      unscoped: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue([]),
      refresh: jest.fn().mockResolvedValue(undefined),
    };
    result.unscoped.mockReturnValue(result);
    return result;
  };
  return {
    Recipient: model(),
    Grant: model(),
    GrantRelationshipToActive: model(),
    GrantReplacements: model(),
    GrantReplacementTypes: model(),
    Group: model(),
    GroupGrant: model(),
    Program: model(),
    ProgramPersonnel: model(),
    sequelize: {
      transaction: jest.fn(async (callback) => callback({})),
      query: jest.fn().mockResolvedValue([]),
    },
  };
});

const nil = { $: { 'xsi:nil': 'true' } };
const { Grant, GrantReplacementTypes, Program, Recipient } = db;
const grant = (agencyId: number, name: unknown) => ({
  agency_id: String(agencyId),
  grantee_name: name,
});

describe('HSES recipient name resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Recipient.findAll.mockResolvedValue([]);
  });

  it.each([nil, '', '  ', undefined])(
    'preserves an existing name for invalid input %p',
    async (name) => {
      Recipient.findAll.mockResolvedValue([{ id: 1, name: 'Existing name' }]);
      const transaction = {};
      const result = await resolveRecipientNames(
        [
          { id: 1, name },
          { id: 2, name: 'Updated agency name' },
        ],
        [grant(1, 'Different grant name')],
        transaction
      );

      expect(result.recipientsForDb).toEqual([
        { id: 1, name: 'Existing name' },
        { id: 2, name: 'Updated agency name' },
      ]);
      expect(result.skippedRecipientIds.size).toBe(0);
      expect(Recipient.findAll).toHaveBeenCalledTimes(1);
      expect(Recipient.findAll).toHaveBeenCalledWith({
        attributes: ['id', 'name'],
        where: { id: [1] },
        transaction,
      });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('agency 1'));
    }
  );

  it('uses an agreed grant name for a new unnamed recipient', async () => {
    const result = await resolveRecipientNames(
      [{ id: 1, name: nil }],
      [grant(1, 'Grant name'), grant(1, ' Grant name '), grant(2, 'Other name')],
      {}
    );
    expect(result.recipientsForDb).toEqual([{ id: 1, name: 'Grant name' }]);
    expect(result.skippedRecipientIds.size).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('using grant name'));
  });

  it.each([
    [],
    [grant(1, nil)],
    [grant(1, 'One name'), grant(1, 'Different name')],
    [grant(1, 'One name'), grant(1, nil)],
  ])('skips a new unnamed recipient without an agreed fallback: %p', async (...grants) => {
    const result = await resolveRecipientNames(
      [
        { id: 1, name: nil },
        { id: 2, name: 'Valid name' },
      ],
      grants,
      {}
    );
    expect(result.recipientsForDb).toEqual([{ id: 2, name: 'Valid name' }]);
    expect(result.skippedRecipientIds).toEqual(new Set([1]));
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('agency 1'));
  });

  it('does not query existing recipients when all agency names are valid', async () => {
    const result = await resolveRecipientNames([{ id: 1, name: 'Updated name' }], [], {});
    expect(result.recipientsForDb).toEqual([{ id: 1, name: 'Updated name' }]);
    expect(Recipient.findAll).not.toHaveBeenCalled();
  });

  it('excludes an unresolved recipient and its grants, programs, and replacements from the import', async () => {
    const xml = (root: string, rows: object) =>
      new xml2js.Builder().buildObject({
        [root]: { $: { 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance' }, ...rows },
      });
    const files = {
      './temp/agency.xml': xml('agencies', {
        agency: [
          { agency_id: 1, agency_name: nil },
          { agency_id: 2, agency_name: 'Updated name' },
        ],
      }),
      './temp/grant_agency.xml': xml('grant_agencies', {
        grant_agency: [1, 2].map((id) => ({
          grant_agency_id: id,
          agency_id: id,
          grant_award_id: id,
          grant_agency_number: 0,
        })),
      }),
      './temp/grant_award.xml': xml('grant_awards', {
        grant_award: [1, 2].map((id) => ({
          ...grant(id, nil),
          grant_award_id: id,
          grant_number: `TEST${id}`,
          numeric_region_id: 1,
        })),
      }),
      './temp/grant_program.xml': xml('grant_programs', {
        grant_program: [1, 2].map((id) => ({
          grant_program_id: id,
          grant_agency_id: id,
          program_name: `Program ${id}`,
        })),
      }),
      './temp/grant_award_replacement.xml': xml('grant_award_replacements', {
        grant_award_replacement: [
          { replaced_grant_award_id: 1, replacement_grant_award_id: 2 },
          { replaced_grant_award_id: 2, replacement_grant_award_id: 1 },
        ],
      }),
    };
    jest.mocked(fs.readFile).mockImplementation(async (file) => {
      if (!(String(file) in files)) throw new Error(`Unexpected fixture: ${file}`);
      return Buffer.from(files[String(file)]);
    });

    await processFiles('synthetic-fixture');

    expect(Recipient.bulkCreate.mock.calls[0][0]).toEqual([
      expect.objectContaining({ id: 2, name: 'Updated name' }),
    ]);
    expect(Grant.bulkCreate.mock.calls.flatMap(([rows]) => rows)).toEqual([
      expect.objectContaining({ id: 2, recipientId: 2, granteeName: null }),
    ]);
    expect(Program.bulkCreate.mock.calls[0][0]).toEqual([
      expect.objectContaining({ id: 2, grantId: 2 }),
    ]);
    expect(GrantReplacementTypes.findOne).not.toHaveBeenCalled();
    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('agency 1'));
  });
});
