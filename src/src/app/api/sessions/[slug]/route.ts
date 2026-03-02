import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = getServerSupabase();
    const { slug } = params;

    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if expired
    if (session.expires_at && new Date(session.expires_at) < new Date() && 
        ['waiting', 'active'].includes(session.status)) {
      await supabase
        .from('sessions')
        .update({ status: 'expired' })
        .eq('id', session.id);
      session.status = 'expired';
    }

    // Get inputs (without exposing content)
    const { data: inputs } = await supabase
      .from('inputs')
      .select('role, locked_at')
      .eq('session_id', session.id);

    // Get analysis if complete
    let analysis = null;
    if (session.status === 'complete') {
      const { data: analysisData } = await supabase
        .from('analyses')
        .select('*')
        .eq('session_id', session.id)
        .single();
      analysis = analysisData;
    }

    return NextResponse.json({
      session,
      inputs: inputs || [],
      analysis,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
