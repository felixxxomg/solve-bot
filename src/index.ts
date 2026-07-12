import 'dotenv/config'
import { Telegraf } from 'telegraf'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { initDB } from './db.js'
import { startHandler } from './handlers/start.js'
import { callbackHandler } from './handlers/callback.js'

const token = process.env.BOT_TOKEN
if (!token) {
  console.error('BOT_TOKEN is missing in .env')
  process.exit(1)
}

// Proxy support (for regions where Telegram is blocked)
let agent = undefined
const proxyUrl = process.env.SOCKS_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxyUrl) {
  if (proxyUrl.startsWith('socks')) {
    agent = new SocksProxyAgent(proxyUrl)
  } else {
    agent = new HttpsProxyAgent(proxyUrl)
  }
  console.log('Using proxy:', proxyUrl)
}

const bot = new Telegraf(token, {
  telegram: { agent },
  handlerTimeout: 30_000,
})

let ready = false

bot.use(async (ctx, next) => {
  if (!ready) {
    await ctx.reply('⏳ Bot is starting up, please wait...')
    return
  }
  return next()
})

bot.start(startHandler)
bot.on('callback_query', callbackHandler)

async function main() {
  await initDB()
  console.log('Database initialized')

  await bot.launch()
  ready = true
  console.log('🤖 CSCA Solve Bot is running...')
}

main().catch(err => {
  console.error('Failed to start bot:', err?.message || err)
  console.error('Stack:', err?.stack || '')
  if (err?.cause) console.error('Cause:', err.cause)
  process.exit(1)
})

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
