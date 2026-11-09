import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Archive,
  ArchiveRestore,
  BookOpen,
  Check,
  Copy,
  Compass,
  Cpu,
  Mail,
  Home as HomeIcon,
  BriefcaseBusiness,
  Code2,
  Rocket,
  Menu,
  Mic,
  MoreHorizontal,
  LogOut,
  Eye,
  EyeOff,
  Plus,
  Paperclip,
  RefreshCw,
  Volume2,
  VolumeX,
  Share2,
  Square,
  Trash2,
  Pencil,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import './App.css'
import './ProfileMenu.css'
import askAi from './AskAi.js'

const icons = {
  menu: Menu,
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

function loadGuestSessions() {
  try {
    const stored = JSON.parse(localStorage.getItem('boon-demo-sessions') || '[]')
    return Array.isArray(stored) ? stored.filter((session) => session && typeof session.id === 'string') : []
  } catch {
    return []
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
  activeSessionId,
  sessionView,
  setSessionView,
  profileMenuOpen,
  setProfileMenuOpen,
  canArchiveCurrent,
  onArchiveCurrent,
  onMoveToTrash,
  onRestoreSession,
  onPermanentDelete,
  onLogout,
  onGoHome,
  onEditProfile,
  onOpenLogin,
  submit,
  authUser,
}) {
  const sidebarFooterRef = useRef(null)

  useEffect(() => {
    if (!profileMenuOpen) return
    const closeOnOutsideClick = (event) => {
      if (!sidebarFooterRef.current?.contains(event.target)) setProfileMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [profileMenuOpen, setProfileMenuOpen])

  return (
    <>
      {drawer && (
        <button
          className="scrim"
          onClick={() => { setDrawer(false); setProfileMenuOpen(false) }}
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
            onClick={() => { setDrawer(false); setProfileMenuOpen(false) }}
            aria-label="Close sidebar"
          >
            <Icon name="close" />
          </button>
        </div>

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

        <button className="new-chat" onClick={newChat}>
          <Plus size={17} aria-hidden="true" />
          <span>New conversation</span>
        </button>

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
          {showSaved ? 'SAVED PROMPTS' : sessionView === 'trash' ? 'TRASH' : sessionView === 'archived' ? 'ARCHIVED CHATS' : 'RECENT CHATS'}
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
              <div className="recent-session" key={session.id}>
                <button
                  className={`recent-chat ${sessionView === 'active' && session.id === activeSessionId ? 'recent-chat-active' : ''}`}
                  onClick={() => openSession(session)}
                >
                  <span className="recent-dot" />
                  <span>{session.title}</span>
                </button>
                {sessionView === 'trash' ? (
                  <>
                    <button className="session-action" onClick={() => onRestoreSession(session)} aria-label={`Restore ${session.title}`} title="Restore chat"><RotateCcw size={14}/></button>
                    <button className="session-action session-action-danger" onClick={() => onPermanentDelete(session)} aria-label={`Permanently delete ${session.title}`} title="Delete permanently"><Trash2 size={14}/></button>
                  </>
                ) : sessionView === 'archived' ? (
                  <>
                    <button className="session-action" onClick={() => onRestoreSession(session)} aria-label={`Unarchive ${session.title}`} title="Move to recent chats"><ArchiveRestore size={14}/></button>
                    {authUser && <button className="session-action session-action-danger" onClick={() => onMoveToTrash(session)} aria-label={`Move ${session.title} to trash`} title="Move to trash"><Trash2 size={14}/></button>}
                  </>
                ) : authUser ? (
                  <button className="session-action session-action-danger" onClick={() => onMoveToTrash(session)} aria-label={`Move ${session.title} to trash`} title="Move to trash"><Trash2 size={14}/></button>
                ) : null}
              </div>
            ))
          ) : (
            <span className="empty-note">{sessionView === 'trash' ? 'Trash is empty.' : sessionView === 'archived' ? 'No archived chats yet.' : 'Your recent chats will show here.'}</span>
          )}
        </div>

        <div className="sidebar-footer" ref={sidebarFooterRef}>
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
          <div className="profile-controls">
            <button className="user-card" onClick={authUser ? undefined : onOpenLogin}>
              <span className="user-avatar">{(authUser?.displayName || authUser?.email)?.[0]?.toUpperCase() || 'S'}</span>
              <span><b>{authUser?.displayName || authUser?.email || 'Demo mode'}</b><small>{authUser ? 'Cloud synced workspace' : 'Guest chat archive'}</small></span>
            </button>
            <button className="profile-menu-trigger" aria-label="Profile options" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}><Icon name="more" size={18}/></button>
          </div>
          {profileMenuOpen && (
            <div className="profile-menu" role="menu">
              {authUser && canArchiveCurrent && <button role="menuitem" onClick={onArchiveCurrent}><Archive size={15}/> Archive current chat</button>}
              {authUser && <button role="menuitem" onClick={() => { setSessionView(sessionView === 'archived' ? 'active' : 'archived'); setProfileMenuOpen(false); setShowSaved(false) }}><ArchiveRestore size={15}/>{sessionView === 'archived' ? 'Recent chats' : 'Archived chats'}</button>}
              {authUser && <>
                <button role="menuitem" onClick={onEditProfile}><Pencil size={15}/> Update display name</button>
                <button role="menuitem" onClick={() => { setSessionView(sessionView === 'trash' ? 'active' : 'trash'); setProfileMenuOpen(false); setShowSaved(false) }}><Trash2 size={15}/>{sessionView === 'trash' ? 'Recent chats' : 'Trash'}</button>
                <button role="menuitem" onClick={onGoHome}><HomeIcon size={15}/> Go to home page</button>
                <button role="menuitem" className="profile-menu-danger" onClick={onLogout}><LogOut size={15}/> Log out</button>
              </>}
              {!authUser && <button role="menuitem" onClick={() => { setProfileMenuOpen(false); onOpenLogin() }}><ArrowUpRight size={15}/> Sign in to save chats</button>}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function Header({ setDrawer, onGoHome }) {
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
      </div>

      <div className="top-actions">
        <button className="header-action" onClick={onGoHome} title="Go to home page"><HomeIcon size={15}/><span>Home</span></button>
        <span className="online">
          <i />
          Ready to explore
        </span>
      </div>
    </header>
  )
}

function Welcome({ onSelectPrompt }) {
  return (
    <div className="welcome">
      <div className="hero-orb" aria-hidden="true"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="orbit orbit-c"/><div className="planet"><span className="planet-shine"/><span className="planet-star">✦</span><span className="planet-glint"/></div><i className="satellite sat-a"/><i className="satellite sat-b"/><i className="satellite sat-c"/></div>
      <div className="eyebrow"><span/>YOUR IMAGINATION, MEET YOUR CO-PILOT<span/></div><h1>What You Want ?<br/><em>Ask Here</em></h1><p className="welcome-copy">Ideas, answers, and the occasional “what if…”<br className="desktop-only"/> Start anywhere. We’ll figure it out together.</p>
      <div className="suggestions">{[{icon:'✦',title:'Explore an idea',text:'Give me three creative ideas for a weekend project.'},{icon:'⌁',title:'Write something',text:'Write a tiny story about a city floating above the clouds.'},{icon:'◈',title:'Learn something',text:'Explain how the internet works in simple words.'}].map(s=><button className="suggestion" key={s.title} onClick={()=>onSelectPrompt(s.text)}><span className="suggestion-icon">{s.icon}</span><span><b>{s.title}</b><small>{s.text}</small></span><span className="suggestion-arrow">↗</span></button>)}</div>
    </div>
  )
}

function Landing({ onDemo, onLogin, onProfile, isAuthenticated }) {
  const [activeSection, setActiveSection] = useState('home')
  const [contactStatus, setContactStatus] = useState({ type: '', message: '' })
  const [contactBusy, setContactBusy] = useState(false)
  const landingRef = useRef(null)
  const navItems = [
    { id: 'home', label: 'HOME', Icon: HomeIcon },
    { id: 'explore', label: 'EXPLORE', Icon: Compass },
    { id: 'technology', label: 'TECHNOLOGY', Icon: Cpu },
    { id: 'journal', label: 'JOURNAL', Icon: BookOpen },
    { id: 'contact', label: 'CONTACT', Icon: Mail },
  ]
  const ideas = [
    { category: 'CREATE', title: 'Make something memorable', description: 'Turn a rough idea into a story, a plan, or a fresh creative direction.', prompt: 'Give me three original ideas for a creative project I can finish this weekend.' },
    { category: 'UNDERSTAND', title: 'Make the complex feel simple', description: 'Get a clear explanation, a useful analogy, and the next question to explore.', prompt: 'Explain a complex topic to me using a simple analogy, then suggest one thing I can explore next.' },
    { category: 'GET UNSTUCK', title: 'Find your next step', description: 'Break a big goal into small, practical actions you can start today.', prompt: 'Help me break a goal I have in mind into five small steps I can start today.' },
  ]
  const journalItems = [
    { number: '01', tag: 'A BETTER BRAINSTORM', title: 'Start with a constraint', description: 'A small limit can make a blank page easier. Add a time limit, an audience, or a single material.', prompt: 'Help me brainstorm 10 ideas for a small project. Keep each idea under one sentence and make them varied.' },
    { number: '02', tag: 'LEARN BY ASKING', title: 'Ask for the second explanation', description: 'If an explanation does not click, ask for a different analogy or a worked example.', prompt: 'Teach me a topic using a relatable analogy, then give me a small worked example to check my understanding.' },
    { number: '03', tag: 'MAKE IT ACTIONABLE', title: 'Turn notes into a next step', description: 'A useful summary ends with what to do next, not just what was said.', prompt: 'Give me a simple framework to turn a messy list of notes into three clear next actions.' },
  ]

  function navigateToSection(event, id) {
    event.preventDefault()
    setActiveSection(id)
    landingRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submitContact(event) {
    event.preventDefault()
    setContactBusy(true)
    setContactStatus({ type: '', message: '' })
    const form = event.currentTarget
    const formData = new FormData(form)
    try {
      const endpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT?.trim()
      if (!endpoint || !/^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+\/?$/.test(endpoint)) {
        throw new Error('Add your Formspree endpoint to VITE_FORMSPREE_ENDPOINT, then restart the app.')
      }
      const data = Object.fromEntries(formData.entries())
      data._subject = `Portfolio contact: ${data.subject || data.name}`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        const providerError = result.errors?.map((error) => error.message).filter(Boolean).join(' ')
        throw new Error(providerError || 'Formspree could not send your message. Please try again.')
      }
      form.reset()
      setContactStatus({
        type: 'success',
        message: 'Message sent! Thanks for reaching out — I’ll get back to you soon.',
      })
    } catch (error) {
      setContactStatus({ type: 'error', message: error.message || 'Your message could not be sent. Please try again.' })
    } finally {
      setContactBusy(false)
    }
  }

  return (
    <div className="reference-landing" data-active-section={activeSection} ref={landingRef}>
      <nav className="landing-nav" aria-label="Main navigation">
        <div className="landing-nav-links">
          {navItems.map(({ id, label, Icon }) => (
            <a key={id} href={`#${id}`} className={activeSection === id ? 'active' : ''} aria-current={activeSection === id ? 'page' : undefined} onClick={(event) => navigateToSection(event, id)}>
              <Icon size={17} /> {label}
            </a>
          ))}
        </div>
        <span className="landing-byline">BY &nbsp;<b>SONAL</b></span>
      </nav>

      <main>
        <section className="landing-hero" id="home" data-landing-section>
          <div className="landing-copy">
            <div className="eyebrow"><span/> ✦ NEXT-GEN AI ASSISTANT</div>
            <h1>BOON.SS Pro</h1>
            <h2>BIG IDEAS. <i>✦</i> BRIGHTER POSSIBILITIES.</h2>
            <p className="landing-intro">A thoughtful space to explore ideas, make sense of the complicated, and turn “what if?” into “what next?”</p>
            <div className="welcome-actions">
              {isAuthenticated
                ? <button className="demo-button" onClick={onProfile}><HomeIcon size={16}/> &nbsp; PROFILE &nbsp;→</button>
                : <><button className="demo-button" onClick={() => onDemo()}>▷ &nbsp; TRY DEMO &nbsp;→</button><button className="welcome-login" onClick={onLogin}>⇥ &nbsp; LOGIN / SIGN UP</button></>}
            </div>
            <div className="landing-stats"><span><b>∞</b><small>IDEAS TO EXPLORE</small></span><span><b>1:1</b><small>THOUGHTFUL CHAT</small></span><span><b>YOU</b><small>SET THE PACE</small></span></div>
          </div>
          <div className="landing-cosmos" aria-hidden="true">
            <div className="cosmos-backglow"/>
            <div className="cosmos-ring ring-one"/>
            <div className="cosmos-ring ring-two"/>
            <div className="cosmos-ring ring-three"/>
            <div className="cosmos-planet earth-planet">
              <div className="earth-map"/>
              <div className="earth-graticule"/>
              <div className="earth-clouds"/>
              <div className="earth-specular"/>
              <div className="earth-shadow"/>
            </div>
            <span className="cosmos-moon"/>
            <Rocket className="cosmos-rocket" size={25}/>
            <Rocket className="cosmos-rocket rocket-two" size={22}/>
            <span className="cosmos-spark">✦</span>
            <div className="cosmos-float-card orbit-label"><span className="float-icon"><Sparkles size={15}/></span><span><b>IDEA UNIVERSE</b><small>One thought can travel far</small></span><i/></div>
            <div className="cosmos-float-card orbit-status"><span className="status-pulse"/><span><b>READY WHEN YOU ARE</b><small>Your creative co-pilot</small></span></div>
            <div className="cosmos-orbit-dot dot-one"/><div className="cosmos-orbit-dot dot-two"/><div className="cosmos-orbit-dot dot-three"/>
          </div>
        </section>

        <section className="landing-section explore-section" id="explore" data-landing-section>
          <div className="landing-section-heading"><span className="landing-kicker">A LITTLE SPARK GOES A LONG WAY</span><h2>What would you like to <em>make possible?</em></h2><p>Choose a starting point. Each idea opens the assistant with a prompt you can shape your own way.</p></div>
          <div className="idea-grid">{ideas.map((idea) => <article className="idea-card" key={idea.title}><span className="idea-category">{idea.category}</span><div className="idea-card-mark"><Sparkles size={20}/></div><h3>{idea.title}</h3><p>{idea.description}</p><button onClick={() => onDemo(idea.prompt)}>TRY THIS IDEA <ArrowUpRight size={15}/></button></article>)}</div>
        </section>

        <section className="landing-section technology-section" id="technology" data-landing-section>
          <div className="landing-section-heading"><span className="landing-kicker">BUILT FOR CURIOUS MINDS</span><h2>Powerful tools, <em>kept simple.</em></h2><p>BOON.SS brings a few useful capabilities together in one calm, focused workspace.</p></div>
          <div className="technology-grid">
            <article className="technology-card"><span className="technology-icon"><Sparkles size={20}/></span><div><h3>Helpful AI conversations</h3><p>Get streamed responses powered by Gemini, with room to refine your question and explore follow-ups.</p></div><span className="technology-index">01</span></article>
            <article className="technology-card"><span className="technology-icon"><Paperclip size={20}/></span><div><h3>Work with your material</h3><p>Attach supported text files or an image to give your prompt useful context.</p></div><span className="technology-index">02</span></article>
            <article className="technology-card"><span className="technology-icon"><Mic size={20}/></span><div><h3>Speak and listen</h3><p>Use your browser’s speech recognition to dictate and read assistant replies aloud.</p></div><span className="technology-index">03</span></article>
            <article className="technology-card"><span className="technology-icon"><BookOpen size={20}/></span><div><h3>Keep your ideas close</h3><p>Save useful prompts locally, and sign in to sync conversation history to your account.</p></div><span className="technology-index">04</span></article>
          </div>
          <p className="technology-note">Voice input depends on browser support, microphone permission, and an internet connection.</p>
        </section>

        <section className="landing-section journal-section" id="journal" data-landing-section>
          <div className="landing-section-heading"><span className="landing-kicker">FIELD NOTES FOR YOUR NEXT IDEA</span><h2>Small ways to get <em>unstuck.</em></h2><p>Try one of these practical starting points, then make it yours in chat.</p></div>
          <div className="journal-grid">{journalItems.map((item) => <article className="journal-card" key={item.number}><span className="journal-number">{item.number}</span><div><span className="idea-category">{item.tag}</span><h3>{item.title}</h3><p>{item.description}</p><button onClick={() => onDemo(item.prompt)}>EXPLORE THIS NOTE <ArrowUpRight size={15}/></button></div></article>)}</div>
        </section>

        <section className="landing-contact" id="contact" data-landing-section>
          <div className="contact-layout">
            <div className="contact-intro">
              <span className="landing-kicker">LET’S MAKE A CONNECTION</span>
              <h2>Have an idea?<br/><em>Let’s talk.</em></h2>
              <p>Have a project, opportunity, or just want to say hello? Send a note and I’ll get back to you.</p>
              <a className="contact-email" href="mailto:sonalsuryvanshi@95gmail.com"><Mail size={17}/> sonalsuryvanshi@95gmail.com <ArrowUpRight size={15}/></a>
              <div className="contact-socials">
                <span>FIND ME ELSEWHERE</span>
                <a href="https://www.linkedin.com/in/sonal-suryvanshi-45a400335" target="_blank" rel="noreferrer" aria-label="Sonal Suryvanshi on LinkedIn"><BriefcaseBusiness size={18}/><span>LinkedIn</span><ArrowUpRight size={14}/></a>
                <a href="https://github.com/Sonal-Suryvanshi10" target="_blank" rel="noreferrer" aria-label="Sonal Suryvanshi on GitHub"><Code2 size={18}/><span>GitHub</span><ArrowUpRight size={14}/></a>
              </div>
            </div>
            <form className="contact-form" onSubmit={submitContact}>
              <div className="contact-form-heading"><span>DROP A NOTE</span><small>Fields marked * are required</small></div>
              <div className="contact-form-row">
                <label>Your name *<input name="name" autoComplete="name" maxLength="100" placeholder="How should I call you?" required/></label>
                <label>Email address *<input name="email" type="email" autoComplete="email" maxLength="254" placeholder="you@example.com" required/></label>
              </div>
              <label>Subject<input name="subject" maxLength="160" placeholder="What would you like to discuss?"/></label>
              <label>Your message *<textarea name="message" rows="5" maxLength="5000" placeholder="Tell me a little about it…" required/></label>
              <label className="contact-honeypot" aria-hidden="true">Leave this field empty<input name="_gotcha" tabIndex="-1" autoComplete="off"/></label>
              {contactStatus.message && <p className={`contact-feedback ${contactStatus.type}`} role="status">{contactStatus.message}</p>}
              <button className="contact-submit" type="submit" disabled={contactBusy}>{contactBusy ? 'SENDING…' : 'SEND MESSAGE'} <Send size={16}/></button>
              <small className="contact-auto-reply">Your message is delivered privately. Your phone number is never shown on this page.</small>
            </form>
          </div>
        </section>
      </main>
      <div className="landing-foot">✦ &nbsp; BOON.SS · YOUR LITTLE SPARK OF GENIUS</div>
    </div>
  )
}

function Message({ message, onCopy, onSave, onSpeak, onShare, onEdit, onDelete, speaking, editing, editValue, setEditValue, saveEdit, cancelEdit, onRegenerate }) {
  const isAssistant = message.role === 'assistant'

  return (
    <article className={`message ${message.role}`}>
      <div
        className={`message-avatar ${isAssistant ? 'ai-avatar' : 'person-avatar'}`}
      >
        {isAssistant ? <Icon name="spark" size={15} /> : 'S'}
      </div>
      <div className="message-main">
        <div className={`message-content ${isAssistant ? '' : 'user-question'}`}>
          <div className="message-heading">
            <b>{isAssistant ? 'BOON.SS' : 'You'}</b>
            <span>{message.error ? 'Server issue' : 'Just now'}</span>
          </div>
          {editing ? <div className="message-edit"><textarea value={editValue} onChange={event => setEditValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); saveEdit() } if (event.key === 'Escape') cancelEdit() }} autoFocus /><div><button onClick={cancelEdit} aria-label="Cancel editing" title="Cancel editing"><Icon name="close" size={14}/></button><button onClick={saveEdit} aria-label="Save and regenerate" title="Save and regenerate"><Icon name="check" size={14}/></button></div></div> : <div className={`message-text ${message.error ? 'error-text' : ''}`}>{renderText(message.text || '')}</div>}
        </div>

        {isAssistant && message.text && (
          <div className="message-tools">
            <button onClick={() => onCopy(message.text)} aria-label="Copy response" title="Copy response">
              <Icon name="copy" size={14}/>
            </button>
            <button onClick={() => onSpeak(message.text)} aria-label={speaking ? 'Stop reading aloud' : 'Read response aloud'} title={speaking ? 'Stop reading aloud' : 'Read response aloud'}>
              <Icon name={speaking ? 'mute' : 'volume'} size={14}/>
            </button>
            <button onClick={() => onShare(message.text)} aria-label="Share response" title="Share response">
              <Icon name="share" size={14}/>
            </button>
            <button onClick={onRegenerate} aria-label="Regenerate response" title="Regenerate response">
              <Icon name="refresh" size={14}/>
            </button>
          </div>
        )}
        {!isAssistant && (
          <div className="message-tools">
            <button onClick={() => onSave(message.apiText || message.text)} aria-label="Save prompt" title="Save prompt">
              <Icon name="book" size={14}/>
            </button>
            <button onClick={() => onEdit(message.apiText || message.text, message)} aria-label="Edit question" title="Edit question"><Icon name="edit" size={14}/></button>
            <button onClick={onDelete} aria-label="Delete message" title="Delete message">
              <Icon name="trash" size={14}/>
            </button>
          </div>
        )}
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

function Conversation({ messages, busy, bottom, onCopy, onSave, onSpeak, onShare, onEdit, onDelete, speaking, editingId, editValue, setEditValue, saveEdit, cancelEdit, onRegenerate, onSelectPrompt }) {
  const isEmpty = messages.length === 0

  return (
    <section className={`conversation ${isEmpty ? 'empty-conversation' : ''}`}>
      {isEmpty ? (
        <Welcome onSelectPrompt={onSelectPrompt}/>
      ) : (
        <div className="message-list">
          {messages.map((message, index) => (
            <Message
              key={`${index}-${message.role}`}
              message={message}
              onCopy={onCopy}
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
              {listening && <span className="mic-status" role="status">Listening…</span>}
              <button
                className={`attach mic ${listening ? 'listening' : ''}`}
                aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                title={listening ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={listening}
                onClick={onVoiceInput}
              >
                <Icon name={listening ? 'stop' : 'mic'} size={17} />
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

function AuthDialog({
  authMode,
  setAuthMode,
  onClose,
  onSubmit,
  authBusy,
  authError,
  authDisplayName,
  setAuthDisplayName,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  setAuthError,
}) {
  const isSignup = authMode === 'signup'
  return (
    <div className="auth-overlay boon-auth-overlay" onClick={onClose}>
      <form className="auth-card boon-auth-card" onSubmit={onSubmit} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="auth-close" aria-label="Close" onClick={onClose}>×</button>
        <div className="auth-visual" aria-hidden="true"><span className="auth-orbit auth-orbit-one"/><span className="auth-orbit auth-orbit-two"/><span className="auth-core"><Icon name="spark" size={27}/></span><span className="auth-star auth-star-one">✦</span><span className="auth-star auth-star-two">✧</span></div>
        <div className="auth-kicker">YOUR IDEAS, AMPLIFIED</div>
        <h2>{isSignup ? 'Make room for more ideas.' : 'Welcome back.'}</h2>
        <p>{isSignup ? 'Create your BOON.SS account and keep your conversations close, wherever inspiration finds you.' : 'Sign in to pick up right where your curiosity left off.'}</p>
        {isSignup && <>
          <label htmlFor="auth-display-name">Your name</label>
          <input id="auth-display-name" name="displayName" type="text" autoComplete="name" maxLength="60" placeholder="Enter your name" required value={authDisplayName} onChange={(event) => setAuthDisplayName(event.target.value)} />
        </>}
        <label htmlFor="auth-email">Email</label>
        <input id="auth-email" name="email" type="email" autoComplete="email" placeholder="Enter your email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} />
        <label htmlFor="auth-password">Password</label>
        <div className="password-input-wrap">
          <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="Enter your password" minLength="8" required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
          <button type="button" className="password-visibility" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
        </div>
        {isSignup && <>
          <label htmlFor="auth-confirm-password">Confirm password</label>
          <div className="password-input-wrap">
            <input id="auth-confirm-password" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Confirm your password" minLength="8" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            <button type="button" className="password-visibility" aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} title={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword((visible) => !visible)}>{showConfirmPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
          </div>
        </>}
        {authError && <div className="auth-error">{authError}</div>}
        <button className="auth-submit" disabled={authBusy}>{authBusy ? 'Please wait…' : isSignup ? 'Create my account  ↗' : 'Sign in  ↗'}</button>
        <button type="button" className="auth-switch" onClick={() => { setAuthMode(isSignup ? 'signin' : 'signup'); setAuthError(''); setAuthPassword(''); setConfirmPassword(''); setShowPassword(false); setShowConfirmPassword(false) }}>{isSignup ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
      </form>
    </div>
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
  const [sessionView, setSessionView] = useState('active')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [profileNameOpen, setProfileNameOpen] = useState(false)
  const [profileNameDraft, setProfileNameDraft] = useState('')
  const [profileNameBusy, setProfileNameBusy] = useState(false)
  const [profileNameError, setProfileNameError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editingMessage, setEditingMessage] = useState(null)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('boon-auth') || 'null') ? [] : loadGuestSessions() } catch { return loadGuestSessions() }
  })

  const area = useRef(null)
  const inputRef = useRef(null)
  const bottom = useRef(null)
  const fileRef = useRef(null)
  const recognitionRef = useRef(null)
  const voiceBaseRef = useRef('')
  const voiceFinalRef = useRef('')
  const voiceAutoSendRef = useRef(false)
  const requestController = useRef(null)

  useEffect(
    () => () => {
      voiceAutoSendRef.current = false
      recognitionRef.current?.abort()
      recognitionRef.current = null
    },
    [],
  )

  useEffect(() => { if (!auth) localStorage.setItem('boon-demo-sessions', JSON.stringify(sessions)) }, [auth, sessions])
  useEffect(() => { if (auth) localStorage.setItem('boon-auth', JSON.stringify(auth)); else localStorage.removeItem('boon-auth') }, [auth])
  useEffect(() => {
    if (!auth?.token) return
    let cancelled = false
    fetch('/api/chats', { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body })
      .then(({ chats }) => { if (!cancelled) setSessions(chats.slice(0, 100).map((chat) => ({ status: 'active', ...chat }))) })
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
    setSessions((all) => [{ id: activeSessionId, title, messages, status: all.find((session) => session.id === activeSessionId)?.status || 'active' }, ...all.filter((session) => session.id !== activeSessionId)].slice(0, 100))
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
    (session.status || 'active') === sessionView && session.title.toLowerCase().includes(query.toLowerCase()),
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
    setSessionView('active')
    setProfileMenuOpen(false)
    setDrawer(false)
  }

  function openSession(session) {
    if (!sessions.some((item) => item.id === session.id)) return
    if (session.status === 'trash') return
    if (session.status === 'archived') void setSessionStatus(session, 'active')
    setSessionView('active')
    setActiveSessionId(session.id)
    setMessages(session.messages)
    setDrawer(false)
    setProfileMenuOpen(false)
  }

  async function setSessionStatus(session, status) {
    if (auth?.token) {
      try {
        const response = await fetch(`/api/chats/${encodeURIComponent(session.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify({ status }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not update this chat.')
      } catch (error) {
        showToast(error.message || 'Could not update this chat.', 3000)
        return false
      }
    }
    setSessions((all) => all.map((item) => item.id === session.id ? { ...item, status } : item))
    return true
  }

  async function archiveCurrentChat() {
    if (!auth?.token || !messages.length) return
    const id = activeSessionId || String(Date.now())
    const title = messages.find((message) => message.role === 'user')?.text?.split('\n')[0]?.slice(0, 34) || 'New conversation'
    const session = { id, title, messages, status: 'archived' }
    if (auth?.token) {
      try {
        const response = await fetch(`/api/chats/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify(session),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not archive this chat.')
      } catch (error) {
        showToast(error.message || 'Could not archive this chat.', 3000)
        return
      }
    }
    setSessions((all) => [session, ...all.filter((item) => item.id !== id)].slice(0, 100))
    setActiveSessionId(null)
    setMessages([])
    setInput('')
    setSessionView('archived')
    setProfileMenuOpen(false)
    setDrawer(false)
    showToast('Chat archived')
  }

  async function moveSessionToTrash(session) {
    if (!auth) return
    if (await setSessionStatus(session, 'trash')) {
      if (activeSessionId === session.id) { setActiveSessionId(null); setMessages([]); setInput('') }
      showToast('Chat moved to trash')
    }
  }

  async function restoreSession(session) {
    if (await setSessionStatus(session, 'active')) showToast('Chat restored')
  }

  async function permanentlyDeleteSession(session) {
    if (!auth?.token) return
    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(session.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not permanently delete this chat.')
      setSessions((all) => all.filter((item) => item.id !== session.id))
      if (activeSessionId === session.id) { setActiveSessionId(null); setMessages([]); setInput('') }
      showToast('Chat permanently deleted')
    } catch (error) {
      showToast(error.message || 'Could not permanently delete this chat.', 3000)
    }
  }

  function goToHome() {
    setShowLanding(true)
    setDrawer(false)
    setProfileMenuOpen(false)
  }

  function openProfileFromLanding() {
    setShowLanding(false)
    setDrawer(true)
    setProfileMenuOpen(false)
  }

  function openProfileNameEditor() {
    setProfileNameDraft(auth?.user?.displayName || '')
    setProfileNameError('')
    setProfileNameOpen(true)
    setProfileMenuOpen(false)
  }

  async function saveProfileName(event) {
    event.preventDefault()
    if (!auth?.token) return
    setProfileNameBusy(true)
    setProfileNameError('')
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ displayName: profileNameDraft }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update your profile name.')
      setAuth((current) => ({ ...current, user: { ...current.user, displayName: result.displayName } }))
      setProfileNameOpen(false)
      showToast('Profile name updated')
    } catch (error) {
      setProfileNameError(error.message || 'Could not update your profile name.')
    } finally {
      setProfileNameBusy(false)
    }
  }

  function logout() {
    setAuth(null)
    setSessions(loadGuestSessions())
    setSessionView('active')
    setMessages([])
    setActiveSessionId(null)
    setInput('')
    setShowSaved(false)
    setProfileMenuOpen(false)
    setDrawer(false)
    setShowLanding(true)
    showToast('Logged out')
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
    if (!auth && guestUsage >= 7) { openAuthDialog('signup'); setAuthError('Aapke 7 free demo messages complete ho gaye. Continue karne ke liye signup ya login karein.'); return }
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
      voiceBaseRef.current = input
      voiceFinalRef.current = ''
      voiceAutoSendRef.current = true
      recognition.lang = navigator.languages?.[0] || navigator.language || 'en-US'
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      recognition.onstart = () => {
        setListening(true)
        showToast('Listening… your message sends when you finish speaking', 2800)
      }
      recognition.onresult = (event) => {
        let interimTranscript = ''
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]
          const transcript = result[0]?.transcript?.trim()
          if (!transcript) continue
          if (result.isFinal) {
            voiceFinalRef.current = [voiceFinalRef.current, transcript].filter(Boolean).join(' ')
          } else {
            interimTranscript = [interimTranscript, transcript].filter(Boolean).join(' ')
          }
        }
        const transcript = [voiceFinalRef.current, interimTranscript].filter(Boolean).join(' ')
        setInput([voiceBaseRef.current, transcript].filter(Boolean).join(voiceBaseRef.current && transcript ? ' ' : ''))
      }
      recognition.onerror = (event) => {
        voiceAutoSendRef.current = false
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
        const transcript = voiceFinalRef.current
        const prompt = [voiceBaseRef.current, transcript].filter(Boolean).join(voiceBaseRef.current && transcript ? ' ' : '')
        const shouldSend = voiceAutoSendRef.current && Boolean(transcript)
        voiceAutoSendRef.current = false
        if (transcript) setInput(prompt)
        recognitionRef.current = null
        setListening(false)
        if (shouldSend) void submit(prompt)
      }
      recognition.start()
    } catch {
      voiceAutoSendRef.current = false
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
      if (!auth && guestUsage >= 7) { openAuthDialog('signup'); setAuthError('Aapke 7 free demo messages complete ho gaye. Continue karne ke liye signup ya login karein.') } else submit()
    }
  }

  async function handleAuth(event) {
    event.preventDefault()
    if (authMode === 'signup') {
      if (authPassword !== confirmPassword) { setAuthError('Passwords do not match.'); return }
      if (!authDisplayName.trim()) { setAuthError('Enter your name to create an account.'); return }
    }
    setAuthBusy(true); setAuthError('')
    try {
      const body = { email: authEmail, password: authPassword }
      if (authMode === 'signup') body.displayName = authDisplayName.trim()
      const response = await fetch(`/api/auth/${authMode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not sign in')
      setAuth(result); setSessions([]); setSessionView('active'); setProfileMenuOpen(false); setAuthOpen(false); setAuthPassword(''); setConfirmPassword(''); setMessages([]); setActiveSessionId(null); showToast('Cloud chat sync is on')
      setGuestUsage(0); localStorage.removeItem('boon-guest-usage')
    } catch (error) { setAuthError(error.message) } finally { setAuthBusy(false) }
  }

  function openAuthDialog(mode = 'signin') {
    setAuthMode(mode)
    setAuthError('')
    setAuthPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setAuthOpen(true)
  }

  function renderAuthDialog() {
    return <AuthDialog
      authMode={authMode}
      setAuthMode={setAuthMode}
      onClose={() => setAuthOpen(false)}
      onSubmit={handleAuth}
      authBusy={authBusy}
      authError={authError}
      authDisplayName={authDisplayName}
      setAuthDisplayName={setAuthDisplayName}
      authEmail={authEmail}
      setAuthEmail={setAuthEmail}
      authPassword={authPassword}
      setAuthPassword={setAuthPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      showConfirmPassword={showConfirmPassword}
      setShowConfirmPassword={setShowConfirmPassword}
      setAuthError={setAuthError}
    />
  }

  if (showLanding) return <><Landing isAuthenticated={Boolean(auth?.token)} onDemo={(prompt) => { setMessages([]); setActiveSessionId(null); setInput(prompt || ''); setShowLanding(false); requestAnimationFrame(() => inputRef.current?.focus()) }} onProfile={openProfileFromLanding} onLogin={() => openAuthDialog('signin')} />{authOpen && renderAuthDialog()}</>

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
        activeSessionId={activeSessionId}
        sessionView={sessionView}
        setSessionView={(view) => { setSessionView(view); setProfileMenuOpen(false) }}
        profileMenuOpen={profileMenuOpen}
        setProfileMenuOpen={setProfileMenuOpen}
        canArchiveCurrent={Boolean(auth?.token && messages.length)}
        onArchiveCurrent={archiveCurrentChat}
        onMoveToTrash={moveSessionToTrash}
        onRestoreSession={restoreSession}
        onPermanentDelete={permanentlyDeleteSession}
        onLogout={logout}
        onGoHome={goToHome}
        onEditProfile={openProfileNameEditor}
        onOpenLogin={() => openAuthDialog('signin')}
        submit={submit}
        authUser={auth?.user}
      />

      <main className="main-panel">
        <Header setDrawer={setDrawer} onGoHome={goToHome} />
        <Conversation
          messages={messages}
          busy={busy}
          bottom={bottom}
          onDemo={(prompt) => { if (prompt) setInput(prompt); setMessages([]); setActiveSessionId(null); requestAnimationFrame(() => inputRef.current?.focus()) }}
          onLogin={() => openAuthDialog('signin')}
          onCopy={copy}
          onSave={savePrompt}
          onSpeak={readAloud}
          onShare={shareReply}
          onEdit={editPrompt}
          onDelete={deleteMessage}
          speaking={speaking}
          editingId={editingId ? messages.findIndex(message => message.id === editingId) : messages.indexOf(editingMessage)} editValue={editValue} setEditValue={setEditValue} saveEdit={saveEdit} cancelEdit={() => { setEditingMessage(null); setEditingId(null) }} onRegenerate={regenerate}
          onSelectPrompt={(prompt) => { setInput(prompt); inputRef.current?.focus() }}
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

      {profileNameOpen && (
        <div className="auth-overlay" onClick={() => setProfileNameOpen(false)}>
          <form className="auth-card profile-name-card" onSubmit={saveProfileName} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="auth-close" aria-label="Close" onClick={() => setProfileNameOpen(false)}>×</button>
            <div className="auth-kicker">YOUR PROFILE</div>
            <h2>Choose your name.</h2>
            <p>This name appears in your BOON.SS profile.</p>
            <label htmlFor="profile-display-name">Display name</label>
            <input id="profile-display-name" name="displayName" maxLength="60" required value={profileNameDraft} onChange={(event) => setProfileNameDraft(event.target.value)} />
            {profileNameError && <div className="auth-error">{profileNameError}</div>}
            <button className="auth-submit" disabled={profileNameBusy}>{profileNameBusy ? 'Saving…' : 'Save name ↗'}</button>
          </form>
        </div>
      )}

      {authOpen && renderAuthDialog()}
      {toast && (
        <div className="toast">
          <Icon name="check" size={15} />
          {toast}
        </div>
      )}
    </div>
  )
}
