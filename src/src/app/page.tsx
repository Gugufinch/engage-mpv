'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { value: 'general', label: '💬 General', color: 'bg-engage-primary/20 text-engage-primary border-engage-primary/30' },
  { value: 'relationship', label: '💕 Relationship', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  { value: 'money', label: '💰 Money', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { value: 'travel', label: '✈️ Travel', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { value: 'work', label: '💼 Work', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { value: 'fun', label: '🎉 Fun', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'food', label: '🍕 Food', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { value: 'home', label: '🏠 Home', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  { value: 'parenting', label: '👶 Parenting', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
];

const EXAMPLE_SESSION = {
  topic: 'Where should we go for vacation this summer?',
  context: 'We have 7 days off in July, budget around $3,000 total. Last year we went to the beach and loved it but want to try something different.',
  category: 'travel',
  creatorName: 'Alex',
  partnerName: 'Jordan',
  creatorInput: "I really want to do a national parks road trip — maybe Zion and Bryce Canyon. I want adventure, hiking, and being outdoors. Hotels are fine but I'd love to camp at least one night. I think we can make it work on budget if we drive instead of fly.",
  partnerInput: "I'd love somewhere with culture and good food — like Portland or Asheville. I want to relax, explore a city, eat at great restaurants, and not be exhausted every day. Camping isn't really my thing and I worry a road trip will be more tiring than relaxing.",
};

type HistoryItem = {
  slug: string;
  topic: string;
  category: string;
  creatorName: string;
  partnerName?: string;
  status: string;
  createdAt: string;
};

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [category, setCategory] = useState('general');
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<'intro' | 'create'>('intro');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('engage_history');
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  function saveToHistory(item: HistoryItem) {
    const updated = [item, ...history].slice(0, 50); // keep last 50
    setHistory(updated);
    try {
      localStorage.setItem('engage_history', JSON.stringify(updated));
    } catch {}
  }

  async function handleCreate() {
    if (!name.trim() || !topic.trim()) return;
    setIsCreating(true);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_name: name.trim(),
          topic: topic.trim(),
          context: context.trim() || null,
          category,
        }),
      });
      const data = await res.json();
      if (data.slug) {
        saveToHistory({
          slug: data.slug,
          topic: topic.trim(),
          category,
          creatorName: name.trim(),
          status: 'waiting',
          createdAt: new Date().toISOString(),
        });
        router.push(`/session/${data.slug}?role=creator&name=${encodeURIComponent(name.trim())}`);
      }
    } catch (err) {
      console.error(err);
      setIsCreating(false);
    }
  }

  function handleTryExample() {
    setStep('create');
    setName(EXAMPLE_SESSION.creatorName);
    setTopic(EXAMPLE_SESSION.topic);
    setContext(EXAMPLE_SESSION.context);
    setCategory(EXAMPLE_SESSION.category);
  }

  function getCategoryLabel(val: string) {
    return CATEGORIES.find(c => c.value === val)?.label || '💬 General';
  }

  function getCategoryColor(val: string) {
    return CATEGORIES.find(c => c.value === val)?.color || CATEGORIES[0].color;
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

            {/* CTAs */}
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={() => setStep('create')}
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-engage rounded-2xl font-display font-semibold text-lg text-white shadow-lg hover:shadow-xl hover:shadow-engage-primary/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                Start an Engage
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              <button
                onClick={handleTryExample}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-engage-card/60 border border-engage-border hover:border-engage-primary/30 rounded-2xl text-engage-muted hover:text-engage-text text-sm font-medium transition-all"
              >
                ✨ Try an example first
              </button>
            </div>

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

            {/* History */}
            {history.length > 0 && (
              <div className="mt-12">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-engage-muted hover:text-engage-text text-sm font-medium transition-colors flex items-center gap-1.5 mx-auto"
                >
                  <svg className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Your past Engages ({history.length})
                </button>

                {showHistory && (
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {history.map((item) => (
                      <a
                        key={item.slug}
                        href={`/session/${item.slug}?role=creator&name=${encodeURIComponent(item.creatorName)}`}
                        className="block glass rounded-xl p-3 hover:border-engage-primary/30 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryColor(item.category)}`}>
                            {getCategoryLabel(item.category)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            item.status === 'complete' ? 'bg-engage-success/20 text-engage-success' :
                            item.status === 'waiting' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-engage-muted/20 text-engage-muted'
                          }`}>
                            {item.status === 'complete' ? '✓ Complete' : item.status === 'waiting' ? '⏳ Waiting' : item.status}
                          </span>
                        </div>
                        <p className="text-engage-text text-sm truncate">{item.topic}</p>
                        <p className="text-engage-subtle text-xs mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString()}
                          {item.partnerName && ` · with ${item.partnerName}`}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                <label className="block text-sm font-medium text-engage-muted mb-2">What do you want to discuss?</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Where should we go for our anniversary dinner?"
                  rows={2}
                  maxLength={500}
                  className="w-full px-4 py-3.5 bg-engage-card border border-engage-border rounded-xl text-engage-text placeholder:text-engage-subtle focus:border-engage-primary focus:ring-1 focus:ring-engage-primary/50 transition-all outline-none resize-none"
                />
                <div className="text-right text-xs text-engage-subtle mt-1">{topic.length}/500</div>
              </div>

              {/* Context (optional) */}
              <div>
                <label className="block text-sm font-medium text-engage-muted mb-1">Context / Background</label>
                <p className="text-xs text-engage-subtle mb-2">Optional — helps AI give better analysis</p>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Budget is $200, we've been to Italian places the last 3 times, partner is vegetarian..."
                  rows={2}
                  maxLength={1000}
                  className="w-full px-4 py-3 bg-engage-card border border-engage-border rounded-xl text-engage-text placeholder:text-engage-subtle focus:border-engage-primary focus:ring-1 focus:ring-engage-primary/50 transition-all outline-none resize-none text-sm"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-engage-muted mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        category === cat.value
                          ? cat.color + ' ring-1 ring-current'
                          : 'bg-engage-card/40 text-engage-muted border-engage-border hover:border-engage-subtle'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
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
