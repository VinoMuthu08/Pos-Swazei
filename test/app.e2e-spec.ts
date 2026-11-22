import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisCacheService } from '../src/common/cache/redis-cache.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    Object.assign(process.env, {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test?schema=public',
      JWT_SECRET: 'test-secret-at-least-10-characters',
      JWT_EXPIRES_IN: '1d',
      PORT: '3000',
      REDIS_URL: 'redis://localhost:6379',
      MOCK_PAYMENT_MODE: 'SUCCESS',
    });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(RedisCacheService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          success: true,
          statusCode: 200,
          data: 'Hello World!',
        });
      });
  });

  it('formats HTTP exceptions through the global filter', () => {
    return request(app.getHttpServer())
      .get('/not-a-route')
      .expect(404)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          success: false,
          statusCode: 404,
          path: '/not-a-route',
        });
      });
  });

  it('protects tenant routes without a bearer token', () => {
    return request(app.getHttpServer())
      .get('/products')
      .expect(401)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          success: false,
          statusCode: 401,
          path: '/products',
        });
      });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
