'use client'

// next/font loads fonts at build time — zero layout shift, no external requests at runtime
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { useEffect } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react';

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-syne',
})
const dm = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm',
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

// ── Static data ───────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Features',     href: '#features'     },
  { label: 'Tech Stack',   href: '#stack'         },
]

const STEPS = [
  {
    num: '01', icon: '🎯',
    title: 'Choose Your Battle',
    desc:  'Pick a domain, set difficulty, and optionally target a company style. Google, Amazon — you choose.',
  },
  {
    num: '02', icon: '🎙️',
    title: 'Speak Your Answer',
    desc:  'Hit record and answer naturally. faster-whisper transcribes every word locally in under 5 seconds.',
  },
  {
    num: '03', icon: '🤖',
    title: 'AI Scores Deeply',
    desc:  'Ollama (llama3.2) evaluates technical accuracy, clarity, completeness, and STAR alignment.',
  },
  {
    num: '04', icon: '📈',
    title: 'Level Up Fast',
    desc:  'Read your ideal answer, track filler word habits, and watch your scores improve session by session.',
  },
]

const FEATURES = [
  { icon: '⚡', tag: 'LIVE',   title: 'Real-time Transcription', desc: 'faster-whisper converts speech to text locally with under 5-second latency. Works fully offline.' },
  { icon: '🎯', tag: 'AI',    title: '4-Dimension Scoring',     desc: 'Technical accuracy, communication clarity, STAR method alignment, and answer completeness — all scored.' },
  { icon: '🔍', tag: 'SOON',  title: 'Filler Word Detection',   desc: 'vosk catches every "um", "uh", and "like" in real time. Eliminate verbal habits before the real interview.' },
  { icon: '🧠', tag: 'AI',    title: 'Ideal Answer Generation', desc: 'See exactly how a top candidate answers the same question. Benchmark yourself against the best.' },
  { icon: '📊', tag: 'STATS',  title: 'Progress Analytics',      desc: 'Chart.js dashboards track your scores over time. Watch yourself get sharper every session.' },
  { icon: '🔒', tag: 'LOCAL', title: '100% Private & Local',    desc: 'Every model runs on your machine. Your answers never leave your computer. Zero cloud costs, forever.' },
]

const STACK = [
  { name: 'Next.js 14',       role: 'Frontend',    color: '#ffffff' },
  { name: 'FastAPI',          role: 'Backend',     color: '#00d4aa' },
  { name: 'PostgreSQL',       role: 'Database',    color: '#4a9eda' },
  { name: 'faster-whisper',   role: 'Speech AI',   color: '#00ff87' },
  { name: 'Ollama llama3.2',  role: 'LLM',         color: '#ff7b45' },
  { name: 'LangChain + FAISS',role: 'RAG Pipeline',color: '#a78bfa' },
  { name: 'Celery + Redis',   role: 'Task Queue',  color: '#ef4444' },
  { name: 'WebSockets',       role: 'Real-time',   color: '#00d4aa' },
]

const STATS = [
  { val: '< 5s',  label: 'Transcription Latency' },
  { val: '4',     label: 'Scoring Dimensions'    },
  { val: '100%',  label: 'Runs Locally'          },
  { val: '₹0',    label: 'Cloud Costs'           },
]

// Deterministic waveform bar heights (avoids hydration mismatch from Math.random)
const WAVE_HEIGHTS = [
  8,14,26,40,52,46,32,18,10,6,16,30,48,54,42,24,12,8,
  18,36,50,44,28,14,8,12,28,44,56,48,30,16,10,6,
  20,38,52,46,26,12,8,16,32,48,40,22,10,6,
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {

  // Cursor glow — update CSS custom properties on every mouse move
  // (CSS handles the glow itself — zero React re-renders)
  useEffect(() => {
    const onMove = (e) => {
      document.documentElement.style.setProperty('--cx', `${e.clientX}px`)
      document.documentElement.style.setProperty('--cy', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <>
      {/* Global styles moved to globals.css for central management */}

      {/* ── Ambient layer ──────────────────────────────────────────────────── */}
      <div className="noise" />
      <div className="c-glow" />
      <div className="scan-line" />

      {/* ── Background orbs ──────────────────────────────────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{zIndex:0}}>
        <div className="orb-a absolute rounded-full"
          style={{width:640,height:640,top:-160,left:-220,opacity:.16,
            background:'radial-gradient(circle,#00d4aa 0%,transparent 68%)'}} />
        <div className="orb-b absolute rounded-full"
          style={{width:880,height:880,top:'28%',right:-360,opacity:.11,
            background:'radial-gradient(circle,#00ff87 0%,transparent 68%)'}} />
        <div className="orb-c absolute rounded-full"
          style={{width:560,height:560,bottom:-120,left:'32%',opacity:.09,
            background:'radial-gradient(circle,#ff7b45 0%,transparent 68%)'}} />
      </div>

      {/* ── Page root ──────────────────────────────────────────────────────── */}
      <div className={`${syne.variable} ${dm.variable} ${mono.variable} bg-grid relative`}
        style={{background:'var(--bg)',color:'var(--text)',minHeight:'100vh',position:'relative',zIndex:1}}>

        {/* ══ NAV ══════════════════════════════════════════════════════════ */}
        <nav className="nav-glass fixed top-0 left-0 right-0" style={{zIndex:50}}>
          <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px',height:64,
            display:'flex',alignItems:'center',justifyContent:'space-between'}}>

            {/* Logo */}
            <Link href="/" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none'}}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'linear-gradient(135deg,#00d4aa,#00ff87)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#020b0e'
                }}
              >
                <Zap size={16} strokeWidth={2.5} />
              </div>
              <span style={{fontFamily:'var(--font-syne)',fontWeight:700,fontSize:14,
                letterSpacing:'.02em',color:'var(--text)'}}>
                Interview<span style={{color:'var(--accent)'}}>Coach</span>
              </span>
            </Link>

            {/* Links */}
            <div style={{display:'flex',alignItems:'center',gap:36}} className="hidden-mobile">
              {NAV_LINKS.map(l => (
                <a key={l.label} href={l.href} className="nav-link">{l.label}</a>
              ))}
            </div>

            {/* Actions */}
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <Link href="/login" style={{textDecoration:'none'}}>
                <button className="btn-s" style={{padding:'8px 18px',borderRadius:10,fontSize:13,cursor:'pointer'}}>
                  Sign In
                </button>
              </Link>
              <Link href="/register" style={{textDecoration:'none'}}>
                <button className="btn-p" style={{padding:'8px 20px',borderRadius:10,fontSize:13,cursor:'pointer'}}>
                  <span>Get Started</span>
                </button>
              </Link>
            </div>
          </div>
        </nav>

        {/* ══ HERO ═════════════════════════════════════════════════════════ */}
        <section style={{display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',textAlign:'center',
          padding:'100px 24px 60px',position:'relative',minHeight:'auto'}}>

          {/* Status badge */}
          <div className="fi1" style={{marginBottom:24}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:8,
              padding:'7px 18px',borderRadius:999,fontSize:11,
              fontFamily:'var(--font-mono)',
              background:'rgba(0,212,170,0.07)',
              border:'1px solid rgba(0,212,170,0.22)',
              color:'var(--accent)'}}>
              100% Local &nbsp;·&nbsp; Zero Cloud Costs &nbsp;·&nbsp; Built at NSUT Delhi
            </span>
          </div>

          {/* Headline */}
          <h1 className="fi2" style={{
            fontFamily:'var(--font-syne)',fontWeight:800,
            fontSize:'clamp(2.6rem, 7vw, 5.5rem)',
            lineHeight:1.04,letterSpacing:'-.035em',
            maxWidth:860,marginBottom:24}}>
            <span style={{color:'var(--text)'}}>Your Placement</span><br />
            <span className="shimmer-text">Interview, Mastered.</span>
          </h1>

          {/* Subheading */}
          <p className="fi3" style={{
            fontFamily:'var(--font-dm)',fontSize:'clamp(1rem,2vw,1.2rem)',
            color:'var(--muted)',lineHeight:1.7,maxWidth:500,marginBottom:36}}>
            Speak your answers. Get real-time AI transcription, filler word analysis,
            and 4-dimension scoring — all running privately on your machine.
          </p>

          {/* CTA buttons */}
          <div className="fi4" style={{display:'flex',flexWrap:'wrap',gap:14,
            justifyContent:'center',marginBottom:52}}>
            <Link href="/register" style={{textDecoration:'none'}}>
              <button className="btn-p" style={{
                padding:'14px 34px',borderRadius:14,fontSize:15,cursor:'pointer'}}>
                <span>Start Practicing Free →</span>
              </button>
            </Link>
            <a href="#how-it-works" style={{textDecoration:'none'}}>
              <button className="btn-s" style={{
                padding:'14px 34px',borderRadius:14,fontSize:15,cursor:'pointer'}}>
                See How It Works
              </button>
            </a>
          </div>

          {/* ── Animated waveform ── */}
          <div className="fi5" style={{
            display:'flex',flexDirection:'column',alignItems:'center',gap:12,
            marginBottom:48}}>
            <div style={{
              display:'flex',alignItems:'flex-end',gap:4,
              height:72,padding:'12px 24px',borderRadius:20,
              background:'rgba(0,212,170,0.04)',
              border:'1px solid rgba(0,212,170,0.1)'}}>
              {WAVE_HEIGHTS.map((h, i) => (
                <div key={i} className="wbar" style={{
                  '--wh': `${h}px`,
                  '--wd': `${0.75 + (i % 7) * 0.1}s`,
                  animationDelay: `${i * 0.042}s`,
                }} />
              ))}
            </div>
            <p style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--muted)',
              letterSpacing:'.06em'}}>
              LIVE TRANSCRIPTION &nbsp;·&nbsp; FASTER-WHISPER &nbsp;·&nbsp; RUNNING LOCALLY
            </p>
          </div>

          {/* Stat pills */}
          <div className="fi6" style={{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'center'}}>
            {STATS.map(s => (
              <div key={s.label} className="g-card" style={{
                padding:'14px 22px',borderRadius:16,textAlign:'center',minWidth:110}}>
                <div className="stat-num" style={{
                  fontFamily:'var(--font-syne)',fontWeight:800,fontSize:'1.4rem',
                  color:'var(--accent)',lineHeight:1}}>
                  {s.val}
                </div>
                <div style={{fontFamily:'var(--font-dm)',fontSize:11,
                  color:'var(--muted)',marginTop:4,letterSpacing:'.02em'}}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="divider" style={{margin:'0 80px'}} />

        {/* ══ HOW IT WORKS ════════════════════════════════════════════════ */}
        <section id="how-it-works" style={{padding:'112px 24px'}}>
          <div style={{maxWidth:1160,margin:'0 auto'}}>

            <div style={{textAlign:'center',marginBottom:72}}>
              <p style={{fontFamily:'var(--font-mono)',fontSize:11,
                color:'var(--accent)',letterSpacing:'.14em',
                textTransform:'uppercase',marginBottom:14}}>
                The Process
              </p>
              <h2 style={{fontFamily:'var(--font-syne)',fontWeight:700,
                fontSize:'clamp(1.9rem,4vw,3.2rem)',letterSpacing:'-.025em',
                color:'var(--text)',lineHeight:1.1}}>
                Four steps to{' '}
                <span style={{color:'var(--accent)'}}>interview mastery</span>
              </h2>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:20}}>
              {STEPS.map((step, i) => (
                <div key={step.num} style={{position:'relative'}}>
                  {/* Connector line between steps */}
                  {i < STEPS.length - 1 && (
                    <div className="step-connector" />
                  )}
                  <div className="g-card" style={{borderRadius:20,padding:24,height:'100%'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
                      <div style={{
                        width:52,height:52,borderRadius:14,fontSize:24,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        flexShrink:0,
                        background:'rgba(0,212,170,0.07)',
                        border:'1px solid rgba(0,212,170,0.14)'}}>
                        {step.icon}
                      </div>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:11,
                        color:'var(--muted)',letterSpacing:'.06em'}}>
                        {step.num}
                      </span>
                    </div>
                    <h3 style={{fontFamily:'var(--font-syne)',fontWeight:700,
                      fontSize:'1.05rem',color:'var(--text)',
                      letterSpacing:'-.01em',marginBottom:10}}>
                      {step.title}
                    </h3>
                    <p style={{fontFamily:'var(--font-dm)',fontSize:'.875rem',
                      color:'var(--muted)',lineHeight:1.65}}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="divider" style={{margin:'0 80px'}} />

        {/* ══ FEATURES ════════════════════════════════════════════════════ */}
        <section id="features" style={{padding:'112px 24px'}}>
          <div style={{maxWidth:1160,margin:'0 auto'}}>

            <div style={{textAlign:'center',marginBottom:72}}>
              <p style={{fontFamily:'var(--font-mono)',fontSize:11,
                color:'var(--accent)',letterSpacing:'.14em',
                textTransform:'uppercase',marginBottom:14}}>
                Capabilities
              </p>
              <h2 style={{fontFamily:'var(--font-syne)',fontWeight:700,
                fontSize:'clamp(1.9rem,4vw,3.2rem)',letterSpacing:'-.025em',
                color:'var(--text)',lineHeight:1.1}}>
                Everything you need to{' '}
                <span style={{color:'#00ff87'}}>get placed</span>
              </h2>
            </div>

            <div style={{display:'grid',
              gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:18}}>
              {FEATURES.map(f => {
                const tagCls = {
                  LIVE: 'tag-live', AI: 'tag-ai',
                  SOON: 'tag-soon', LOCAL: 'tag-local',
                  STATS: 'tag-stats'
                }[f.tag]
                return (
                  <div key={f.title} className="g-card" style={{borderRadius:20,padding:26}}>
                    <div style={{display:'flex',alignItems:'flex-start',
                      justifyContent:'space-between',marginBottom:18}}>
                      <div style={{
                        width:52,height:52,borderRadius:14,fontSize:24,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        background:'rgba(0,212,170,0.06)',
                        border:'1px solid rgba(0,212,170,0.1)'}}>
                        {f.icon}
                      </div>
                      <span className={tagCls} style={{
                        fontSize:10,fontFamily:'var(--font-mono)',
                        padding:'4px 9px',borderRadius:7,
                        letterSpacing:'.08em',fontWeight:500}}>
                        {f.tag}
                      </span>
                    </div>
                    <h3 style={{fontFamily:'var(--font-syne)',fontWeight:700,
                      fontSize:'1rem',color:'var(--text)',marginBottom:10}}>
                      {f.title}
                    </h3>
                    <p style={{fontFamily:'var(--font-dm)',fontSize:'.875rem',
                      color:'var(--muted)',lineHeight:1.65}}>
                      {f.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <div className="divider" style={{margin:'0 80px'}} />

        {/* ══ TECH STACK ══════════════════════════════════════════════════ */}
        <section id="stack" style={{padding:'112px 24px'}}>
          <div style={{maxWidth:860,margin:'0 auto',textAlign:'center'}}>

            <p style={{fontFamily:'var(--font-mono)',fontSize:11,
              color:'var(--accent)',letterSpacing:'.14em',
              textTransform:'uppercase',marginBottom:14}}>
              Under the Hood
            </p>
            <h2 style={{fontFamily:'var(--font-syne)',fontWeight:700,
              fontSize:'clamp(1.9rem,4vw,3.2rem)',letterSpacing:'-.025em',
              color:'var(--text)',lineHeight:1.1,marginBottom:16}}>
              Built with the{' '}
              <span style={{color:'var(--accent)'}}>right tools</span>
            </h2>
            <p style={{fontFamily:'var(--font-dm)',fontSize:'1rem',
              color:'var(--muted)',maxWidth:460,margin:'0 auto 56px',lineHeight:1.65}}>
              Every component chosen for performance, privacy, and zero recurring cost.
            </p>

            <div style={{display:'flex',flexWrap:'wrap',
              justifyContent:'center',gap:12}}>
              {STACK.map(s => (
                <div key={s.name} className="s-pill"
                  style={{padding:'12px 20px',borderRadius:14,
                    display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:9,height:9,borderRadius:'50%',flexShrink:0,
                    background:s.color,
                    boxShadow:`0 0 8px ${s.color}80`}} />
                  <div style={{textAlign:'left'}}>
                    <div style={{fontFamily:'var(--font-syne)',fontWeight:600,
                      fontSize:'.875rem',color:'var(--text)'}}>
                      {s.name}
                    </div>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:10,
                      color:'var(--muted)',marginTop:1}}>
                      {s.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="divider" style={{margin:'0 80px'}} />

        {/* ══ FINAL CTA ════════════════════════════════════════════════════ */}
        <section style={{padding:'100px 24px'}}>
          <div style={{maxWidth:820,margin:'0 auto'}}>
            <div className="g-card cta-glow"
              style={{borderRadius:28,padding:'64px 48px',
                textAlign:'center',position:'relative',overflow:'hidden'}}>

              {/* Inner glow */}
              <div style={{position:'absolute',inset:0,pointerEvents:'none',
                background:'radial-gradient(ellipse at 50% 0%, rgba(0,212,170,0.07) 0%, transparent 65%)'}} />

              {/* Corner decorations */}
              <div style={{position:'absolute',top:0,left:0,width:120,height:120,
                background:'radial-gradient(circle at 0% 0%, rgba(0,212,170,0.08), transparent 70%)'}} />
              <div style={{position:'absolute',bottom:0,right:0,width:120,height:120,
                background:'radial-gradient(circle at 100% 100%, rgba(0,255,135,0.06), transparent 70%)'}} />

              <div style={{position:'relative',zIndex:1}}>
                <p style={{fontFamily:'var(--font-mono)',fontSize:11,
                  color:'var(--accent)',letterSpacing:'.14em',
                  textTransform:'uppercase',marginBottom:18}}>
                  Ready to begin?
                </p>
                <h2 style={{fontFamily:'var(--font-syne)',fontWeight:800,
                  fontSize:'clamp(1.8rem,4vw,3rem)',
                  letterSpacing:'-.03em',lineHeight:1.1,
                  color:'var(--text)',marginBottom:16}}>
                  Stop rehearsing in your head.{' '}
                  <span style={{color:'var(--accent)'}}>Practice for real.</span>
                </h2>
                <p style={{fontFamily:'var(--font-dm)',fontSize:'1.05rem',
                  color:'var(--muted)',maxWidth:440,margin:'0 auto 36px',lineHeight:1.65}}>
                  No API keys, no subscriptions, no internet required after setup.
                  Just you and the AI — training for the interview that matters.
                </p>
                <div style={{display:'flex',flexWrap:'wrap',gap:14,justifyContent:'center'}}>
                  <Link href="/register" style={{textDecoration:'none'}}>
                    <button className="btn-p"
                      style={{padding:'15px 40px',borderRadius:14,fontSize:15,cursor:'pointer'}}>
                      <span>Create Free Account →</span>
                    </button>
                  </Link>
                  <Link href="/login" style={{textDecoration:'none'}}>
                    <button className="btn-s"
                      style={{padding:'15px 40px',borderRadius:14,fontSize:15,cursor:'pointer'}}>
                      Sign In
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
        <footer style={{
          borderTop:'1px solid rgba(0,212,170,0.07)',
          padding:'32px 24px'}}>
          <div style={{maxWidth:1160,margin:'0 auto',
            display:'flex',flexWrap:'wrap',
            alignItems:'center',justifyContent:'space-between',gap:16}}>

            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:28,height:28,borderRadius:8,
                background:'linear-gradient(135deg,#00d4aa,#00ff87)',
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontFamily:'var(--font-mono)',fontSize:9,
                  fontWeight:700,color:'#020b0e'}}>AI</span>
              </div>
              <span style={{fontFamily:'var(--font-syne)',fontWeight:600,
                fontSize:13,color:'var(--muted)'}}>
                AI Interview Coach
              </span>
            </div>

            <p style={{fontFamily:'var(--font-mono)',fontSize:11,
              color:'var(--muted)',textAlign:'center'}}>
              Built with ♥ by Divya &nbsp;—&nbsp; BTech CSE, NSUT Delhi
            </p>

            <div style={{display:'flex',alignItems:'center',gap:7,
              fontFamily:'var(--font-mono)',fontSize:11,color:'var(--muted)'}}>
              <span style={{width:7,height:7,borderRadius:'50%',
                background:'#00ff87',boxShadow:'0 0 6px #00ff87',
                display:'inline-block',
                animation:'wave .9s ease-in-out infinite'}} />
              All systems local
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}