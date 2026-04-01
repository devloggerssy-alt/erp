import 'dotenv/config';
import { PrismaClient } from '../generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

prisma.$executeRaw`DELETE FROM tenants WHERE slug = 'demo-shop'`
    .then(n => console.log(`Deleted ${n} tenant row(s) (cascade removes all child records)`))
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect().then(() => pool.end()));
