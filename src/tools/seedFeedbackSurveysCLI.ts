import db from '../models';
import { auditLogger } from '../logger';

const DEFAULT_MONTHS = 6;
const DEFAULT_ROWS_PER_MONTH = 120;

const PAGE_IDS = [
  'qa-dashboard',
  'activity-reports',
  'recipient-record',
  'regional-dashboard',
  'training-reports',
  'goals-and-objectives',
];

const POSITIVE_COMMENTS = [
  'Very helpful page.',
  'Easy to use and clear.',
  'Found what I needed quickly.',
  'Great experience.',
  'This worked well for my workflow.',
];

const IMPROVEMENT_COMMENTS = [
  'Navigation was confusing.',
  'Could load faster.',
  'Hard to find the right filter.',
  'Needs clearer labels.',
  'I expected different results.',
];

type SeedOptions = {
  months: number;
  rowsPerMonth: number;
};

type RoleRow = {
  name?: string;
  fullName?: string;
};

type UserSeedRow = {
  id: number;
  homeRegionId?: number | null;
  roles?: RoleRow[];
};

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomDateInMonth(year: number, monthIndex: number): Date {
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  const span = end.getTime() - start.getTime();
  return new Date(start.getTime() + Math.floor(Math.random() * span));
}

function getOptions(): SeedOptions {
  const monthsArg = process.argv[2];
  const rowsPerMonthArg = process.argv[3];

  const parsedMonths = monthsArg ? Number(monthsArg) : DEFAULT_MONTHS;
  const parsedRowsPerMonth = rowsPerMonthArg ? Number(rowsPerMonthArg) : DEFAULT_ROWS_PER_MONTH;

  const months = Number.isFinite(parsedMonths) && parsedMonths > 0
    ? Math.floor(parsedMonths)
    : DEFAULT_MONTHS;

  const rowsPerMonth = Number.isFinite(parsedRowsPerMonth) && parsedRowsPerMonth > 0
    ? Math.floor(parsedRowsPerMonth)
    : DEFAULT_ROWS_PER_MONTH;

  return { months, rowsPerMonth };
}

async function seedFeedbackSurveys() {
  const { sequelize } = db;
  const { User, FeedbackSurvey } = sequelize.models;
  const { months, rowsPerMonth } = getOptions();

  if (!User || !FeedbackSurvey) {
    throw new Error('Cannot seed feedback surveys: required models are not loaded.');
  }

  const users = await User.findAll({
    attributes: ['id', 'homeRegionId'],
    include: [{
      model: db.Role,
      as: 'roles',
      attributes: ['name', 'fullName'],
      through: { attributes: [] },
      required: false,
    }],
    limit: 200,
    order: [['id', 'ASC']],
  }) as UserSeedRow[];

  if (!users.length) {
    throw new Error('Cannot seed feedback surveys: no users found. Run db seeds first (yarn db:seed).');
  }

  const now = new Date();
  const rows = Array.from({ length: months }).flatMap((_, monthOffset) => {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthOffset, 1));

    return Array.from({ length: rowsPerMonth }).map(() => {
      const submittedAt = randomDateInMonth(monthDate.getUTCFullYear(), monthDate.getUTCMonth());
      const user = randomItem(users);
      const thumbs = Math.random() < 0.7 ? 'yes' : 'no';
      const roleNames = (user.roles || [])
        .map((role) => role.fullName || role.name)
        .filter(Boolean) as string[];

      return {
        regionId: user.homeRegionId || null,
        userRoles: roleNames,
        pageId: randomItem(PAGE_IDS),
        thumbs,
        rating: thumbs === 'yes' ? 10 : 1,
        comment: thumbs === 'yes' ? randomItem(POSITIVE_COMMENTS) : randomItem(IMPROVEMENT_COMMENTS),
        submittedAt,
        createdAt: submittedAt,
        updatedAt: submittedAt,
      };
    });
  });

  await FeedbackSurvey.bulkCreate(rows);

  auditLogger.info('Dummy feedback surveys seeded', {
    rowsInserted: rows.length,
    months,
    rowsPerMonth,
    userPoolSize: users.length,
  });

  await sequelize.close();
}

if (require.main === module) {
  seedFeedbackSurveys()
    .then(() => process.exit(0))
    .catch(async (error) => {
      auditLogger.error(error);
      await db.sequelize.close();
      process.exit(1);
    });
}

export default seedFeedbackSurveys;
