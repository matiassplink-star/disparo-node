'use server'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export { resend }

export async function sendVerificationEmail(email: string, verificationToken: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`

  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Confirme sua conta',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Bem-vindo!</h1>
          <p>Obrigado por se cadastrar no nosso SaaS Admin Dashboard.</p>
          <p>Clique no botão abaixo para confirmar sua conta:</p>
          <a href="${verificationUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Confirmar Conta
          </a>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            Se você não criou esta conta, ignore este email.
          </p>
        </div>
      `,
    })

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    return { success: false, error }
  }
}
