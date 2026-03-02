'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<'intro' | 'create'>('intro');

  async function handleCreate() {
    if (!name.trim() || !topic.trim()) return;
    setIsCreating(true);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator_name: name.trim(), topic: topic.trim() }),
      });
      const data = await res.json();
      if (data.slug) {
        router.push(`/session/${data.slug}?role=creator&name=${encodeURIComponent(name.trim())}`);
      }
    } catch (err) {
      console.error(err);
      setIsCreating(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-engage-primary/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-engage-accent/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {step === 'intro' ? (
          <div className="text-center animate-fade-up">
            {/* Logo */}
            <div className="mb-8">
              <h1 className="font-display text-6xl sm:text-7xl font-extrabold tracking-tight text-gradient mb-3">
                Engage
              </h1>
              <p className="text-engage-muted text-lg font-medium">
                Two Perspectives. One Resolution.
              </p>
            </div>

            {/* Value prop */}
            <div className="mb-10 space-y-4 text-engage-text/80 text-base leading-relaxed max-w-md mx-auto">
              <p>
                Both of you share your perspective independently. 
                AI finds the common ground and suggests a path forward.
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={() => setStep('create')}
              className="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-engage rounded-2xl font-display font-semibold text-lg text-white shadow-lg hover:shadow-xl hover:shadow-engage-primary/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              Start an Engage
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>

            {/* How it works */}
            <div className="mt-16 grid grid-cols-3 gap-4 text-center">
              {[
                { num: '01', label: 'Share your topic', icon: '💬' },
                { num: '02', label: 'Both give input', icon: '🔒' },
                { num: '03', label: 'See the analysis', icon: '✨' },
              ].map((item, i) => (
                <div
                  key={item.num}
                  className="animate-fade-up"
                  style={{ animationDelay: `${0.1 + i * 0.1}s`, animationFillMode: 'both' }}
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-engage-primary text-xs font-display font-semibold tracking-wider mb-1">
                    {item.num}
                  </div>
                  <div className="text-engage-muted text-sm">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-fade-up">
            {/* Back button */}
            <button
              onClick={() => setStep('intro')}
              className="flex items-center gap-1 text-engage-muted hover:text-engage-text text-sm mb-8 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="font-display text-3xl font-bold mb-2">Start an Engage</h2>
            <p className="text-engage-muted mb-8">Create your topic and invite someone to share their perspective.</p>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-engage-muted mb-2">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Greg"
                  maxLength={30}
                  className="w-full px-4 py-3.5 bg-engage-card border border-engage-border rounded-xl text-engage-text placeholder:text-engage-subtle focus:border-engage-primary focus:ring-1 focus:ring-engage-primary/50 transition-all outline-none"
                />
              </div>

              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-engage-muted mb-2">What do you need to decide?</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Where should we go for our anniversary dinner?"
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3.5 bg-engage-card border border-engage-border rounded-xl text-engage-text placeholder:text-engage-subtle focus:border-engage-primary focus:ring-1 focus:ring-engage-primary/50 transition-all outline-none resize-none"
                />
                <div className="text-right text-xs text-engage-subtle mt-1">{topic.length}/500</div>
              </div>

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={!name.trim() || !topic.trim() || isCreating}
                className="w-full py-4 bg-gradient-engage rounded-xl font-display font-semibold text-lg text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-engage-primary/25 transition-all duration-300 active:scale-[0.98]"
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create & Get Share Link'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
