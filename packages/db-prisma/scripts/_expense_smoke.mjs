// TEMP smoke test for the Expenses feature — drives real HTTP endpoints, verifies in Postgres (raw pg), cleans up.
// Not committed. Deleted after running.
import { createRequire } from 'module'
import { readFileSync } from 'fs'
const require = createRequire(import.meta.url)

const envText = readFileSync(new URL('../.env', import.meta.url), 'utf8')
const dbUrl = envText.split(/\r?\n/).find(l => l.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '')
if (!dbUrl) throw new Error('DATABASE_URL not found in .env')

const { Pool } = require('pg')

const BASE = 'http://localhost:4040'
const TENANT = '00000000-0000-4000-a000-000000000001'
const CASHBOX_SYP = '00000000-0000-4000-ac00-000000000001'
const CURRENCY_SYP = '00000000-0000-4000-a300-000000000001'
const FISCAL_2026 = '00000000-0000-4000-a400-000000000001'
const ACCT_CASH = '00000000-0000-4000-a602-000000000001'
const ACCT_RENT = '00000000-0000-4000-a602-000000000018'
const AMOUNT = 50000

let pass = 0, fail = 0
const check = (name, cond, extra = '') => { if (cond) { pass++; console.log(`  PASS  ${name}`) } else { fail++; console.log(`  FAIL  ${name} ${extra}`) } }

const pool = new Pool({ connectionString: dbUrl })
const q = (text, params) => pool.query(text, params)
const bal = async () => Number((await q('SELECT balance FROM cashboxes WHERE id=$1', [CASHBOX_SYP])).rows[0].balance)
const lines = async (refType, refId) => (await q(
    `SELECT jl.account_id, jl.debit, jl.credit FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     WHERE je.tenant_id=$1 AND je.reference_type=$2 AND je.reference_id=$3`,
    [TENANT, refType, refId],
)).rows
const api = async (method, path, token, body) => {
    const res = await fetch(BASE + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    })
    let json = null; try { json = await res.json() } catch {}
    return { status: res.status, json }
}

const created = []
try {
    // 0a. Ensure cashbox is linked to the cash account (seed only runs on fresh DBs)
    await q('UPDATE cashboxes SET linked_account_id=$1 WHERE id=$2', [ACCT_CASH, CASHBOX_SYP])
    console.log('Set cashbox linked_account_id = cash account')

    // 0b. One-off data repair: advance JOURNAL_ENTRY sequence past existing entries
    // (seeded opening entry JE-00001 didn't bump the sequence; matches the seed fix).
    await q(
        `UPDATE document_sequences ds SET next_number = GREATEST(
            ds.next_number,
            (SELECT COALESCE(MAX(CAST(split_part(je.number,'-',2) AS INTEGER)), 0) + 1
             FROM journal_entries je WHERE je.tenant_id = ds.tenant_id)
         ) WHERE ds.tenant_id=$1 AND ds.document_type='JOURNAL_ENTRY'`,
        [TENANT],
    )
    console.log('Repaired JOURNAL_ENTRY sequence')

    // 1. Login
    const login = await api('POST', '/auth/login', null, { email: 'admin@demo-shop.com', password: 'admin123' })
    const token = login.json?.data?.accessToken
    check('login returns accessToken', !!token, `status=${login.status}`)
    if (!token) throw new Error('no token')

    const b0 = await bal()
    console.log(`cashbox balance B0 = ${b0}`)

    // 2. Create DRAFT expense
    const createRes = await api('POST', '/expenses', token, {
        date: '2026-06-10', cashboxId: CASHBOX_SYP, currencyId: CURRENCY_SYP, fiscalPeriodId: FISCAL_2026,
        notes: 'SMOKE', items: [{ accountId: ACCT_RENT, description: 'Smoke rent', amount: AMOUNT }],
    })
    const exp = createRes.json?.data
    check('create -> 201 + draft id', createRes.status === 201 && !!exp?.id && exp.status === 'DRAFT', `status=${createRes.status} ${JSON.stringify(createRes.json?.message || '')}`)
    if (!exp?.id) throw new Error('create failed')
    created.push(exp.id)
    check('create total = amount', Number(exp.totalAmount) === AMOUNT, `total=${exp.totalAmount}`)
    check('draft does NOT change balance', (await bal()) === b0)

    // 3. Post
    const postRes = await api('POST', `/expenses/${exp.id}/post`, token)
    check('post -> 200 POSTED', postRes.status === 200 && postRes.json?.data?.status === 'POSTED', `status=${postRes.status} ${JSON.stringify(postRes.json?.message || '')}`)
    check('post decrements balance by amount', (await bal()) === b0 - AMOUNT, `bal=${await bal()} expected=${b0 - AMOUNT}`)

    const jl = await lines('expense', exp.id)
    check('JE has 2 lines', jl.length === 2, `lines=${jl.length}`)
    const d = jl.reduce((s, l) => s + Number(l.debit), 0)
    const c = jl.reduce((s, l) => s + Number(l.credit), 0)
    check('JE balanced debits==credits==amount', d === c && d === AMOUNT, `d=${d} c=${c}`)
    const rent = jl.find(l => l.account_id === ACCT_RENT)
    const cash = jl.find(l => l.account_id === ACCT_CASH)
    check('rent line debited', rent && Number(rent.debit) === AMOUNT && Number(rent.credit) === 0)
    check('cash line credited', cash && Number(cash.credit) === AMOUNT && Number(cash.debit) === 0)

    // 4. Cancel
    const cancelRes = await api('POST', `/expenses/${exp.id}/cancel`, token)
    check('cancel -> 200 CANCELLED', cancelRes.status === 200 && cancelRes.json?.data?.status === 'CANCELLED', `status=${cancelRes.status}`)
    check('cancel restores balance to B0', (await bal()) === b0, `bal=${await bal()}`)
    const rl = await lines('expense_cancellation', exp.id)
    check('reversing entry created', rl.length === 2, `lines=${rl.length}`)
    const rd = rl.reduce((s, l) => s + Number(l.debit), 0)
    const rc = rl.reduce((s, l) => s + Number(l.credit), 0)
    check('reversal balanced', rd === rc && rd === AMOUNT, `d=${rd} c=${rc}`)
    const rcash = rl.find(l => l.account_id === ACCT_CASH)
    check('reversal debits cash (restores asset)', rcash && Number(rcash.debit) === AMOUNT)

    // 5. Delete guards
    const delPosted = await api('DELETE', `/expenses/${exp.id}`, token)
    check('DELETE on non-draft (cancelled) rejected 400', delPosted.status === 400, `status=${delPosted.status}`)

    const draft2 = await api('POST', '/expenses', token, {
        date: '2026-06-10', cashboxId: CASHBOX_SYP, currencyId: CURRENCY_SYP, fiscalPeriodId: FISCAL_2026,
        items: [{ accountId: ACCT_RENT, description: 'Smoke draft 2', amount: 100 }],
    })
    const d2id = draft2.json?.data?.id
    created.push(d2id)
    const delDraft = await api('DELETE', `/expenses/${d2id}`, token)
    check('DELETE on draft succeeds 200', delDraft.status === 200, `status=${delDraft.status}`)
    if (delDraft.status === 200) created.pop()
} catch (e) {
    fail++; console.log('  FAIL  EXCEPTION', e.message)
} finally {
    for (const id of created) {
        if (!id) continue
        await q('DELETE FROM journal_entries WHERE reference_id=$1', [id]).catch(() => {})
        await q('DELETE FROM expenses WHERE id=$1', [id]).catch(() => {})
    }
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    await pool.end()
    process.exit(fail ? 1 : 0)
}
