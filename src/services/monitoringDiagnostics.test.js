import { Op } from 'sequelize';

const mockFindAndCountAll = jest.fn();
const mockFindOne = jest.fn();
const mockSequelizeWhere = jest.fn();
const mockSequelizeLiteral = jest.fn();
const mockSequelizeEscape = jest.fn();

jest.mock('../models', () => ({
  Citation: {
    options: {
      paranoid: true,
    },
    rawAttributes: {
      id: { type: { key: 'INTEGER' } },
      deletedAt: { type: { key: 'DATE' } },
    },
    findAndCountAll: mockFindAndCountAll,
  },
  GrantDeliveredReview: {
    options: {
      paranoid: false,
    },
    rawAttributes: {
      id: { type: { key: 'INTEGER' } },
      grantId: { type: { key: 'INTEGER' } },
      deliveredReviewId: { type: { key: 'INTEGER' } },
      recipient_name: { type: { key: 'TEXT' } },
      region_id: { type: { key: 'INTEGER' } },
    },
    findAndCountAll: mockFindAndCountAll,
    findOne: mockFindOne,
  },
  MonitoringFindingStandard: {
    options: {
      paranoid: true,
    },
    rawAttributes: {
      id: { type: { key: 'INTEGER' } },
      findingId: { type: { key: 'TEXT' } },
      standardId: { type: { key: 'INTEGER' } },
      sourceDeletedAt: { type: { key: 'DATE' } },
      deletedAt: { type: { key: 'DATE' } },
    },
    findAndCountAll: mockFindAndCountAll,
    findOne: mockFindOne,
  },
  sequelize: {
    where: mockSequelizeWhere,
    literal: mockSequelizeLiteral,
    escape: mockSequelizeEscape,
  },
}));

describe('monitoringDiagnostics', () => {
  beforeEach(() => {
    jest.resetModules();
    mockFindAndCountAll.mockReset();
    mockFindOne.mockReset();
    mockSequelizeWhere.mockReset();
    mockSequelizeLiteral.mockReset();
    mockSequelizeEscape.mockReset();
    mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    mockFindOne.mockResolvedValue(null);
    mockSequelizeWhere.mockImplementation((literal, value) => ({ literal, value }));
    mockSequelizeLiteral.mockImplementation((value) => ({ type: 'literal', value }));
    mockSequelizeEscape.mockImplementation((value) => `'${String(value).replace(/'/g, "''")}'`);
  });

  it('falls back safely when filter, range, or sort are malformed JSON', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('grantDeliveredReviews', {
      filter: '{"recipient_name":"broken"value"}',
      range: '[bad json',
      sort: '[bad json',
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: {},
      order: [['id', 'ASC']],
      offset: 0,
      limit: 10,
    }));
  });

  it('falls back safely when range or sort JSON has the wrong shape', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('grantDeliveredReviews', {
      range: '{"start":2,"end":5}',
      sort: '{"field":"grantId","order":"DESC"}',
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      order: [['id', 'ASC']],
      offset: 0,
      limit: 10,
    }));
  });

  it('falls back safely when range contains non-numeric values', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('grantDeliveredReviews', {
      range: '["a","b"]',
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      offset: 0,
      limit: 10,
    }));
  });

  it('sanitizes string and integer filters for supported fields', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('grantDeliveredReviews', {
      filter: JSON.stringify({
        recipient_name: '  Acme_%  ',
        region_id: '7',
        grantId: 42,
      }),
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        recipient_name: {
          [Op.iLike]: '%Acme\\_\\%%',
        },
        region_id: 7,
        grantId: 42,
      },
    }));
  });

  it('drops object and malformed integer filters before querying', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('grantDeliveredReviews', {
      filter: JSON.stringify({
        recipient_name: { bad: 'value' },
        region_id: { foo: 'bar' },
        grantId: 'abc',
        deliveredReviewId: 4.5,
        id: 0,
      }),
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 0,
      },
    }));
  });

  it('builds the review name EXISTS predicate for auxiliary reviewName filters', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('citations', {
      filter: '{"reviewName":"  Example % Review  "}',
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        [Op.and]: expect.arrayContaining([
          {
            deletedAt: null,
          },
          {
            literal: {
              type: 'literal',
              value: expect.stringContaining('EXISTS ('),
            },
            value: true,
          },
        ]),
      },
    }));
  });

  it('normalizes sort fields and directions', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('grantDeliveredReviews', {
      sort: '["doesNotExist","desc"]',
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      order: [['id', 'DESC']],
    }));
  });

  it('normalizes inclusive and negative range boundaries', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('grantDeliveredReviews', {
      range: '[2,2]',
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      offset: 2,
      limit: 1,
    }));

    await monitoringDiagnostics('grantDeliveredReviews', {
      range: '[-5,-1]',
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      offset: 0,
      limit: 5,
    }));
  });

  it('throws for unsupported resources in list and detail lookups', async () => {
    const { monitoringDiagnostics, monitoringDiagnosticById } = await import('./monitoringDiagnostics');

    await expect(monitoringDiagnostics('missing-resource')).rejects.toThrow(
      'Unsupported monitoring diagnostic resource: missing-resource',
    );
    await expect(monitoringDiagnosticById('missing-resource', 1)).rejects.toThrow(
      'Unsupported monitoring diagnostic resource: missing-resource',
    );
  });

  it('caps the page size for oversized ranges', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('grantDeliveredReviews', {
      range: '[0,99999]',
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      offset: 0,
      limit: 1000,
    }));
  });

  it('defaults paranoid resources to active rows while querying with paranoid disabled', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('monitoringFindingStandards', {
      filter: '{"findingId":"abc-123"}',
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      paranoid: false,
      where: {
        [Op.and]: [
          {
            findingId: {
              [Op.iLike]: '%abc-123%',
            },
          },
          {
            deletedAt: null,
          },
        ],
      },
    }));
  });

  it('sanitizes auxiliary filters before passing them to resource-specific builders', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('citations', {
      filter: '{"reviewName":"  example review  "}',
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        [Op.and]: expect.arrayContaining([
          {
            deletedAt: null,
          },
          {
            literal: {
              type: 'literal',
              value: expect.stringContaining("mr.name ILIKE '%example review%' ESCAPE"),
            },
            value: true,
          },
        ]),
      },
    }));
    expect(mockSequelizeEscape).toHaveBeenCalledWith('%example review%');
  });

  it('flattens Op.and clauses returned by Sequelize where helpers', async () => {
    mockSequelizeWhere.mockImplementationOnce((literal, value) => ({
      [Op.and]: [{ literal, value }],
    }));
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('citations', {
      filter: '{"reviewName":"Example"}',
    });

    const { where } = mockFindAndCountAll.mock.calls[0][0];

    expect(where[Op.and]).toEqual(expect.arrayContaining([
      {
        literal: {
          type: 'literal',
          value: expect.stringContaining('EXISTS ('),
        },
        value: true,
      },
      {
        deletedAt: null,
      },
    ]));
    expect(where[Op.and].some((clause) => Array.isArray(clause[Op.and]))).toBe(false);
  });

  it('supports filtering paranoid resources to deleted rows only', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('monitoringFindingStandards', {
      filter: '{"findingId":"abc-123","deletedStatus":"deleted"}',
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      paranoid: false,
      where: {
        [Op.and]: [
          {
            findingId: {
              [Op.iLike]: '%abc-123%',
            },
          },
          {
            deletedAt: {
              [Op.ne]: null,
            },
          },
        ],
      },
    }));
  });

  it('supports filtering source-deleted rows without being canceled out by default deleted filtering', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('monitoringFindingStandards', {
      filter: '{"findingId":"abc-123","sourceDeletedStatus":"deleted"}',
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      paranoid: false,
      where: {
        [Op.and]: [
          {
            findingId: {
              [Op.iLike]: '%abc-123%',
            },
          },
          {
            sourceDeletedAt: {
              [Op.ne]: null,
            },
          },
        ],
      },
    }));
  });

  it('looks up paranoid rows by id with paranoid disabled', async () => {
    const { monitoringDiagnosticById } = await import('./monitoringDiagnostics');

    await monitoringDiagnosticById('monitoringFindingStandards', 42);

    expect(mockFindOne).toHaveBeenCalledWith(expect.objectContaining({
      paranoid: false,
      where: {
        id: 42,
      },
    }));
  });

  it('looks up non-paranoid rows by id', async () => {
    const { monitoringDiagnosticById } = await import('./monitoringDiagnostics');

    await monitoringDiagnosticById('grantDeliveredReviews', 7);

    expect(mockFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 7,
      },
    }));
  });
});
