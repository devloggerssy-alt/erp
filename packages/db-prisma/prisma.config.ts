import { defineConfig } from '@prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: 'src/schema',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
