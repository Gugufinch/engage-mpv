import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { analyzeDecideSession } from '@/lib/ai';

export const maxDuration = 30; // Vercel serverless timeout

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = getServerSupabase();
    const { slug } = params;

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('slug', slug)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status === 'complete') {
      // Already analyzed — return existing
      const { data: existing } = await supabase
        .from('analyses')
        .select('*')
        .eq('session_id', session.id)
        .single();
      return NextResponse.json({ analysis: existing });
    }

    if (session.status !== 'both_locked' && session.status !== 'analyzing') {
      return NextResponse.json({ error: 'Both inputs not yet submitted' }, { status: 400 });
    }

    // Set status to analyzing
    await supabase
      .from('sessions')
      .update({ status: 'analyzing' })
      .eq('id', session.id);

    // Get both inputs
    const { data: inputs } = await supabase
      .from('inputs')
      .select('*')
      .eq('session_id', session.id);

    const creatorInput = inputs?.find(i => i.role === 'creator');
    const partnerInput = inputs?.find(i => i.role === 'partner');

    if (!creatorInput || !partnerInput) {
      await supabase
        .from('sessions')
        .update({ status: 'both_locked' })
        .eq('id', session.id);
      return NextResponse.json({ error: 'Missing inputs' }, { status: 400 });
    }

    // Run AI analysis
    try {
      const analysis = await analyzeDecideSession(
        session.topic,
        session.creator_name,
        creatorInput.content,
        session.partner_name || 'Partner',
        partnerInput.content,
        session.context || undefined
      );

      // Save analysis
      const { data: saved, error: saveError } = await supabase
        .from('analyses')
        .insert({
          session_id: session.id,
          content: analysis,
          raw_text: JSON.stringify(analysis),
        })
        .select()
        .single();

      if (saveError) {
        console.error('Analysis save error:', saveError);
        await supabase
          .from('sessions')
          .update({ status: 'failed' })
          .eq('id', session.id);
        return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
      }

      // Mark complete
      await supabase
        .from('sessions')
        .update({ status: 'complete' })
        .eq('id', session.id);

      return NextResponse.json({ analysis: saved });
    } catch (aiError) {
      console.error('AI analysis failed:', aiError);
      // Mark as failed so user can retry
      await supabase
        .from('sessions')
        .update({ status: 'failed' })
        .eq('id', session.id);
      return NextResponse.json({ error: 'AI analysis failed — please retry' }, { status: 500 });
    }
  } catch (err) {
    console.error('Analysis error:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
