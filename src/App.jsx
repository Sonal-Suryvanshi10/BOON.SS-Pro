import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  Compass,
  Cpu,
  Mail,
  Home as HomeIcon,
  Orbit,
  Rocket,
  Menu,
  Mic,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Volume2,
  VolumeX,
  Share2,
  Square,
  Trash2,
  Pencil,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import './App.css'
import askAi from './AskAi.js'

const icons = {
  menu: Menu,
  plus: Plus,
  search: Search,
  send: Send,
  clip: Paperclip,
  copy: Copy,
  spark: Sparkles,
  arrow: ArrowUpRight,
  close: X,
  mic: Mic,
  more: MoreHorizontal,
  book: BookOpen,
  check: Check,
  refresh: RefreshCw,
  volume: Volume2,
  mute: VolumeX,
  share: Share2,
  stop: Square,
  trash: Trash2,
  edit: Pencil,
}

function Icon({ name, size = 18 }) {
  const LucideIcon = icons[name] || Sparkles
  return <LucideIcon size={size} strokeWidth={1.7} aria-hidden="true" />
}

function formatReply(raw) {
  try {
    const reply = JSON.parse(raw)
    return [reply.greeting, reply.heading, reply.answer].filter(Boolean).join('\n\n')
  } catch {
    return raw
  }
}

function renderText(text) {
  const inline = (value, keyPrefix) => value.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (part.startsWith('**')) return <strong key={key}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*')) return <em key={key}>{part.slice(1, -1)}</em>
    if (part.startsWith('`')) return <code key={key}>{part.slice(1, -1)}</code>
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/)
    if (link) return <a key={key} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>
    return part
  })
  const lines = text.split('\n')
  const output = []; let list = []; let code = []; let inCode = false
  const flushList = () => { if (list.length) { output.push(<ul key={`list-${output.length}`}>{list.map((line, i) => <li key={i}>{inline(line.replace(/^\s*[-*+]\s+/, ''), `li-${i}`)}</li>)}</ul>); list = [] } }
  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) { flushList(); if (inCode) { output.push(<pre key={`code-${index}`}><code>{code.join('\n')}</code></pre>); code = [] } inCode = !inCode; return }
    if (inCode) { code.push(line); return }
    if (/^\s*[-*+]\s+/.test(line)) { list.push(line); return }
    flushList()
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) { const Tag = `h${heading[1].length}`; output.push(<Tag key={index}>{inline(heading[2], `h-${index}`)}</Tag>); return }
    if (/^>\s?/.test(line)) { output.push(<blockquote key={index}>{inline(line.replace(/^>\s?/, ''), `q-${index}`)}</blockquote>); return }
    if (line.trim()) output.push(<p key={index}>{inline(line, `p-${index}`)}</p>)
    else output.push(<br key={index}/>)
  })
  flushList(); if (code.length) output.push(<pre key="code-tail"><code>{code.join('\n')}</code></pre>)
  return output
}

function Sidebar({
  drawer,
  setDrawer,
  newChat,
  query,
  setQuery,
  showSaved,
  setShowSaved,
  saved,
  visibleSessions,
  openSession,
  submit,
  authUser,
  onLogin,
}) {
  return (
    <>
      {drawer && (
        <button
          className="scrim"
          onClick={() => setDrawer(false)}
          aria-label="Close menu"
        />
      )}

      <aside className={`sidebar ${drawer ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <a
            className="brand"
            href="#home"
            onClick={(event) => {
              event.preventDefault()
              newChat()
            }}
          >
            <span className="brand-gem">
              <Icon name="spark" size={17} />
            </span>
            <span>
              BOON.SS Pro
            </span>
          </a>
          <button
            className="plain-icon close-drawer"
            onClick={() => setDrawer(false)}
            aria-label="Close sidebar"
          >
            <Icon name="close" />
          </button>
        </div>

        <button className="new-chat" onClick={newChat}>
          <Icon name="plus" />
          <span>New conversation</span>
          <kbd>⌘ K</kbd>
        </button>

        <label className="search-row">
          <Icon name="search" />
          <input
            id="chat-search"
            name="chatSearch"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats…"
          />
          <kbd>⌘ /</kbd>
        </label>

        <div className="side-label">YOUR SPACE</div>
        <button className="side-link" onClick={newChat}>
          <Icon name="spark" />
          <span>Discover</span>
        </button>
        <button className="side-link" onClick={() => setShowSaved((value) => !value)}>
          <Icon name="book" />
          <span>Saved prompts</span>
          <span className="saved-count">{saved.length || ''}</span>
        </button>

        <div className="side-label recents-label">
          {showSaved ? 'SAVED PROMPTS' : 'RECENT CHATS'}
        </div>
        <div className="recent-list">
          {showSaved ? (
            saved.length ? (
              saved.map((prompt, index) => (
                <button
                  className="recent-chat"
                  key={index}
                  onClick={() => {
                    setShowSaved(false)
                    submit(prompt)
                  }}
                >
                  <span className="recent-dot" />
                  <span>{prompt}</span>
                </button>
              ))
            ) : (
              <span className="empty-note">Save a message prompt to find it here.</span>
            )
          ) : visibleSessions.length ? (
            visibleSessions.map((session) => (
              <button
                className="recent-chat"
                key={session.id}
                onClick={() => openSession(session)}
              >
                <span className="recent-dot" />
                <span>{session.title}</span>
              </button>
            ))
          ) : null}
        </div>

        <div className="sidebar-footer">
          <div className="plan-card">
            <span className="plan-icon">
              <Icon name="spark" size={15} />
            </span>
            <span>
              <b>Your ideas, amplified</b>
              <small>Make something wonderful</small>
            </span>
            <Icon name="arrow" size={14} />
          </div>
          <button className="user-card" onClick={onLogin}>
            <span className="user-avatar">{authUser?.email?.[0]?.toUpperCase() || 'S'}</span>
            <span><b>{authUser?.email || 'Sign in'}</b><small>{authUser ? 'Cloud synced workspace' : 'Sync chats across devices'}</small></span>
            <Icon name="more" size={17} />
          </button>
        </div>
      </aside>
    </>
  )
}

function Header({ messages, chatTitle, setDrawer }) {
  return (
    <header className="topbar">
      <div className="top-left">
        <button
          className="plain-icon menu-button"
          onClick={() => setDrawer(true)}
          aria-label="Open sidebar"
        >
          <Icon name="menu" />
        </button>
        <span className="mobile-brand">
          <span className="brand-gem">
            <Icon name="spark" size={14} />
          </span>
          BOON.SS
        </span>
        <span className="crumb">{messages.length ? chatTitle : 'New conversation'}</span>
      </div>

      <div className="top-actions">
        <span className="online">
          <i />
          Ready to explore
        </span>
      </div>
    </header>
  )
}

function Welcome() {
  return (
    <div className="welcome">
      <div className="hero-orb" aria-hidden="true"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="orbit orbit-c"/><div className="planet"><span className="planet-shine"/><span className="planet-star">✦</span><span className="planet-glint"/></div><i className="satellite sat-a"/><i className="satellite sat-b"/><i className="satellite sat-c"/></div>
      <div className="eyebrow"><span/>YOUR IMAGINATION, MEET YOUR CO-PILOT<span/></div><h1>What You Want ?<br/><em>Ask Here</em></h1><p className="welcome-copy">Ideas, answers, and the occasional “what if…”<br className="desktop-only"/> Start anywhere. We’ll figure it out together.</p>
      <div className="suggestions">{[{icon:'✦',title:'Explore an idea',text:'Give me three creative ideas for a weekend project.'},{icon:'⌁',title:'Write something',text:'Write a tiny story about a city floating above the clouds.'},{icon:'◈',title:'Learn something',text:'Explain how the internet works in simple words.'}].map(s=><button className="suggestion" key={s.title} onClick={()=>document.querySelector('.composer textarea')?.focus()}><span className="suggestion-icon">{s.icon}</span><span><b>{s.title}</b><small>{s.text}</small></span><span className="suggestion-arrow">↗</span></button>)}</div>
    </div>
  )
}

function Landing({ onDemo, onLogin }) {
  return <div className="reference-landing"><nav className="landing-nav"><a className="active"><HomeIcon size={17}/> HOME</a><a><Compass size={17}/> EXPLORE</a><a><Cpu size={17}/> TECHNOLOGY</a><a><BookOpen size={17}/> JOURNAL</a><a><Mail size={17}/> CONTACT</a><span>BY &nbsp;<b>SONAL</b></span></nav><main className="landing-hero"><div className="landing-copy"><div className="eyebrow"><span/> ✦ NEXT-GEN AI ASSISTANT</div><h1>BOON.SS</h1><h2>WHERE CREATIVITY <i>✦</i> MEETS INTELLIGENCE</h2><div className="welcome-actions"><button className="demo-button" onClick={onDemo}>▷ &nbsp; TRY DEMO &nbsp;→</button><button className="welcome-login" onClick={onLogin}>⇥ &nbsp; LOGIN / SIGN UP</button></div><div className="landing-stats"><span><b>∞</b><small>IDEAS</small></span><span><b>24/7</b><small>AVAILABLE</small></span><span><b>100+</b><small>LANGUAGES</small></span></div></div><div className="landing-cosmos" aria-hidden="true"><div className="cosmos-ring ring-one"/><div className="cosmos-ring ring-two"/><div className="cosmos-ring ring-three"/><div className="cosmos-planet"><div className="planet-core"><Orbit size={48}/></div></div><span className="cosmos-moon"/><Rocket className="cosmos-rocket" size={25}/><Rocket className="cosmos-rocket rocket-two" size={22}/><span className="cosmos-spark">✦</span></div></main><div className="landing-foot">✦ &nbsp; BOON.SS · YOUR LITTLE SPARK OF GENIUS</div></div>
}

function Message({ message, onCopy, onRetry, onSave, onSpeak, onShare, onEdit, onDelete, speaking, editing, editValue, setEditValue, saveEdit, cancelEdit, onRegenerate }) {
  const isAssistant = message.role === 'assistant'

  return (
    <article className={`message ${message.role}`}>
      <div
        className={`message-avatar ${isAssistant ? 'ai-avatar' : 'person-avatar'}`}
      >
        {isAssistant ? <Icon name="spark" size={15} /> : 'S'}
      </div>
      <div className="message-main">
        <div className="message-heading">
          <b>{isAssistant ? 'BOON.SS' : 'You'}</b>
          <span>{message.error ? 'Server issue' : 'Just now'}</span>
        </div>
        {editing ? <div className="message-edit"><textarea value={editValue} onChange={event => setEditValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); saveEdit() } if (event.key === 'Escape') cancelEdit() }} autoFocus /><div><button onClick={cancelEdit}><Icon name="close" size={14}/> Cancel</button><button onClick={saveEdit}><Icon name="check" size={14}/> Save & regenerate</button></div></div> : <div className={`message-text ${message.error ? 'error-text' : ''}`}>{renderText(message.text || '')}</div>}

        {isAssistant && message.text && (
          <div className="message-tools">
            <button onClick={() => onCopy(message.text)}>
              <Icon name="copy" size={14} /> Copy
            </button>
            <button onClick={() => onSpeak(message.text)}>
              <Icon name={speaking ? 'mute' : 'volume'} size={14} /> {speaking ? 'Stop' : 'Read aloud'}
            </button>
            <button onClick={() => onShare(message.text)}>
              <Icon name="share" size={14} /> Share
            </button>
            <button onClick={onRetry}>
              <Icon name="refresh" size={14} /> Try again
            </button>
          </div>
        )}
        {!isAssistant && (
          <div className="message-tools">
            <button onClick={() => onSave(message.apiText || message.text)}>
              <Icon name="book" size={14} /> Save prompt
            </button>
            <button onClick={() => onEdit(message.apiText || message.text, message)}><Icon name="edit" size={14} /> Edit & retry</button>
            <button onClick={onDelete}>
              <Icon name="trash" size={14} /> Delete
            </button>
          </div>
        )}
        {isAssistant && message.text && <div className="message-tools"><button onClick={onRegenerate}><Icon name="refresh" size={14}/> Regenerate</button></div>}
      </div>
    </article>
  )
}

function ThinkingIndicator() {
  return (
    <article className="message assistant">
      <div className="message-avatar ai-avatar">
        <Icon name="spark" size={15} />
      </div>
      <div className="message-main">
        <div className="message-heading">
          <b>BOON.SS</b>
          <span>Thinking</span>
        </div>
        <div className="typing">
          <i />
          <i />
          <i />
        </div>
      </div>
    </article>
  )
}

function Conversation({ messages, busy, bottom, onCopy, onRetry, onSave, onSpeak, onShare, onEdit, onDelete, speaking, editingId, editValue, setEditValue, saveEdit, cancelEdit, onRegenerate }) {
  const isEmpty = messages.length === 0

  return (
    <section className={`conversation ${isEmpty ? 'empty-conversation' : ''}`}>
      {isEmpty ? (
        <Welcome/>
      ) : (
        <div className="message-list">
          {messages.map((message, index) => (
            <Message
              key={`${index}-${message.role}`}
              message={message}
              onCopy={onCopy}
              onRetry={onRetry}
              onSave={onSave}
              onSpeak={onSpeak}
              onShare={onShare}
              onEdit={onEdit}
              onDelete={() => onDelete(index)}
              speaking={speaking}
              editing={editingId === index} editValue={editValue} setEditValue={setEditValue} saveEdit={saveEdit} cancelEdit={cancelEdit} onRegenerate={() => onRegenerate(index)}
            />
          ))}
          {busy && <ThinkingIndicator />}
          <div ref={bottom} />
        </div>
      )}
    </section>
  )
}

function Composer({
  area,
  fileRef,
  input,
  setInput,
  attachment,
  setAttachment,
  busy,
  listening,
  onSubmit,
  onKeyDown,
  onPickFile,
  onVoiceInput,
  onStop,
  imageAttachment,
  setImageAttachment,
}) {
  return (
    <footer className="composer-area">
      <div className="composer-wrap">
        <div className="composer">
          <input
            ref={fileRef}
            id="chat-attachment"
            name="chatAttachment"
            className="hidden-file"
            type="file"
            accept=".txt,.md,.csv,.json,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,image/*"
            onChange={onPickFile}
          />
          <textarea
            ref={area}
            id="chat-message"
            name="message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            rows="1"
            placeholder="Ask anything…"
            aria-label="Message BOON.SS"
          />
          <div className="composer-bottom">
            <div className="composer-tools">
              <button
                className="attach"
                aria-label="Attach text file"
                title="Attach a text file"
                onClick={() => fileRef.current?.click()}
              >
                <Icon name="clip" size={17} />
              </button>
              {attachment && <button className="file-chip" onClick={() => setAttachment(null)} title="Remove attachment">{attachment.name} ×</button>}
              {imageAttachment && <button className="file-chip" onClick={() => setImageAttachment(null)} title="Remove image">{imageAttachment.name} ×</button>}
              <span className="tool-divider" />
              <button
                className="magic"
                onClick={() =>
                  setInput((text) =>
                    text
                      ? `${text} Keep the answer concise and clear.`
                      : 'Give me a creative answer with a little magic.',
                  )
                }
              >
                <Icon name="spark" size={13} /> <span>Make it sparkle</span>
              </button>
            </div>

            <div className="composer-tools">
              <button
                className={`attach mic ${listening ? 'listening' : ''}`}
                aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                title={listening ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={listening}
                onClick={onVoiceInput}
              >
                <Icon name="mic" size={17} />
              </button>
              {busy ? (
                <button className="send send-ready" onClick={onStop} aria-label="Stop generating" title="Stop generating">
                  <Icon name="stop" size={15} />
                </button>
              ) : (
                <button className={`send ${(input.trim() || imageAttachment) ? 'send-ready' : ''}`} disabled={!input.trim() && !imageAttachment} onClick={() => onSubmit()} aria-label="Send message">
                  <Icon name="send" size={17} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="composer-caption">
          <span>
            <b>✦</b> BOON.SS is a creative assistant. Check important details.
          </span>
          <span>ENTER ↵ &nbsp;·&nbsp; SHIFT + ENTER for a new line</span>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [showLanding, setShowLanding] = useState(true)
  const [guestUsage, setGuestUsage] = useState(() => Number(localStorage.getItem('boon-guest-usage') || 0))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('orbit-saved') || '[]')
    } catch {
      return []
    }
  })
  const [showSaved, setShowSaved] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const [imageAttachment, setImageAttachment] = useState(null)
  const [speaking, setSpeaking] = useState(false)
  const [auth, setAuth] = useState(() => { try { return JSON.parse(localStorage.getItem('boon-auth') || 'null') } catch { return null } })
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editingMessage, setEditingMessage] = useState(null)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [sessions, setSessions] = useState([])

  const area = useRef(null)
  const inputRef = useRef(null)
  const bottom = useRef(null)
  const fileRef = useRef(null)
  const recognitionRef = useRef(null)
  const requestController = useRef(null)

  useEffect(
    () => () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    },
    [],
  )

  // Guest sessions exist only in memory. Persistent chat history belongs to MongoDB accounts.
  useEffect(() => { if (!auth) localStorage.removeItem('orbit-sessions') }, [auth])
  useEffect(() => { if (auth) localStorage.setItem('boon-auth', JSON.stringify(auth)); else localStorage.removeItem('boon-auth') }, [auth])
  useEffect(() => {
    if (!auth?.token) return
    let cancelled = false
    fetch('/api/chats', { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body })
      .then(({ chats }) => { if (!cancelled) setSessions(chats.slice(0, 100)) })
      .catch((error) => { if (!cancelled) showToast(error.message, 3000) })
    return () => { cancelled = true }
  }, [auth?.token])
  useEffect(() => {
    if (!auth?.token || !sessions.length) return
    const timer = setTimeout(() => sessions.forEach((session) => fetch(`/api/chats/${encodeURIComponent(session.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify({ title: session.title, messages: session.messages }) }).catch(() => {})), 700)
    return () => clearTimeout(timer)
  }, [sessions, auth?.token])

  useEffect(() => {
    localStorage.setItem('orbit-saved', JSON.stringify(saved))
  }, [saved])

  useEffect(() => {
    if (!messages.length || !activeSessionId) return
    const title = messages.find((message) => message.role === 'user')?.text?.split('\n')[0]?.slice(0, 34) || 'New conversation'
    setSessions((all) => [{ id: activeSessionId, title, messages }, ...all.filter((session) => session.id !== activeSessionId)].slice(0, 100))
  }, [messages, activeSessionId])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  useEffect(() => {
    if (area.current) {
      area.current.style.height = 'auto'
      area.current.style.height = `${Math.min(area.current.scrollHeight, 156)}px`
    }
  }, [input])

  const chatTitle =
    messages.find((message) => message.role === 'user')?.text?.split('\n')[0]?.slice(0, 34) ||
    'New conversation'
  const visibleSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(query.toLowerCase()),
  )

  function showToast(message, duration = 1800) {
    setToast(message)
    setTimeout(() => setToast(''), duration)
  }

  function newChat() {
    if (auth && messages.length) {
      const id = activeSessionId || String(Date.now())
      setSessions((oldSessions) => [{ id, title: chatTitle, messages }, ...oldSessions.filter((session) => session.id !== id)].slice(0, 100))
    }
    setActiveSessionId(null)
    setMessages([])
    setInput('')
    setDrawer(false)
  }

  function openSession(session) {
    if (!auth) return
    if (!sessions.some((item) => item.id === session.id)) return
    setActiveSessionId(session.id)
    setMessages(session.messages)
    setDrawer(false)
  }

  function savePrompt(text) {
    setSaved((oldSaved) =>
      oldSaved.includes(text) ? oldSaved : [text, ...oldSaved].slice(0, 20),
    )
    showToast('Prompt saved', 1600)
  }

  async function submit(text = input) {
    const prompt = text.trim() || (imageAttachment ? 'Describe this image.' : '')
    if (!prompt || busy) return
    if (!auth && guestUsage >= 7) { setAuthError('Aapke 7 free demo messages complete ho gaye. Continue karne ke liye signup ya login karein.'); setAuthMode('signup'); setAuthOpen(true); return }
    if (!activeSessionId) setActiveSessionId(String(Date.now()))

    const sentAttachment = attachment
    const sentImage = imageAttachment
    const displayText = sentAttachment || sentImage ? `${prompt}\n[Attached: ${(sentAttachment || sentImage).name}]` : prompt
    const apiText = sentAttachment ? `${prompt}\n\nAttached file (${sentAttachment.name}):\n${sentAttachment.text}` : prompt
    const turnId = messages.length + 1
    const requestMessages = [...messages.filter((message) => message.text && !message.error).map((message) => ({ role: message.role, content: message.apiText || message.text })), { role: 'user', content: apiText }]
    if (!auth) { const nextUsage = guestUsage + 1; setGuestUsage(nextUsage); localStorage.setItem('boon-guest-usage', String(nextUsage)) }

    setMessages((oldMessages) => [
      ...oldMessages,
      { role: 'user', text: displayText, apiText },
      { role: 'assistant', text: '', turnId },
    ])
    setInput('')
    setAttachment(null)
    setImageAttachment(null)
    setBusy(true)
    requestController.current = new AbortController()

    try {
      const reply = await askAi(requestMessages, { signal: requestController.current.signal, image: sentImage ? { mimeType: sentImage.mimeType, data: sentImage.data } : undefined, onChunk: (partial) => setMessages((oldMessages) => oldMessages.map((message) => message.turnId === turnId ? { ...message, text: partial } : message)) })
      const answer = formatReply(reply)
      setMessages((oldMessages) =>
        oldMessages.map((message) =>
          message.turnId === turnId ? { ...message, text: answer } : message,
        ),
      )
    } catch (error) {
      if (error.name !== 'AbortError') setMessages((oldMessages) => oldMessages.map((message) => message.turnId === turnId ? { ...message, text: 'Server issue.', error: true } : message))
    } finally {
      requestController.current = null
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  function stopGeneration() { requestController.current?.abort() }

  function pickFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5000000) {
      showToast('File must be smaller than 5 MB')
      return
    }

    const reader = new FileReader()
    reader.onerror = () => showToast('Could not read this file')
    if (file.type.startsWith('image/')) {
      reader.onload = () => { const [metadata, data] = String(reader.result || '').split(','); setImageAttachment({ name: file.name, mimeType: metadata.match(/data:(.*?);/)?.[1] || file.type, data }) }
      reader.readAsDataURL(file)
    } else {
      reader.onload = () => setAttachment({ name: file.name, text: String(reader.result || '') })
      reader.readAsText(file)
    }
    event.target.value = ''
  }

  function startVoice() {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      return
    }

    if (!window.isSecureContext) {
      showToast('Voice input requires HTTPS or localhost')
      return
    }

    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Speech) {
      showToast('Voice input is not supported in this browser')
      return
    }

    try {
      const recognition = new Speech()
      recognitionRef.current = recognition
      recognition.lang = navigator.language || 'en-US'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognition.onstart = () => {
        setListening(true)
        showToast('Listening... tap the mic to stop', 2500)
      }
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .slice(event.resultIndex)
          .filter((result) => result.isFinal)
          .map((result) => result[0].transcript.trim())
          .filter(Boolean)
          .join(' ')

        if (transcript) {
          setInput((current) =>
            `${current}${current ? ' ' : ''}${transcript}`,
          )
        }
      }
      recognition.onerror = (event) => {
        const messages = {
          'not-allowed': 'Allow microphone access in browser settings',
          'service-not-allowed': 'Speech recognition service is unavailable',
          'audio-capture': 'No microphone was found',
          'no-speech': 'No speech detected. Try again',
          network: 'Speech recognition needs an internet connection',
        }
        showToast(messages[event.error] || 'Voice input could not start')
      }
      recognition.onend = () => {
        recognitionRef.current = null
        setListening(false)
      }
      recognition.start()
    } catch {
      recognitionRef.current = null
      setListening(false)
      showToast('Could not start microphone. Check its browser permission')
    }
  }

  function shortcut(event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      newChat()
    }
    if ((event.metaKey || event.ctrlKey) && event.key === '/') {
      event.preventDefault()
      inputRef.current?.focus()
    }
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text)
      showToast('Copied to clipboard')
    } catch {
      showToast('Could not copy text')
    }
  }

  function readAloud(text) {
    if (!('speechSynthesis' in window)) return showToast('Read aloud is not supported in this browser')
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  async function shareReply(text) {
    try {
      if (navigator.share) await navigator.share({ title: 'BOON.SS reply', text })
      else await copy(text)
    } catch (error) {
      if (error.name !== 'AbortError') showToast('Could not share reply')
    }
  }

  function editPrompt(text, message) {
    setEditingMessage(message); setEditingId(message.id || null); setEditValue(text)
  }

  async function resubmitFrom(index, replacement) {
    const original = messages[index]
    const prompt = String(replacement ?? original.apiText ?? original.text).trim()
    if (!prompt || busy) return
    const next = [...messages.slice(0, index), { ...original, text: prompt, apiText: prompt }, { role: 'assistant', text: '', turnId: Date.now() }]
    const turnId = next.at(-1).turnId
    setMessages(next); setEditingId(null); setBusy(true); requestController.current = new AbortController()
    const req = next.slice(0, -1).map(message => ({ role: message.role, content: message.apiText || message.text }))
    try {
      const answer = formatReply(await askAi(req, { signal: requestController.current.signal, onChunk: partial => setMessages(current => current.map(message => message.turnId === turnId ? { ...message, text: partial } : message)) }))
      setMessages(current => current.map(message => message.turnId === turnId ? { ...message, text: answer } : message))
    } catch (error) { if (error.name !== 'AbortError') setMessages(current => current.map(message => message.turnId === turnId ? { ...message, text: 'Server issue.', error: true } : message)) }
    finally { requestController.current = null; setBusy(false) }
  }

  function saveEdit() { const index = editingId ? messages.findIndex(message => message.id === editingId) : messages.indexOf(editingMessage); if (index >= 0) resubmitFrom(index, editValue) }

  function regenerate(index) {
    let promptIndex = index
    if (messages[index].role !== 'user') { promptIndex = index - 1; while (promptIndex >= 0 && messages[promptIndex].role !== 'user') promptIndex-- }
    if (promptIndex >= 0) resubmitFrom(promptIndex)
  }

  function deleteMessage(index) {
    const target = messages[index]
    const end = target.role === 'user' && messages[index + 1]?.role === 'assistant' ? index + 2 : index + 1
    setMessages((current) => current.filter((_, messageIndex) => messageIndex < index || messageIndex >= end))
    showToast('Message deleted')
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!auth && guestUsage >= 7) { setAuthError('Aapke 7 free demo messages complete ho gaye. Continue karne ke liye signup ya login karein.'); setAuthMode('signup'); setAuthOpen(true) } else submit()
    }
  }

  async function handleAuth(event) {
    event.preventDefault(); setAuthBusy(true); setAuthError('')
    try {
      const response = await fetch(`/api/auth/${authMode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail, password: authPassword }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not sign in')
      setAuth(result); setAuthOpen(false); setAuthPassword(''); setMessages([]); setActiveSessionId(null); showToast('Cloud chat sync is on')
      setGuestUsage(0); localStorage.removeItem('boon-guest-usage')
    } catch (error) { setAuthError(error.message) } finally { setAuthBusy(false) }
  }

  function retryLastPrompt() {
    const lastPrompt = messages
      .filter((message) => message.role === 'user')
      .at(-1)
      ?.text?.split('\n[Attached:')[0]
    submit(lastPrompt || '')
  }

  if (showLanding) return <><Landing onDemo={() => { setMessages([]); setActiveSessionId(null); setShowLanding(false); requestAnimationFrame(() => inputRef.current?.focus()) }} onLogin={() => { setAuthMode('signin'); setAuthError(''); setAuthOpen(true) }} />{authOpen && <div className="auth-overlay" onClick={() => setAuthOpen(false)}><form className="auth-card" onSubmit={handleAuth} onClick={event => event.stopPropagation()}><button type="button" className="auth-close" aria-label="Close" onClick={()=>setAuthOpen(false)}>×</button><div className="auth-visual" aria-hidden="true"><span className="auth-orbit auth-orbit-one"/><span className="auth-orbit auth-orbit-two"/><span className="auth-core"><Icon name="spark" size={27}/></span><span className="auth-star auth-star-one">✦</span><span className="auth-star auth-star-two">✧</span></div><div className="auth-kicker">YOUR IDEAS, AMPLIFIED</div><h2>{authMode==='signup'?'Make room for more ideas.':'Welcome back.'}</h2><p>{authMode==='signup'?'Create your BOON.SS account and keep your conversations close.':'Sign in to pick up right where your curiosity left off.'}</p><label htmlFor="landing-email">Email</label><input id="landing-email" name="email" type="email" autoComplete="email" required value={authEmail} onChange={event=>setAuthEmail(event.target.value)}/><label htmlFor="landing-password">Password</label><input id="landing-password" name="password" type="password" autoComplete={authMode==='signup'?'new-password':'current-password'} minLength="8" required value={authPassword} onChange={event=>setAuthPassword(event.target.value)}/>{authError&&<div className="auth-error">{authError}</div>}<button className="auth-submit" disabled={authBusy}>{authBusy?'Please wait…':authMode==='signup'?'Create my account ↗':'Sign in ↗'}</button><button type="button" className="auth-switch" onClick={()=>{setAuthMode(authMode==='signin'?'signup':'signin');setAuthError('')}}>{authMode==='signin'?'New here? Create an account':'Already have an account? Sign in'}</button></form></div>}</>

  return (
    <div className="app-shell" onKeyDownCapture={shortcut}>
      <Sidebar
        drawer={drawer}
        setDrawer={setDrawer}
        newChat={newChat}
        query={query}
        setQuery={setQuery}
        showSaved={showSaved}
        setShowSaved={setShowSaved}
        saved={saved}
        visibleSessions={visibleSessions}
        openSession={openSession}
        submit={submit}
        authUser={auth?.user}
        onLogin={() => { if (auth) { localStorage.removeItem('orbit-sessions'); setAuth(null); setSessions([]); setMessages([]); setActiveSessionId(null); setInput(''); setShowSaved(false); setDrawer(false); setShowLanding(true); showToast('Signed out') } else { setAuthMode('signin'); setAuthError(''); setAuthOpen(true) } }}
      />

      <main className="main-panel">
        <Header messages={messages} chatTitle={chatTitle} setDrawer={setDrawer} />
        <Conversation
          messages={messages}
          busy={busy}
          bottom={bottom}
          onDemo={(prompt) => { if (prompt) setInput(prompt); setMessages([]); setActiveSessionId(null); requestAnimationFrame(() => inputRef.current?.focus()) }}
          onLogin={() => { setAuthMode('signin'); setAuthError(''); setAuthOpen(true) }}
          onCopy={copy}
          onRetry={retryLastPrompt}
          onSave={savePrompt}
          onSpeak={readAloud}
          onShare={shareReply}
          onEdit={editPrompt}
          onDelete={deleteMessage}
          speaking={speaking}
          editingId={editingId ? messages.findIndex(message => message.id === editingId) : messages.indexOf(editingMessage)} editValue={editValue} setEditValue={setEditValue} saveEdit={saveEdit} cancelEdit={() => { setEditingMessage(null); setEditingId(null) }} onRegenerate={regenerate}
        />
        <Composer
          area={area}
          fileRef={fileRef}
          input={input}
          setInput={setInput}
          attachment={attachment}
          setAttachment={setAttachment}
          busy={busy}
          listening={listening}
          onSubmit={submit}
          onKeyDown={onKeyDown}
          onPickFile={pickFile}
          onVoiceInput={startVoice}
          onStop={stopGeneration}
          imageAttachment={imageAttachment}
          setImageAttachment={setImageAttachment}
        />
      </main>

      {authOpen && (
        <div className="auth-overlay" onClick={() => setAuthOpen(false)}>
          <form className="auth-card" onSubmit={handleAuth} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="auth-close" onClick={() => setAuthOpen(false)}>×</button>
            <div className="auth-visual" aria-hidden="true"><span className="auth-orbit auth-orbit-one"/><span className="auth-orbit auth-orbit-two"/><span className="auth-core"><Icon name="spark" size={27}/></span><span className="auth-star auth-star-one">✦</span><span className="auth-star auth-star-two">✧</span></div>
            <div className="auth-kicker">YOUR IDEAS, AMPLIFIED</div>
            <h2>{authMode === 'signup' ? 'Make room for more ideas.' : 'Welcome back.'}</h2>
            <p>{authMode === 'signup' ? 'Create your BOON.SS account and keep your conversations close, wherever inspiration finds you.' : 'Sign in to pick up right where your curiosity left off.'}</p>
            <label htmlFor="auth-email">Email</label><input id="auth-email" name="email" type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} />
            <label htmlFor="auth-password">Password</label><input id="auth-password" name="password" type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength="8" required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
            {authError && <div className="auth-error">{authError}</div>}
            <button className="auth-submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'signup' ? 'Create my account  ↗' : 'Sign in  ↗'}</button>
            <button type="button" className="auth-switch" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError('') }}>{authMode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
          </form>
        </div>
      )}
      {toast && (
        <div className="toast">
          <Icon name="check" size={15} />
          {toast}
        </div>
      )}
    </div>
  )
}
