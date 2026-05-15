import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('plays')
    .select(
      'id,title,description,category,is_public,updated_at,profiles(username,team_name)',
    )
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(24)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plays: data })
}
