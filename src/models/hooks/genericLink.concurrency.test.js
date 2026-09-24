import db from '../../models';
import { getUniqueId } from '../../testUtils';
import { syncLink } from './genericLink';

const { sequelize, MonitoringReviewLink } = db;

describe('syncLink concurrency', () => {
    afterAll(async () => {
        await sequelize.close();
    });

    it('creates exactly one link row when two instances race on the same entityId', async () => {
        const reviewId = `concurrency-test-${getUniqueId()}`;
        const callback = jest.fn().mockResolvedValue();

        const makeInstance = () => ({
            isNewRecord: true,
            changed: jest.fn().mockReturnValue(['reviewId']),
        });

        await Promise.all([
            syncLink(
                sequelize,
                makeInstance(),
                {},
                MonitoringReviewLink,
                'reviewId',
                'reviewId',
                reviewId,
                callback
            ),
            syncLink(
                sequelize,
                makeInstance(),
                {},
                MonitoringReviewLink,
                'reviewId',
                'reviewId',
                reviewId,
                callback
            ),
        ]);

        const rows = await MonitoringReviewLink.findAll({ where: { reviewId } });
        expect(rows.length).toBe(1);
        // Only the caller that actually inserts the row should trigger the callback.
        expect(callback).toHaveBeenCalledTimes(1);

        await MonitoringReviewLink.destroy({
            where: { reviewId },
            individualHooks: false,
            force: true,
        });
    });
});
