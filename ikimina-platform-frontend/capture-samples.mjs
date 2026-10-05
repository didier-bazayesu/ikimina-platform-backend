// capture-samples.mjs
// Runs one full scenario against your LOCAL backend and saves every raw response
// to samples/api-samples.json, with tokens and passwords redacted.
//
// WARNING: this writes test data (a member, obligations for several months for
// every member, contributions, penalties). Run it against a development database only.
//
// Usage (Node 18 or newer):
//   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret node capture-samples.mjs
// Optional: API_URL=http://localhost:3000

import { mkdir, writeFile } from 'node:fs/promises'

const BASE = process.env.API_URL ?? 'http://localhost:3000'
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD first.')
  process.exit(1)
}

const stamp = Date.now()
const today = new Date().toISOString().slice(0, 10)
const MEMBER_PASSWORD = 'Sample@12345'
const NEW_PASSWORD = 'Sample@98765'
const samples = {}

// ---------- helpers ----------
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g

// Redact secrets and keep only the first 3 items of any array.
function clean(value) {
  if (Array.isArray(value)) return value.slice(0, 3).map(clean)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, /password/i.test(k) ? '<redacted>' : clean(v)]),
    )
  }
  return typeof value === 'string' ? value.replace(JWT, '<jwt>') : value
}

// Peel the { success, data, message } wrappers.
function unwrap(v) {
  while (v && typeof v === 'object' && !Array.isArray(v) && 'data' in v) v = v.data
  return v
}

function itemsOf(data) {
  const u = unwrap(data)
  return Array.isArray(u) ? u : (u?.items ?? [])
}

function findId(v) {
  if (v && typeof v === 'object') {
    if (typeof v.id === 'string') return v.id
    for (const x of Object.values(v)) {
      const found = findId(x)
      if (found) return found
    }
  }
  return undefined
}

function findUrl(v) {
  if (typeof v === 'string') return /^https?:\/\/\S+\/uploads\/\S+/.test(v) ? v : undefined
  if (v && typeof v === 'object') {
    for (const x of Object.values(v)) {
      const found = findUrl(x)
      if (found) return found
    }
  }
  return undefined
}

function monthsAgo(n) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - n)
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

const pad = (n) => String(n).padStart(2, '0')
const phone = (n) => `+2507${String(stamp + n).slice(-8)}`

// 1x1 PNG used as fake proof of payment.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
const fileBlob = () => new Blob([PNG], { type: 'image/png' })

async function call(name, method, path, { token, json, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let body
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (form) {
    body = form
  }

  let status = 0
  let data
  try {
    const res = await fetch(BASE + path, { method, headers, body })
    status = res.status
    const type = res.headers.get('content-type') ?? ''
    const buf = Buffer.from(await res.arrayBuffer())
    if (type.includes('json')) {
      try {
        data = JSON.parse(buf.toString('utf8'))
      } catch {
        data = buf.toString('utf8').slice(0, 400)
      }
    } else if (type.startsWith('text/')) {
      data = buf.toString('utf8').slice(0, 400)
    } else {
      data = `<${type || 'no content-type'}, ${buf.length} bytes>`
    }
  } catch (err) {
    data = `NETWORK ERROR: ${err.message}`
  }

  samples[name] = {
    request: `${method} ${path}`,
    ...(json !== undefined ? { requestBody: clean(json) } : {}),
    ...(form ? { requestBody: '<multipart form>' } : {}),
    status,
    response: clean(data),
  }
  console.log(`${String(status).padEnd(4)} ${name}`)
  return { status, data }
}

async function step(label, fn) {
  try {
    await fn()
  } catch (err) {
    console.log(`SKIP ${label}: ${err.message}`)
  }
}

async function save() {
  await mkdir('samples', { recursive: true })
  await writeFile(
    'samples/api-samples.json',
    JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE, samples }, null, 2),
  )
  console.log(`\nSaved ${Object.keys(samples).length} samples to samples/api-samples.json`)
}

// ---------- scenario ----------
let A // admin access token
let M // member access token
let memberRefresh
let memberId
const memberEmail = `sample.${stamp}@example.com`

// 1. Admin session and auth errors
await step('admin login', async () => {
  const r = await call('auth.login.admin', 'POST', '/auth/login', {
    json: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  const d = unwrap(r.data)
  A = d?.accessToken
  if (d?.refreshToken) {
    await call('auth.refresh', 'POST', '/auth/refresh', { json: { refreshToken: d.refreshToken } })
  }
})

if (!A) {
  console.error('Admin login failed. Check ADMIN_EMAIL, ADMIN_PASSWORD and that the backend is running.')
  await save()
  process.exit(1)
}

await step('auth errors', async () => {
  await call('errors.401.login_wrong_password', 'POST', '/auth/login', {
    json: { email: ADMIN_EMAIL, password: 'wrong-password-123' },
  })
  await call('errors.400.login_missing_fields', 'POST', '/auth/login', { json: {} })
  await call('errors.401.no_token', 'GET', '/members/me')
})

// 2. Create a sample member who joined 3 months ago, then log in as them
const joined = monthsAgo(3)
await step('create member', async () => {
  const r = await call('members.create', 'POST', '/members', {
    token: A,
    json: {
      email: memberEmail,
      phone: phone(0),
      fullName: 'Sample Member',
      password: MEMBER_PASSWORD,
      nationalId: `1${stamp}00`,
      address: 'KG 123 St, Kigali',
      joinedDate: `${joined.year}-${pad(joined.month)}-01`,
    },
  })
  memberId = findId(r.data)
  const l = await call('auth.login.member', 'POST', '/auth/login', {
    json: { email: memberEmail, password: MEMBER_PASSWORD },
  })
  const d = unwrap(l.data)
  M = d?.accessToken
  memberRefresh = d?.refreshToken
})

// 3. Generate obligations (2 and 1 months ago, this month, next month) and penalties
await step('generate obligations and penalties', async () => {
  for (const n of [2, 1, 0, -1]) {
    const { month, year } = monthsAgo(n)
    await call(
      `obligations.generate.${year}-${pad(month)}`,
      'POST',
      `/monthly-obligations/generate-test?month=${month}&year=${year}`,
      { token: A },
    )
  }
  await call('penalties.generate', 'POST', '/penalties/generate-test', { token: A })
})

if (M) {
  let unpaid = []
  let unpaidPens = []

  // 4. Member reads
  await step('member reads', async () => {
    await call('members.me', 'GET', '/members/me', { token: M })
    const o = await call('obligations.me', 'GET', '/monthly-obligations/me', { token: M })
    unpaid = itemsOf(o.data).filter((x) => x.status === 'UNPAID')
    await call('obligations.me.overdue', 'GET', '/monthly-obligations/me?overdue=true', { token: M })
    const p = await call('penalties.me', 'GET', '/penalties/me?limit=20', { token: M })
    unpaidPens = itemsOf(p.data).filter((x) => x.status === 'UNPAID')
    await call('dashboards.member.before', 'GET', '/dashboards/member', { token: M })
  })

  // 5. Contributions: submit two, approve one, reject one, plus error cases
  await step('contributions', async () => {
    if (!unpaid[0]) throw new Error('member has no UNPAID obligation')

    const contributionForm = (ob, proofUrl) => {
      const f = new FormData()
      f.append('obligationIds', ob.id)
      f.append('amount', String(ob.amount ?? 25000))
      f.append('paymentDate', today)
      f.append('method', 'MOMO')
      f.append('reference', `SAMPLE${stamp}`)
      if (proofUrl) f.append('proofUrl', proofUrl)
      f.append('notes', 'sample payment')
      return f
    }

    const up = new FormData()
    up.append('file', fileBlob(), 'proof.png')
    const upload = await call('uploads.proof', 'POST', '/uploads/proof', { token: M, form: up })
    const proofUrl = findUrl(upload.data)

    const p1 = await call('contributions.submit', 'POST', '/contribution-payments', {
      token: M,
      form: contributionForm(unpaid[0], proofUrl),
    })
    const id1 = findId(p1.data)

    let id2
    if (unpaid[1]) {
      const p2 = await call('contributions.submit_second', 'POST', '/contribution-payments', {
        token: M,
        form: contributionForm(unpaid[1], proofUrl),
      })
      id2 = findId(p2.data)
    }

    await call('contributions.me.pending', 'GET', '/contribution-payments/me?limit=5', { token: M })
    await call('contributions.admin.list_pending', 'GET', '/contribution-payments?status=PENDING&limit=3', {
      token: A,
    })
    if (id1) await call('contributions.approve', 'PATCH', `/contribution-payments/${id1}/approve`, { token: A })
    if (id2) {
      await call('contributions.reject', 'PATCH', `/contribution-payments/${id2}/reject`, {
        token: A,
        json: { reason: 'Sample rejection: unreadable proof' },
      })
    }
    await call('contributions.me.after', 'GET', '/contribution-payments/me?limit=5', { token: M })

    await call('errors.409.pay_already_paid', 'POST', '/contribution-payments', {
      token: M,
      form: contributionForm(unpaid[0], proofUrl),
    })
    await call('errors.400.contribution_missing_fields', 'POST', '/contribution-payments', {
      token: M,
      form: new FormData(),
    })
    await call('errors.403.member_calls_admin_endpoint', 'GET', '/contribution-payments', { token: M })
  })

  // 6. Penalty payments: submit without a file, then with a file; approve, reject, waive
  await step('penalty payments', async () => {
    if (!unpaidPens[0]) throw new Error('member has no UNPAID penalty (penalties.generate may not have created one)')

    const penaltyForm = (pen, withFile) => {
      const f = new FormData()
      f.append('penaltyId', pen.id)
      f.append('amount', String(pen.amount ?? 2000))
      f.append('paymentDate', today)
      f.append('method', 'MOMO')
      f.append('reference', `PEN${stamp}`)
      f.append('notes', 'sample penalty payment')
      if (withFile) f.append('file', fileBlob(), 'proof.png')
      return f
    }

    const q1 = await call('penaltyPayments.submit_no_file', 'POST', '/penalty-payments', {
      token: M,
      form: penaltyForm(unpaidPens[0], false),
    })
    const id1 = findId(q1.data)

    let id2
    if (unpaidPens[1]) {
      const q2 = await call('penaltyPayments.submit_with_file', 'POST', '/penalty-payments', {
        token: M,
        form: penaltyForm(unpaidPens[1], true),
      })
      id2 = findId(q2.data)
    }

    await call('penaltyPayments.me.pending', 'GET', '/penalty-payments/me?limit=5', { token: M })
    await call('penaltyPayments.admin.list_pending', 'GET', '/penalty-payments?status=PENDING&limit=3', {
      token: A,
    })
    if (id1) await call('penaltyPayments.approve', 'PATCH', `/penalty-payments/${id1}/approve`, { token: A })
    if (id2) {
      await call('penaltyPayments.reject', 'PATCH', `/penalty-payments/${id2}/reject`, {
        token: A,
        json: { reason: 'Sample rejection: reference does not match' },
      })
    }
    await call('penalties.me.after', 'GET', '/penalties/me?limit=20', { token: M })

    const used = unpaidPens.slice(0, 2).map((p) => p.id)
    const others = await call('penalties.admin.list_unpaid', 'GET', '/penalties?status=UNPAID&limit=5', { token: A })
    const target = itemsOf(others.data).find((p) => !used.includes(p.id))
    if (target) await call('penalties.waive', 'PATCH', `/penalties/${target.id}/waive`, { token: A })
  })

  // 7. Money, statements, notifications
  await step('money and notifications', async () => {
    await call('transactions.balance.member', 'GET', '/transactions/balance', { token: M })
    await call('transactions.member', 'GET', '/transactions?limit=5', { token: M })
    await call('statements.me', 'GET', '/statements/me', { token: M })
    await call('dashboards.member.after', 'GET', '/dashboards/member', { token: M })
    const n = await call('notifications.me', 'GET', '/notifications/me?limit=5', { token: M })
    const nid = itemsOf(n.data)[0]?.id
    if (nid) await call('notifications.mark_read', 'PATCH', `/notifications/me/${nid}/read`, { token: M })
  })

  // 8. Profile updates and password change / logout
  await step('profile and account', async () => {
    await call('members.update_me', 'PATCH', '/members/me', { token: M, json: { address: 'KG 789 St, Kigali' } })
    await call('auth.change_password', 'POST', '/auth/change-password', {
      token: M,
      json: { currentPassword: MEMBER_PASSWORD, newPassword: NEW_PASSWORD },
    })
    if (memberRefresh) {
      await call('auth.logout', 'POST', '/auth/logout', { token: M, json: { refreshToken: memberRefresh } })
    }
  })
}

// 9. Admin reads
await step('admin reads', async () => {
  const reads = [
    ['members.list', '/members?limit=3'],
    ['systemSettings.get', '/system-settings'],
    ['dashboards.admin', '/dashboards/admin'],
    ['transactions.balance.admin', '/transactions/balance'],
    ['transactions.admin', '/transactions?limit=5'],
    ['obligations.admin.list', `/monthly-obligations?limit=5${memberId ? `&memberId=${memberId}` : ''}`],
    ['penalties.admin.list', '/penalties?limit=3'],
    ['penaltyPayments.admin.list', '/penalty-payments?limit=3'],
    ['withdrawals.list', '/withdrawals?limit=3'],
    ['auditLogs.list', '/audit-logs?page=1&limit=3'],
    ['reports.contributions.default', '/reports/contributions'],
    ['reports.contributions.json', '/reports/contributions?format=json'],
    ['reports.penalties.default', '/reports/penalties'],
    ['reports.penalties.json', '/reports/penalties?format=json'],
    ['reports.defaulters.default', '/reports/defaulters'],
    ['reports.withdrawals.default', '/reports/withdrawals'],
    ['reports.withdrawals.json', '/reports/withdrawals?format=json'],
    ['reports.financialSummary.default', '/reports/financial-summary'],
    ['reports.financialSummary.json', '/reports/financial-summary?format=json'],
  ]
  for (const [name, path] of reads) await call(name, 'GET', path, { token: A })
})

// 10. Admin member management, duplicate/validation errors, suspended login
if (memberId) {
  await step('admin member management', async () => {
    await call('members.get_by_id', 'GET', `/members/${memberId}`, { token: A })
    await call('members.update', 'PATCH', `/members/${memberId}`, { token: A, json: { address: 'KG 456 St, Kigali' } })
    await call('errors.400.member_missing_email', 'POST', '/members', { token: A, json: { fullName: 'No Email' } })
    await call('errors.409.member_duplicate_email', 'POST', '/members', {
      token: A,
      json: { email: memberEmail, phone: phone(1), fullName: 'Duplicate', password: MEMBER_PASSWORD },
    })
    await call('members.status.suspend', 'PATCH', `/members/${memberId}/status`, {
      token: A,
      json: { status: 'SUSPENDED', reason: 'Sample suspension' },
    })
    await call('errors.403.login_suspended', 'POST', '/auth/login', {
      json: { email: memberEmail, password: NEW_PASSWORD },
    })
    await call('members.status.reactivate', 'PATCH', `/members/${memberId}/status`, {
      token: A,
      json: { status: 'ACTIVE' },
    })
  })
}

await save()
