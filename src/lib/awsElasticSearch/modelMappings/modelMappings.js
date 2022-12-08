// This object describes Explicit Mappings to be used when storing
// different Sequelize models in Elasticsearch. For more information about
// explicit mappings, refer to the ES documentation:
//   https://www.elastic.co/guide/en/elasticsearch/reference/current/explicit-mapping.html

// eslint-disable-next-line import/prefer-default-export
export const MODEL_MAPPINGS = {
  ActivityReport:
    {
      properties: {
        displayId: {
          type: 'keyword',
        },
        startDate: {
          type: 'date',
          format: 'MM/dd/yyyy',
        },
        endDate: {
          type: 'date',
          format: 'MM/dd/yyyy',
        },
        'goals.name': {
          type: 'text',
        },
        'goals.status': {
          type: 'keyword',
        },
        'goals.createdAt': {
          type: 'date',
        },
        'goals.updatedAt': {
          type: 'date',
        },
        'goals.objectives.title': {
          type: 'text',
        },
        'goals.objectives.ttaProvided': {
          type: 'text',
        },
        'goals.objectives.status': {
          type: 'keyword',
        },
      },
    },
};
