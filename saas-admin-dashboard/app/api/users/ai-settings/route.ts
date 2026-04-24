import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: authData } = await supabase.auth.getUser(token)
    if (!authData.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: user } = await supabase
      .from('users')
      .select('openai_key, openai_prompt')
      .eq('id', authData.user.id)
      .single()

    return NextResponse.json(user || { openai_key: '', openai_prompt: '' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: authData } = await supabase.auth.getUser(token)
    if (!authData.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { key, prompt } = await req.json()

    const { error } = await supabase
      .from('users')
      .update({ 
        openai_key: key, 
        openai_prompt: prompt 
      })
      .eq('id', authData.user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar IA:', error)
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 })
  }
}
