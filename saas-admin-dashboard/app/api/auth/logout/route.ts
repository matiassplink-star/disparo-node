import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    )

    // Limpar cookies de sessão
    response.cookies.set('sb-access-token', '', {
      httpOnly: true,
      maxAge: 0,
    })

    response.cookies.set('sb-refresh-token', '', {
      httpOnly: true,
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
    return NextResponse.json(
      { error: 'Erro ao processar logout' },
      { status: 500 }
    )
  }
}
