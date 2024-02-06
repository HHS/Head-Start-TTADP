import express from 'express';
import authMiddleware from '../../middleware/authMiddleware';
// import openapiSpecification from "../../app";


const router = express.Router();

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Swagger definition
// You can set every attribute except paths and swagger
// https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md
// const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = {
  info: {
    // API informations (required)
    title: 'Hello World', // Title (required)
    version: '1.0.0', // Version (required)
    description: 'A sample API', // Description (optional)
  },
  // servers: [
  //   {
  //     url: 'http://localhost:8080',
  //     description: 'Development server',
  //   },
  // ],
};

// Options for the swagger docs
const options = {
  // Import swaggerDefinitions
  swaggerDefinition,
  // Path to the API docs
  // Note that this path is relative to the current directory from which the Node.js is ran, not the application itself.
  apis: ['./src/routes/index.js', './src/routes/index.ts'],
};

// Initialize swagger-jsdoc -> returns validated swagger spec in json format
const openapiSpecification = swaggerJsdoc(options);

router.use('/api/api-docs', authMiddleware, swaggerUi.serve, swaggerUi.setup(openapiSpecification));
/**
 * @openapi
 * /:
 *   get:
 *     description: Welcome to swagger-jsdoc!
 *     responses:
 *       200:
 *         description: Returns a mysterious string.
 */
// router.get('/api/api-docs', authMiddleware, swaggerUi.setup(openapiSpecification));

export default router;
