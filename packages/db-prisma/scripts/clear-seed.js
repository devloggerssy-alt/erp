require('../node_modules/dotenv/config');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("DELETE FROM tenants WHERE slug = 'demo-shop'")
    .then(r => { console.log('Deleted', r.rowCount, 'tenant row(s) + all cascade records'); })
    .catch(e => console.error(e))
    .finally(() => pool.end());
