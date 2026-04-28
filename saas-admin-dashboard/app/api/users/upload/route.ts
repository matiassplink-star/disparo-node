import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Apenas imagens são permitidas' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    // 1. Garantir que o bucket existe (Tentar criar se falhar)
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === 'avatars')
    
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 5242880 // 5MB
      })
      if (createError) {
        console.error('Erro ao criar bucket:', createError)
        return NextResponse.json({ error: 'Erro ao configurar armazenamento. Verifique se o bucket "avatars" existe.' }, { status: 500 })
      }
    }

    // 2. Upload para o bucket "avatars"
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      })

    if (uploadError) {
      console.error('Erro no upload:', uploadError)
      return NextResponse.json({ error: 'Erro ao subir arquivo: ' + uploadError.message }, { status: 500 })
    }

    // 3. Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // 4. Atualizar tabela de usuários
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('Erro ao salvar no banco:', updateError)
      return NextResponse.json({ error: 'Erro ao salvar URL no perfil' }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Desconhecido'
    console.error('Erro fatal no upload:', error)
    return NextResponse.json({ error: 'Erro interno: ' + msg }, { status: 500 })
  }
}
