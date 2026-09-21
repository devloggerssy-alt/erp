import 'dotenv/config'
import { PrismaClient } from '../generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const KATTAN = '291898b2-e2be-46a5-941a-bf91d1347f61'
const n = (ar: string, en: string) => ({ ar, en })

const UNITS = [
    { name: n('قطعة', 'Piece'), abbreviation: 'pcs' },
    { name: n('كيلوغرام', 'Kilogram'), abbreviation: 'kg' },
    { name: n('لتر', 'Liter'), abbreviation: 'L' },
    { name: n('متر', 'Meter'), abbreviation: 'm' },
    { name: n('علبة', 'Box'), abbreviation: 'box' },
    { name: n('دزينة', 'Dozen'), abbreviation: 'doz' },
    { name: n('حزمة', 'Pack'), abbreviation: 'pack' },
]

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
    const existing = await prisma.unit.count({ where: { tenantId: KATTAN } })
    if (existing > 0) {
        console.log(`kattan already has ${existing} unit(s) — creating nothing.`)
        return
    }

    const result = await prisma.unit.createMany({
        data: UNITS.map((u) => ({ tenantId: KATTAN, ...u })),
    })
    console.log(`created ${result.count} units for kattan`)

    const units = await prisma.unit.findMany({
        where: { tenantId: KATTAN },
        select: { name: true, abbreviation: true },
        orderBy: { createdAt: 'asc' },
    })
    for (const u of units) console.log(`  ${JSON.stringify(u.name)} | ${u.abbreviation}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect().then(() => pool.end()))
