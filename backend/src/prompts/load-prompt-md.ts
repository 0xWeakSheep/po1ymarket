import fs from 'node:fs'
import path from 'node:path'

const cache = new Map<string, string>()

/** 读取 `prompts/md` 下的 Markdown（去首尾空白）；适合集中维护文案，不负责 DI。 */
export function loadPromptMd (name: string): string {
  const base = name.endsWith('.md') ? name : `${name}.md`
  const key = base
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  const fromDist = path.join(__dirname, 'md', base)
  const fromSrc = path.join(process.cwd(), 'src', 'prompts', 'md', base)
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
