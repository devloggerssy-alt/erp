import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: Joi.number().port().default(4040),
    DATABASE_URL: Joi.string().required(),
    JWT_ACCESS_SECRET: Joi.string().required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().default('24h'),
    JWT_REFRESH_SECRET: Joi.string().optional(),
    JWT_REFRESH_EXPIRES_IN: Joi.string().optional(),
    BCRYPT_SALT_ROUNDS: Joi.number().default(10),
    BASE_DOMAIN: Joi.string().optional().default('localhost'),
});

