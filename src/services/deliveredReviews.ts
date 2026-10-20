import db from '../models';

const { DeliveredReview, DeliveredReviewCitation } = db;

export async function getCitationReviewTypes() {
  return (
    await DeliveredReview.findAll({
      raw: true,
      order: [['review_type', 'ASC']],
      attributes: ['review_type'],
      group: ['review_type'],
      include: [
        {
          model: DeliveredReviewCitation,
          as: 'deliveredReviewCitations',
          required: true,
          attributes: [],
        },
      ],
    })
  ).map(({ review_type }) => review_type);
}
