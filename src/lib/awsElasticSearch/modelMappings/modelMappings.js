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
        context: {
          type: 'text',
        },
      },
    },
};
