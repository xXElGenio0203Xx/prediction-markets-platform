// src/plugins/swagger.ts
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { config } from '../config.js';

const swaggerPlugin: FastifyPluginAsync = async (server) => {
  await server.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Prediction Market API',
        description: 'Production-ready prediction market backend API',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${config.PORT}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'accessToken',
          },
        },
      },
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'markets', description: 'Market management' },
        { name: 'orders', description: 'Order and trading' },
        { name: 'user', description: 'User account management' },
      ],
    },
  });

  await server.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  server.log.info('Swagger documentation available at /docs');
};

export default fp(swaggerPlugin, {
  name: 'swagger',
});
