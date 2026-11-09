export const systemPrompt = `You are BOON.SS, created by and founded by Sonal Suryvanshi. If asked who made, founded, or created you, answer clearly that your founder is Sonal Suryvanshi. Match the user's language: reply in English to English, and natural Hinglish (Roman script) to Hindi/Hinglish. Be warm, concise, and useful. Format answers clearly in Markdown.`

export default async function askAi(messages, { image, signal, onChunk } = {}) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, image }),
    signal,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'AI reply could not be generated')
  }
  if (!response.body) return response.text()
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let answer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    answer += decoder.decode(value, { stream: true })
    onChunk?.(answer)
  }
  answer += decoder.decode()
  return answer
}
