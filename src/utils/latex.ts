const CODECOGS_URL = 'https://latex.codecogs.com/png.latex'

export function formulaUrl(formula: string): string {
  const encoded = formula
    .replace(/\\/g, '\\\\')
    .replace(/\s+/g, ' ')
    .trim()
  return `${CODECOGS_URL}?\\dpi{200}\\bg{white} ${encoded}`
}

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
