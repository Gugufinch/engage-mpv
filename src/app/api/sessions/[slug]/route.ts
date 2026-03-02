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

    // Get inputs (without exposing content to the other side)
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
