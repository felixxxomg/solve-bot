import axios from 'axios'

export async function renderLatex(formula: string): Promise<string | null> {
  try {
    const res = await axios.get('https://quicklatex.com/latex3.f', {
      params: {
        formula: `\\Large ${formula}`,
        fg: '000000',
        bg: 'FFFFFF',
        fs: 18,
        output: 'png',
      },
      timeout: 8000,
    })

    const match = res.data.match(/https:\/\/quicklatex\.com\/[^\s]+\.png/)
    if (match) return match[0]
    return null
  } catch {
    return null
  }
}

export function extractLatexBlocks(text: string): string[] {
  const blocks: string[] = []
  const regex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g
  let match
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[1] || match[2])
  }
  return blocks
}

export function stripLatex(text: string): string {
  return text.replace(/\$\$[^$]+\$\$|\$[^$]+\$/g, '[formula]')
}
