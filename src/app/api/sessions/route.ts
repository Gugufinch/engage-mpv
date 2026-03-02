import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

function generateSlug(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServerSupabase();
    const { creator_name, topic } = await req.json();

    if (!creator_name?.trim() || !topic?.trim()) {
      return NextResponse.json({ error: 'Name and topic required' }, { status: 400 });
    }

    // Generate unique slug with retry
    let slug = generateSlug();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('sessions')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (!existing) break;
      slug = generateSlug();
      attempts++;
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        slug,
        topic: topic.trim(),
        creator_name: creator_name.trim(),
        status: 'waiting',
        session_type: 'decide',
      })
      .select()
      .single();

    if (error) {
      console.error('Session creation error:', error);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({ slug: data.slug, id: data.id });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
