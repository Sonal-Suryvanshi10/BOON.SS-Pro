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
