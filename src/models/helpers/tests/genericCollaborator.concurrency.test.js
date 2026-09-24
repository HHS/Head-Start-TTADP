import { GOAL_COLLABORATORS } from '../../../constants';
import db from '../../../models';
import { createGrant, createRecipient, createUser, getUniqueId } from '../../../testUtils';
import { findOrCreateCollaborator } from '../genericCollaborator';

const { sequelize, Goal, GoalCollaborator } = db;

describe('findOrCreateCollaborator concurrency', () => {
    let goal;
    let user;

    beforeAll(async () => {
        const recipient = await createRecipient();
        const grant = await createGrant({ recipientId: recipient.id });
        goal = await Goal.create({ grantId: grant.id, name: 'concurrency test goal' });
        user = await createUser();
    });

    afterAll(async () => {
        await GoalCollaborator.destroy({
            where: { goalId: goal.id },
            individualHooks: false,
            force: true,
        });
        await Goal.destroy({ where: { id: goal.id }, individualHooks: false, force: true });
        await sequelize.close();
    });

    afterEach(async () => {
        await GoalCollaborator.destroy({
            where: { goalId: goal.id },
            individualHooks: false,
            force: true,
        });
    });

    it('creates exactly one row and merges linkBack when two requests race', async () => {
        const reportIdA = getUniqueId();
        const reportIdB = getUniqueId();

        const [resultA, resultB] = await Promise.all([
            findOrCreateCollaborator(
                'goal',
                sequelize,
                null,
                goal.id,
                user.id,
                GOAL_COLLABORATORS.LINKER,
                { activityReportIds: [reportIdA] }
            ),
            findOrCreateCollaborator(
                'goal',
                sequelize,
                null,
                goal.id,
                user.id,
                GOAL_COLLABORATORS.LINKER,
                { activityReportIds: [reportIdB] }
            ),
        ]);

        const rows = await GoalCollaborator.findAll({
            where: { goalId: goal.id, userId: user.id },
        });

        expect(rows.length).toBe(1);
        expect(resultA).toBeDefined();
        expect(resultB).toBeDefined();

        // Neither concurrent linkBack merge should have clobbered the other's contribution.
        const finalLinkBack = rows[0].linkBack;
        expect(finalLinkBack.activityReportIds).toEqual(
            expect.arrayContaining([reportIdA, reportIdB])
        );
    });

    it('joins the caller-provided transaction instead of opening its own', async () => {
        const reportId = getUniqueId();

        await sequelize.transaction(async (transaction) => {
            const transactionSpy = jest.spyOn(sequelize, 'transaction');

            await findOrCreateCollaborator(
                'goal',
                sequelize,
                transaction,
                goal.id,
                user.id,
                GOAL_COLLABORATORS.LINKER,
                { activityReportIds: [reportId] }
            );

            // The only sequelize.transaction() call should be the create-attempt SAVEPOINT nested
            // under the caller's transaction, not a brand new top-level transaction.
            transactionSpy.mock.calls.forEach((call) => {
                expect(call[0]).toMatchObject({ transaction });
            });
            transactionSpy.mockRestore();
        });
    });
});
