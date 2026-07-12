import axios from 'axios'

export function extractLatex(text: string): string[] {
  const blocks: string[] = []
  const regex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g
  let match
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[1] || match[2])
  }
  return blocks
}

export function stripLatex(text: string): string {
  return text.replace(/\$\$[^$]+\$\$/g, '')
    .replace(/\$[^$]+\$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function questionToLatex(question: string): string {
  const parts: string[] = []
  const regex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(question)) !== null) {
    if (match.index > lastIndex) {
      const text = question.slice(lastIndex, match.index)
        .replace(/\n/g, ' ')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/_/g, '\\_')
        .replace(/\^/g, '\\^{}')
        .replace(/&/g, '\\&')
        .replace(/#/g, '\\#')
      parts.push(`\\text{${text}}`)
    }
    parts.push(match[1] || match[2])
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < question.length) {
    const text = question.slice(lastIndex)
      .replace(/\n/g, ' ')
      .replace(/_/g, '\\_')
      .replace(/\^/g, '\\^{}')
      .replace(/&/g, '\\&')
      .replace(/#/g, '\\#')
    parts.push(`\\text{${text}}`)
  }

  return parts.length > 0 ? parts.join(' ') : `\\text{${question}}`
}

export async function renderLatexImage(formula: string): Promise<string | null> {
  try {
    const res = await axios.get('https://quicklatex.com/latex3.f', {
      params: {
        formula: `\\Large ${formula}`,
        fg: '000000',
        bg: 'FFFFFF',
        fs: 20,
        output: 'png',
      },
      timeout: 10000,
    })
    const match = res.data.match(/https:\/\/quicklatex\.com\/[^\s]+\.png/)
    if (match) return match[0]
    return null
  } catch {
    return null
  }
}
