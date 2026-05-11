import fs from 'node:fs'
import path from 'node:path'

const cache = new Map<string, string>()

/** 运行时读取的 Markdown 目录（与 nest-cli.json `assets` 的子路径一致）。 */
export const PROMPT_MARKDOWN_SUBDIR = 'agent-prompt' as const

/** 读取 `prompts/agent-prompt` 下的 Markdown（去首尾空白）；集中维护 Agent system 文案。 */
export function loadPromptMd (name: string): string {
  const base = name.endsWith('.md') ? name : `${name}.md`
  const key = base
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  const fromDist = path.join(__dirname, PROMPT_MARKDOWN_SUBDIR, base)
  const fromSrc = path.join(process.cwd(), 'src', 'prompts', PROMPT_MARKDOWN_SUBDIR, base)
  const filePath = fs.existsSync(fromDist) ? fromDist : fromSrc
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Prompt md not found: ${base} (tried ${fromDist} and ${fromSrc})`
    )
  }
  const text = fs.readFileSync(filePath, 'utf8').trim()
  cache.set(key, text)
  return text
}
