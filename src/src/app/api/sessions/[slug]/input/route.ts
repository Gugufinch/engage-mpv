import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = getServerSupabase();
    const { slug } = params;
    const { role, content, name } = await req.json();

    if (!role || !content?.trim()) {
      return NextResponse.json({ error: 'Role and content required' }, { status: 400 });
    }

    if (!['creator', 'partner'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('slug', slug)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status === 'complete' || session.status === 'analyzing') {
      return NextResponse.json({ error: 'Session already completed' }, { status: 400 });
    }

    // If partner is joining, update session with partner name and status
    if (role === 'partner' && name?.trim()) {
      await supabase
        .from('sessions')
        .update({ 
          partner_name: name.trim(),
          status: session.status === 'waiting' ? 'active' : session.status,
        })
        .eq('id', session.id);
    }

    // Check for existing input from this role
    const { data: existingInput } = await supabase
      .from('inputs')
      .select('id')
      .eq('session_id', session.id)
      .eq('role', role)
      .single();

    if (existingInput) {
      return NextResponse.json({ error: 'Already submitted' }, { status: 400 });
    }

    // Insert input
    const { error: inputError } = await supabase
      .from('inputs')
      .insert({
        session_id: session.id,
        role,
        content: content.trim(),
      });

    if (inputError) {
      console.error('Input error:', inputError);
      return NextResponse.json({ error: 'Failed to save input' }, { status: 500 });
    }

    // Check if both inputs are in
    const { data: allInputs } = await supabase
      .from('inputs')
      .select('role')
      .eq('session_id', session.id);

    const roles = (allInputs || []).map(i => i.role);
    const bothSubmitted = roles.includes('creator') && roles.includes('partner');

    if (bothSubmitted) {
      await supabase
        .from('sessions')
        .update({ status: 'both_locked' })
        .eq('id', session.id);
    }

    return NextResponse.json({ 
      success: true, 
      both_submitted: bothSubmitted,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
