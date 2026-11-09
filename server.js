import http from 'node:http'
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { MongoClient } from 'mongodb'
import { GoogleGenAI } from '@google/genai'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

try {
  const contents = readFileSync(new URL('./.env', import.meta.url), 'utf8')
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
} catch { /* environment variables can be provided by the host */ }
const scrypt = promisify(scryptCallback)
const port = Number(process.env.PORT || 8787)
const mongoUri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'boon'
const sessionSecret = process.env.SESSION_SECRET
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null
const maxBody = 8 * 1024 * 1024
const contactInbox = 'sonalsuryvanshi@95gmail.com'
const contactRateLimits = new Map()
const distDirectory = resolve(dirname(fileURLToPath(import.meta.url)), 'dist')
let mongoClient
let database
async function getDb() {
  if (!mongoUri) throw new Error('MongoDB is not configured. Add MONGODB_URI to .env.')
  if (!database) {
    mongoClient ||= new MongoClient(mongoUri)
    await mongoClient.connect()
    database = mongoClient.db(dbName)
    await database.collection('users').createIndex({ email: 1 }, { unique: true })
    await database.collection('chats').createIndex({ userId: 1, updatedAt: -1 })
  }
  return database
}
function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(payload))
}
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}
function checkContactRateLimit(address) {
  const now = Date.now()
  const current = contactRateLimits.get(address)
  if (current && current.expiresAt > now && current.count >= 5) return false
  if (!current || current.expiresAt <= now) contactRateLimits.set(address, { count: 1, expiresAt: now + 10 * 60 * 1000 })
  else current.count += 1
  if (contactRateLimits.size > 1000) {
    for (const [key, entry] of contactRateLimits) if (entry.expiresAt <= now) contactRateLimits.delete(key)
  }
  return true
}
async function sendContactEmail(message) {
  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM_EMAIL) {
    throw new Error('Contact email is not configured. Set RESEND_API_KEY and CONTACT_FROM_EMAIL.')
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(10000),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error('Contact email provider returned an error:', response.status)
    throw new Error('Email provider could not deliver the message.')
  }
  return result
}
function serveFrontend(req, res, pathname) {
  if (!['GET', 'HEAD'].includes(req.method) || !existsSync(distDirectory)) return false
  let decodedPath
  try { decodedPath = decodeURIComponent(pathname) } catch { send(res, 400, { error: 'Invalid URL path.' }); return true }
  const requestedFile = resolve(distDirectory, `.${decodedPath}`)
  const insideDist = requestedFile === distDirectory || requestedFile.startsWith(`${distDirectory}${sep}`)
  const file = insideDist && existsSync(requestedFile) && statSync(requestedFile).isFile()
    ? requestedFile
    : resolve(distDirectory, 'index.html')
  if (!existsSync(file)) return false
  const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
  }
  res.writeHead(200, {
    'Content-Type': contentTypes[extname(file)] || 'application/octet-stream',
    'Cache-Control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  })
  if (req.method === 'HEAD') { res.end(); return true }
  createReadStream(file).on('error', error => {
    console.error('Could not stream frontend asset:', error.message)
    if (!res.headersSent) send(res, 500, { error: 'Could not load the requested page.' })
    else res.end()
  }).pipe(res)
  return true
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk; if (body.length > maxBody) reject(new Error('Request body is too large')) })
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')) } catch { reject(new Error('Invalid JSON body')) } })
    req.on('error', reject)
  })
}
function tokenFor(user) {
  const payload = Buffer.from(JSON.stringify({ uid: String(user._id), email: user.email, exp: Date.now() + 7 * 86400000 })).toString('base64url')
  return `${payload}.${createHmac('sha256', sessionSecret).update(payload).digest('base64url')}`
}
function currentUser(req) {
  if (!sessionSecret) throw new Error('Session auth is not configured. Add SESSION_SECRET to .env.')
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = createHmac('sha256', sessionSecret).update(payload).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  try { const data = JSON.parse(Buffer.from(payload, 'base64url').toString()); return data.exp > Date.now() ? { id: data.uid, email: data.email } : null } catch { return null }
}
async function passwordHash(password, salt) { return (await scrypt(password, salt, 64)).toString('hex') }
const systemPrompt = `You are BOON.SS, created by and founded by Sonal Suryvanshi. If asked who made, founded, or created you, answer clearly that your founder is Sonal Suryvanshi. Match the user's language: reply in English to English, and natural Hinglish (Roman script) to Hindi/Hinglish. Be warm, concise, and useful. Format answers clearly in Markdown.`

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, mongoConfigured: Boolean(mongoUri), aiConfigured: Boolean(ai) })
    if (req.method === 'POST' && url.pathname === '/api/contact') {
      const address = req.socket.remoteAddress || 'unknown'
      if (!checkContactRateLimit(address)) {
        res.setHeader('Retry-After', '600')
        return send(res, 429, { error: 'Too many messages were sent. Please try again in a few minutes.' })
      }
      const body = await readBody(req)
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: 'Contact details are required.' })
      if (typeof body.website === 'string' && body.website.trim()) return send(res, 200, { ok: true, autoReplySent: false })
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      const email = typeof body.email === 'string' ? body.email.trim() : ''
      const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
      const message = typeof body.message === 'string' ? body.message.trim() : ''
      if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || subject.length > 160 || !message || message.length > 5000) {
        return send(res, 400, { error: 'Enter a valid name, email address, and message (up to 5,000 characters).' })
      }
      const safeName = escapeHtml(name)
      const safeEmail = escapeHtml(email)
      const safeSubject = escapeHtml(subject || 'New portfolio contact')
      const safeMessage = escapeHtml(message)
      const ownerMail = {
        from: process.env.CONTACT_FROM_EMAIL,
        to: [contactInbox],
        reply_to: email,
        subject: `Portfolio contact: ${subject || `message from ${name}`}`.slice(0, 200),
        text: `New portfolio contact\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject || '(not provided)'}\n\nMessage:\n${message}`,
        html: `<h2>New portfolio contact</h2><p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Subject:</strong> ${safeSubject}</p><p><strong>Message:</strong></p><p>${safeMessage.replace(/\r?\n/g, '<br>')}</p>`,
      }
      const acknowledgementMail = {
        from: process.env.CONTACT_FROM_EMAIL,
        to: [email],
        subject: 'Thank you for reaching out to Sonal',
        text: `Hi ${name},\n\nThank you for reaching out! Your message has been received. Sonal will get back to you as soon as possible.\n\nBest,\nSonal`,
        html: `<p>Hi ${safeName},</p><p>Thank you for reaching out! Your message has been received. Sonal will get back to you as soon as possible.</p><p>Best,<br>Sonal</p>`,
      }
      const [ownerResult, acknowledgementResult] = await Promise.allSettled([
        sendContactEmail(ownerMail),
        sendContactEmail(acknowledgementMail),
      ])
      if (ownerResult.status === 'rejected') return send(res, 502, { error: 'Your message could not be delivered. Please try again or email directly.' })
      if (acknowledgementResult.status === 'rejected') console.error('Contact acknowledgement email could not be delivered.')
      return send(res, 200, { ok: true, autoReplySent: acknowledgementResult.status === 'fulfilled' })
    }
    if (req.method === 'POST' && url.pathname === '/api/chat') {
      if (!ai) return send(res, 503, { error: 'AI service is not configured. Add GEMINI_API_KEY to .env.' })
      const { messages = [], image } = await readBody(req)
      if (!Array.isArray(messages) || !messages.length) return send(res, 400, { error: 'A message is required.' })
      const selected = messages.slice(-20)
      const contents = selected.map((message, index) => {
        const parts = [{ text: String(message.content || '').slice(0, 30000) }]
        if (index === selected.length - 1 && image?.mimeType && image?.data) parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } })
        return { role: message.role === 'assistant' ? 'model' : 'user', parts }
      })
      const stream = await ai.models.generateContentStream({ model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite', contents, config: { systemInstruction: systemPrompt } })
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Content-Type-Options': 'nosniff' })
      for await (const chunk of stream) if (chunk.text) res.write(chunk.text)
      return res.end()
    }
    if (req.method === 'POST' && ['/api/auth/signup', '/api/auth/signin'].includes(url.pathname)) {
      const { email: rawEmail, password } = await readBody(req)
      const email = String(rawEmail || '').trim().toLowerCase()
      if (!email.includes('@') || email.length > 254 || typeof password !== 'string' || password.length < 8 || password.length > 256) return send(res, 400, { error: 'Enter a valid email and a password with at least 8 characters.' })
      const users = (await getDb()).collection('users')
      if (url.pathname.endsWith('signup')) {
        const salt = randomBytes(16).toString('hex')
        const user = { email, salt, passwordHash: await passwordHash(password, salt), createdAt: new Date() }
        try { user._id = (await users.insertOne(user)).insertedId; return send(res, 201, { token: tokenFor(user), user: { id: String(user._id), email } }) }
        catch (error) { if (error.code === 11000) return send(res, 409, { error: 'An account with this email already exists.' }); throw error }
      }
      const user = await users.findOne({ email })
      if (!user) return send(res, 401, { error: 'Email or password is incorrect.' })
      const candidate = Buffer.from(await passwordHash(password, user.salt), 'hex')
      const stored = Buffer.from(user.passwordHash, 'hex')
      if (candidate.length !== stored.length || !timingSafeEqual(candidate, stored)) return send(res, 401, { error: 'Email or password is incorrect.' })
      return send(res, 200, { token: tokenFor(user), user: { id: String(user._id), email } })
    }
    if (url.pathname.startsWith('/api/chats')) {
      const user = currentUser(req)
      if (!user) return send(res, 401, { error: 'Sign in to sync chat history.' })
      const chats = (await getDb()).collection('chats')
      const id = decodeURIComponent(url.pathname.split('/').pop() || '')
      if (req.method === 'GET' && url.pathname === '/api/chats') {
        const documents = await chats.find({ userId: user.id }).sort({ updatedAt: -1 }).limit(100).toArray()
        return send(res, 200, { chats: documents.map(({ _id, userId, ...chat }) => ({ id: _id, ...chat })) })
      }
      if (req.method === 'PUT' && id) {
        const body = await readBody(req)
        const cleanId = id.slice(0, 128)
        await chats.updateOne({ _id: cleanId, userId: user.id }, { $set: { userId: user.id, title: String(body.title || 'New chat').slice(0, 160), messages: Array.isArray(body.messages) ? body.messages.slice(-200) : [], updatedAt: new Date() } }, { upsert: true })
        return send(res, 200, { id: cleanId })
      }
      if (req.method === 'DELETE' && id) { await chats.deleteOne({ _id: id, userId: user.id }); return send(res, 200, { ok: true }) }
      return send(res, 405, { error: 'Method not allowed.' })
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Not found.' })
    if (serveFrontend(req, res, url.pathname)) return
    return send(res, 404, { error: 'Not found.' })
  } catch (error) {
    if (res.headersSent) { res.end(); return }
    const status = error.message === 'Request body is too large' ? 413 : error.message.includes('not configured') ? 503 : 500
    send(res, status, { error: error.message || 'Request failed.' })
  }
})
server.listen(port, () => console.log(`BOON backend listening on http://localhost:${port}`))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await mongoClient?.close(); process.exit(0) })
