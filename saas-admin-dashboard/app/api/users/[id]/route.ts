import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão de admin
    const { data: currentUser } = await supabase
      .from('users')
      .select('plano')
      .eq('id', authData.user.id)
      .single()

    if (currentUser?.plano !== 'admin') {
      return NextResponse.json(
        { error: 'Permissão negada' },
        { status: 403 }
      )
    }

    // Buscar usuário específico
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(user, { status: 200 })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão de admin
    const { data: currentUser } = await supabase
      .from('users')
      .select('plano')
      .eq('id', authData.user.id)
      .single()

    if (currentUser?.plano !== 'admin') {
      return NextResponse.json(
        { error: 'Permissão negada' },
        { status: 403 }
      )
    }

    const { nome, plano, status, acesso_ate } = await req.json()

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        ...(nome && { nome }),
        ...(plano && { plano }),
        ...(status && { status }),
        ...(acesso_ate !== undefined && { acesso_ate }),
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(updatedUser, { status: 200 })
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão de admin
    const { data: currentUser } = await supabase
      .from('users')
      .select('plano')
      .eq('id', authData.user.id)
      .single()

    if (currentUser?.plano !== 'admin') {
      return NextResponse.json(
        { error: 'Permissão negada' },
        { status: 403 }
      )
    }

    // Deletar usuário do auth
    await supabase.auth.admin.deleteUser(params.id)

    // Deletar mensagens e contatos (CRM)
    await supabase.from('messages').delete().eq('user_id', params.id)
    await supabase.from('contacts').delete().eq('user_id', params.id)

    // Buscar instâncias para tentar deletar na Evolution API (opcional, ignora erro)
    const { data: instances } = await supabase.from('whatsapp_instances').select('instance_name').eq('user_id', params.id)
    
    // Deletar instâncias do banco
    await supabase.from('whatsapp_instances').delete().eq('user_id', params.id)

    // Deletar accounts relacionadas
    await supabase
      .from('accounts')
      .delete()
      .eq('user_id', params.id)

    // Deletar usuário da tabela
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao deletar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
