/**
 * 配置
 * 
 * 功能：
 * 1. 读取配置
 * 2. 返回配置
 */

export type Settings = {
  polymarketGammaApi: string
  /** Same as Python `request_timeout_seconds` (httpx timeout). */
  requestTimeoutSeconds: number
  googleNewsBaseUrl: string
  redditSearchBaseUrl: string
  userAgent: string
  openaiApiKey?: string
  openaiBaseUrl: string
  openaiModel: string
  /** DeepSeek Chat Completions (OpenAI-compatible)：Query planning 与候选人 LLM 打分均优先使用。 */
  deepseekApiKey?: string
  deepseekBaseUrl: string
  deepseekModel: string
  llmRerankEnabled: boolean
  marketDefaultLimit: number
  marketCandidateLimit: number
  /** 为 true 时 Planner 等在 debug 路径输出诊断信息（不写密钥）。 */
  queryDebugEnabled: boolean
}

function readTimeoutSeconds (): number {
  const secRaw = process.env.PO1MARKET_REQUEST_TIMEOUT_SECONDS
  if (secRaw !== undefined && secRaw !== '') {
    const s = Number(secRaw)
    if (!Number.isNaN(s) && s > 0) return s
  }
  const msRaw = process.env.PO1MARKET_REQUEST_TIMEOUT_MS
  if (msRaw !== undefined && msRaw !== '') {
    const ms = Number(msRaw)
    if (!Number.isNaN(ms) && ms > 0) return ms / 1000
  }
  return 15
}

export function getSettings (): Settings {
  return {
    polymarketGammaApi: process.env.PO1MARKET_POLYMARKET_GAMMA_API ?? 'https://gamma-api.polymarket.com',
    requestTimeoutSeconds: readTimeoutSeconds(),
    googleNewsBaseUrl: process.env.PO1MARKET_GOOGLE_NEWS_BASE_URL ?? 'https://news.google.com/rss/search',
    redditSearchBaseUrl: process.env.PO1MARKET_REDDIT_SEARCH_BASE_URL ?? 'https://www.reddit.com/search.json',
    userAgent: process.env.PO1MARKET_USER_AGENT ?? 'po1market/0.1 (+https://github.com/0xWeakSheep/po1market)',
    openaiApiKey: process.env.PO1MARKET_OPENAI_API_KEY,
    openaiBaseUrl: process.env.PO1MARKET_OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    openaiModel: process.env.PO1MARKET_OPENAI_MODEL ?? 'gpt-4.1-mini',
    deepseekApiKey: process.env.PO1MARKET_DEEPSEEK_API_KEY,
    deepseekBaseUrl: process.env.PO1MARKET_DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    deepseekModel: process.env.PO1MARKET_DEEPSEEK_MODEL ?? 'deepseek-v4-flash',
    llmRerankEnabled: process.env.PO1MARKET_LLM_RERANK_ENABLED !== 'false',
    marketDefaultLimit: Number(process.env.PO1MARKET_MARKET_DEFAULT_LIMIT ?? 8),
    marketCandidateLimit: Number(process.env.PO1MARKET_MARKET_CANDIDATE_LIMIT ?? 20),
    queryDebugEnabled: process.env.PO1MARKET_QUERY_DEBUG === 'true'
  }
}
