'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase, type Session, type Analysis } from '@/lib/supabase';

type SessionState = 'loading' | 'invite' | 'input' | 'waiting' | 'analyzing' | 'reveal' | 'error';

type SessionData = {
  session: Session;
  inputs: { role: string; locked_at: string }[];
  analysis: Analysis | null;
};

export default function SessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  
  const role = searchParams.get('role') as 'creator' | 'partner' | null;
  const nameFromQuery = searchParams.get('name') || '';
  
  const [state, setState] = useState<SessionState>('loading');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [myName, setMyName] = useState(nameFromQuery);
  const [myInput, setMyInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealStage, setRevealStage] = useState(0);
  const [error, setError] = useState('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Determine my role
  const myRole = role || 'partner';

  // Fetch session data
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${slug}`);
      if (!res.ok) {
        setState('error');
        setError('Session not found');
        return;
      }
      const data: SessionData = await res.json();
      setSessionData(data);

      const myInputExists = data.inputs.some(i => i.role === myRole);
      const bothIn = data.inputs.some(i => i.role === 'creator') && data.inputs.some(i => i.role === 'partner');

      if (data.session.status === 'complete' && data.analysis) {
        setState('reveal');
        return;
      }
      if (data.session.status === 'analyzing') {
        setState('analyzing');
        return;
      }
      if (myInputExists) {
        setHasSubmitted(true);
        if (bothIn) {
          setState('analyzing');
          // Trigger analysis
          triggerAnalysis();
        } else {
          setState('waiting');
        }
        return;
      }
      if (myRole === 'partner' && !myName) {
        setState('invite');
        return;
      }
      setState('input');
    } catch (err) {
      setState('error');
      setError('Failed to load session');
    }
  }, [slug, myRole, myName]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Poll for updates when waiting
  useEffect(() => {
    if (state === 'waiting' || state === 'analyzing') {
      pollRef.current = setInterval(async () => {
        const res = await fetch(`/api/sessions/${slug}`);
        if (!res.ok) return;
        const data: SessionData = await res.json();
        setSessionData(data);

        if (data.session.status === 'complete' && data.analysis) {
          setState('reveal');
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }

        const bothIn = data.inputs.some(i => i.role === 'creator') && data.inputs.some(i => i.role === 'partner');
        if (bothIn && data.session.status === 'both_locked') {
          setState('analyzing');
          triggerAnalysis();
        }
      }, 3000);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [state, slug]);

  // Also subscribe to realtime updates
  useEffect(() => {
    if (!sessionData?.session?.id) return;

    const channel = supabase
      .channel(`session-${sessionData.session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionData.session.id}` },
        (payload) => {
          const updated = payload.new as Session;
          setSessionData(prev => prev ? { ...prev, session: updated } : null);
          if (updated.status === 'complete') {
            fetchSession(); // Refetch to get analysis
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionData?.session?.id]);

  async function triggerAnalysis() {
    try {
      const res = await fetch(`/api/sessions/${slug}/analyze`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.analysis) {
          setSessionData(prev => prev ? { ...prev, analysis: data.analysis, session: { ...prev.session, status: 'complete' } } : null);
          setState('reveal');
        }
      }
    } catch (err) {
      console.error('Analysis trigger error:', err);
    }
  }

  async function handleJoinAsPartner() {
    if (!myName.trim()) return;
    setState('input');
  }

  async function handleSubmit() {
    if (!myInput.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/sessions/${slug}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: myRole,
          content: myInput.trim(),
          name: myName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit');
        setIsSubmitting(false);
        return;
      }

      setHasSubmitted(true);
      if (data.both_submitted) {
        setState('analyzing');
        triggerAnalysis();
      } else {
        setState('waiting');
      }
    } catch (err) {
      setError('Failed to submit');
      setIsSubmitting(false);
    }
  }

  function getShareUrl() {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/session/${slug}`;
  }

  async function handleShare() {
    const url = getShareUrl();
    const creatorName = sessionData?.session?.creator_name || 'Someone';
    const topic = sessionData?.session?.topic || '';
    const shareText = `${creatorName} wants to Engage — "${topic}"`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Engage', text: shareText, url });
        return;
      } catch (e) {
        // Fallback to copy
      }
    }

    await navigator.clipboard.writeText(`${shareText}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // Reveal animation stages
  useEffect(() => {
    if (state === 'reveal') {
      const timers = [
        setTimeout(() => setRevealStage(1), 300),   // headline
        setTimeout(() => setRevealStage(2), 800),   // common ground
        setTimeout(() => setRevealStage(3), 1300),  // divergence
        setTimeout(() => setRevealStage(4), 1800),  // recommendation
        setTimeout(() => setRevealStage(5), 2300),  // reasoning
        setTimeout(() => setRevealStage(6), 2800),  // tradeoffs
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [state]);

  // ═══════════════════════════════════════
  // RENDER STATES
  // ═══════════════════════════════════════

  if (state === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-2 border-engage-primary/30 border-t-engage-primary rounded-full animate-spin" />
          <p className="text-engage-muted mt-4">Loading session...</p>
        </div>
      </Shell>
    );
  }

  if (state === 'error') {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="font-display text-2xl font-bold mb-2">Session Not Found</h2>
          <p className="text-engage-muted">{error || 'This link may have expired or is invalid.'}</p>
          <a href="/" className="mt-6 text-engage-primary hover:text-engage-primary-light transition-colors">
            Start a new Engage →
          </a>
        </div>
      </Shell>
    );
  }

  // ═══ INVITE LANDING (Partner sees this first) ═══
  if (state === 'invite') {
    return (
      <Shell>
        <div className="max-w-lg mx-auto text-center animate-fade-up">
          <div className="mb-6">
            <span className="inline-block px-3 py-1 bg-engage-primary/10 border border-engage-primary/20 rounded-full text-engage-primary text-sm font-medium">
              You've been invited
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
            <span className="text-gradient">{sessionData?.session.creator_name}</span> wants to Engage
          </h1>

          <div className="glass rounded-2xl p-6 mb-8 text-left">
            <div className="text-engage-muted text-sm mb-2 font-medium uppercase tracking-wider">Topic</div>
            <p className="text-engage-text text-lg leading-relaxed">{sessionData?.session.topic}</p>
          </div>

          <p className="text-engage-muted mb-6 text-sm leading-relaxed max-w-sm mx-auto">
            Share your perspective independently. Neither of you will see the other's input until AI analyzes both sides together.
          </p>

          <div className="max-w-xs mx-auto">
            <input
              type="text"
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
              placeholder="Your name"
              maxLength={30}
              className="w-full px-4 py-3.5 bg-engage-card border border-engage-border rounded-xl text-engage-text placeholder:text-engage-subtle focus:border-engage-primary focus:ring-1 focus:ring-engage-primary/50 transition-all outline-none mb-4 text-center"
            />
            <button
              onClick={handleJoinAsPartner}
              disabled={!myName.trim()}
              className="w-full py-4 bg-gradient-engage rounded-xl font-display font-semibold text-lg text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-engage-primary/25 transition-all duration-300 active:scale-[0.98]"
            >
              Share My Perspective
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ═══ INPUT ═══
  if (state === 'input') {
    return (
      <Shell>
        <div className="max-w-lg mx-auto animate-fade-up">
          <div className="mb-6">
            <a href="/" className="text-engage-muted hover:text-engage-text text-sm transition-colors">
              ← Back
            </a>
          </div>

          <div className="glass rounded-2xl p-5 mb-6">
            <div className="text-engage-muted text-xs font-medium uppercase tracking-wider mb-1.5">Topic</div>
            <p className="text-engage-text text-base">{sessionData?.session.topic}</p>
          </div>

          {myRole === 'creator' && !hasSubmitted && (
            <div className="glass rounded-2xl p-5 mb-6 border-engage-primary/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-engage-muted">Share link with your partner</span>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-engage-primary/10 hover:bg-engage-primary/20 border border-engage-primary/20 rounded-lg text-engage-primary text-sm font-medium transition-all"
                >
                  {copied ? (
                    <>✓ Copied!</>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share
                    </>
                  )}
                </button>
              </div>
              <p className="text-engage-subtle text-xs">
                They'll see the topic and can share their perspective without seeing yours.
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-engage-muted mb-2">
              {myRole === 'creator' ? 'Your perspective' : `${myName}, what's your take?`}
            </label>
            <textarea
              value={myInput}
              onChange={(e) => setMyInput(e.target.value)}
              placeholder="Share your honest thoughts, preferences, or reasoning..."
              rows={6}
              maxLength={2000}
              className="w-full px-4 py-3.5 bg-engage-card border border-engage-border rounded-xl text-engage-text placeholder:text-engage-subtle focus:border-engage-primary focus:ring-1 focus:ring-engage-primary/50 transition-all outline-none resize-none leading-relaxed"
            />
            <div className="flex justify-between text-xs text-engage-subtle mt-1.5">
              <span>🔒 Only AI sees your input — not your partner</span>
              <span>{myInput.length}/2000</span>
            </div>
          </div>

          {error && (
            <div className="text-engage-accent text-sm mb-4 px-3 py-2 bg-engage-accent/10 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!myInput.trim() || isSubmitting}
            className="w-full py-4 bg-gradient-engage rounded-xl font-display font-semibold text-lg text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-engage-primary/25 transition-all duration-300 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Locking in...
              </span>
            ) : (
              'Lock In My Perspective'
            )}
          </button>
        </div>
      </Shell>
    );
  }

  // ═══ WAITING ═══
  if (state === 'waiting') {
    const otherName = myRole === 'creator' 
      ? (sessionData?.session.partner_name || 'your partner') 
      : sessionData?.session.creator_name;
    
    return (
      <Shell>
        <div className="max-w-lg mx-auto text-center animate-fade-up">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-engage-primary/10 rounded-full mb-4">
              <svg className="w-8 h-8 text-engage-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Your perspective is locked in</h2>
            <p className="text-engage-muted">
              Waiting for {otherName} to share their side...
            </p>
          </div>

          {myRole === 'creator' && (
            <div className="glass rounded-2xl p-5 mb-6">
              <p className="text-sm text-engage-muted mb-3">Haven't shared the link yet?</p>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-engage-primary/10 hover:bg-engage-primary/20 border border-engage-primary/20 rounded-xl text-engage-primary text-sm font-medium transition-all"
              >
                {copied ? '✓ Copied!' : 'Share Invite Link'}
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-engage-subtle text-sm">
            <div className="w-1.5 h-1.5 bg-engage-primary rounded-full animate-pulse" />
            <span>This page updates automatically</span>
          </div>
        </div>
      </Shell>
    );
  }

  // ═══ ANALYZING ═══
  if (state === 'analyzing') {
    return (
      <Shell>
        <div className="max-w-lg mx-auto text-center animate-fade-up">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-engage-primary/10 rounded-full mb-5 animate-pulse-glow">
              <span className="text-3xl">✨</span>
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Both perspectives are in</h2>
            <p className="text-engage-muted">
              AI is finding the common ground...
            </p>
          </div>

          <div className="flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 bg-engage-primary rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  // ═══ REVEAL ═══
  if (state === 'reveal' && sessionData?.analysis) {
    const a = sessionData.analysis.content;
    const sections = [
      { key: 'headline', label: '', content: a.headline, stage: 1, accent: true },
      { key: 'common_ground', label: 'Common Ground', content: a.common_ground, stage: 2, icon: '🤝' },
      { key: 'divergence', label: 'Where You Diverge', content: a.divergence, stage: 3, icon: '⚡' },
      { key: 'recommendation', label: 'Recommendation', content: a.recommendation, stage: 4, icon: '💡' },
      { key: 'reasoning', label: 'Reasoning', content: a.reasoning, stage: 5, icon: '🧠' },
      { key: 'what_each_gives_up', label: 'The Tradeoff', content: a.what_each_gives_up, stage: 6, icon: '⚖️' },
    ];

    return (
      <Shell>
        <div className="max-w-2xl mx-auto">
          {/* Topic header */}
          <div className="text-center mb-8 animate-fade-up">
            <div className="inline-block px-3 py-1 bg-engage-success/10 border border-engage-success/20 rounded-full text-engage-success text-sm font-medium mb-4">
              Analysis Complete
            </div>
            <h2 className="font-display text-lg text-engage-muted">
              {sessionData.session.creator_name} & {sessionData.session.partner_name}
            </h2>
            <p className="text-engage-subtle text-sm mt-1">{sessionData.session.topic}</p>
          </div>

          {/* Analysis cards */}
          <div className="space-y-4">
            {sections.map(({ key, label, content, stage, icon, accent }) => {
              if (!content) return null;
              const visible = revealStage >= stage;

              if (accent) {
                // Headline — big featured card
                return (
                  <div
                    key={key}
                    className={`glass rounded-2xl p-6 sm:p-8 text-center glow transition-all duration-700 ${
                      visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
                    }`}
                  >
                    <p className="font-display text-xl sm:text-2xl font-bold text-engage-text leading-snug">
                      {content}
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  className={`glass rounded-2xl p-5 sm:p-6 transition-all duration-700 ${
                    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{icon}</span>
                    <h3 className="font-display font-semibold text-engage-text">{label}</h3>
                  </div>
                  <p className="text-engage-text/80 leading-relaxed text-[15px]">{content}</p>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {revealStage >= 6 && (
            <div className="mt-8 text-center animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <p className="text-engage-subtle text-xs mb-6">
                Engage provides analysis, not advice. Important decisions should involve professional guidance when appropriate.
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-engage-primary/10 hover:bg-engage-primary/20 border border-engage-primary/20 rounded-xl text-engage-primary font-medium transition-all"
              >
                Start a New Engage
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // Fallback
  return (
    <Shell>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-engage-primary/30 border-t-engage-primary rounded-full animate-spin" />
      </div>
    </Shell>
  );
}

// ═══ Shell wrapper ═══
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-engage-primary/8 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-engage-accent/8 rounded-full blur-[128px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 text-center mb-8">
        <a href="/" className="inline-block">
          <span className="font-display text-xl font-bold text-gradient">Engage</span>
        </a>
      </header>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </main>
  );
}
