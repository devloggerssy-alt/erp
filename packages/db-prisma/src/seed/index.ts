// Catalog Entity standard kind values (extensible — add more without migration):
// brand      → top-level manufacturer / brand (e.g. Hyundai, Apple, Pfizer)
// model      → a specific product model or drug (e.g. Sonata, iPhone 15)
// generation → a generation or series (e.g. LF, Pro Max)
// variant    → a specific variant / trim (e.g. 2.4 GDI, 256GB Black)
// year       → a model year (e.g. 2015, 2016, 2023)

import 'dotenv/config'
import { PrismaClient } from '../../generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { SEED_IDS } from './seed-ids'
import { seedTenant } from './seeds/tenant.seed'
import { seedRoles } from './seeds/roles.seed'
import { seedUsers } from './seeds/users.seed'
import { seedCurrencies } from './seeds/currencies.seed'
import { seedFiscalPeriod } from './seeds/fiscal-period.seed'
import { seedDocumentSequences } from './seeds/document-sequences.seed'
import { seedChartOfAccounts } from './seeds/chart-of-accounts.seed'
import { seedItemCategories } from './seeds/item-categories.seed'
import { seedUnits } from './seeds/units.seed'
import { seedItems } from './seeds/items.seed'
import { seedCustomFields } from './seeds/custom-fields.seed'
import { seedParties } from './seeds/parties.seed'
import { seedWarehouses } from './seeds/warehouses.seed'
import { seedCashboxes } from './seeds/cashboxes.seed'
import { seedInvoiceTypes } from './seeds/invoice-types.seed'
import { seedJournalEntry } from './seeds/journal-entry.seed'

async function main() {
    console.log('🚀 Starting database seeding...')

    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
        const existingTenant = await prisma.tenant.findUnique({ where: { id: SEED_IDS.TENANT } })
        if (existingTenant) {
            console.log('⏭️  Seed data already exists, skipping...')
            return
        }

        console.log('  → Creating tenant...')
        const tenantId = await seedTenant(prisma)

        console.log('  → Creating roles...')
        await seedRoles(prisma, tenantId)

        console.log('  → Creating users...')
        await seedUsers(prisma, tenantId)

        console.log('  → Creating currencies...')
        await seedCurrencies(prisma, tenantId)

        console.log('  → Creating fiscal period...')
        await seedFiscalPeriod(prisma, tenantId)

        console.log('  → Creating document sequences...')
        await seedDocumentSequences(prisma, tenantId)

        console.log('  → Building chart of accounts...')
        await seedChartOfAccounts(prisma, tenantId)

        console.log('  → Creating item categories...')
        await seedItemCategories(prisma, tenantId)

        console.log('  → Creating units...')
        await seedUnits(prisma, tenantId)

        console.log('  → Creating items...')
        await seedItems(prisma, tenantId)

        console.log('  → Creating custom fields...')
        await seedCustomFields(prisma, tenantId)

        console.log('  → Creating parties...')
        await seedParties(prisma, tenantId)

        console.log('  → Creating warehouses...')
        await seedWarehouses(prisma, tenantId)

        console.log('  → Creating cashboxes...')
        await seedCashboxes(prisma, tenantId)

        console.log('  → Creating invoice types...')
        await seedInvoiceTypes(prisma, tenantId)

        console.log('  → Creating opening journal entry...')
        await seedJournalEntry(prisma, tenantId)

        console.log('')
        console.log('✅ Seed completed successfully!')
    } catch (error) {
        console.error('❌ Seeding failed:', error)
        throw error
    } finally {
        await prisma.$disconnect()
        await pool.end()
    }
}

if (require.main === module) {
    main()
}

export const seed = main
