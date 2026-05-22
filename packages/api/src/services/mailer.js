import nodemailer from 'nodemailer'

import { logger } from '../utils/logger.js'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

const ADMIN_EMAIL = 'paul@devshield.fr'
const FROM = process.env.SMTP_FROM || 'contact@devshield.fr'

// Notify admin when a new onboarding form is submitted
export const sendNewSubmissionEmail = async (submission) => {
  const { companyName, contactName, email, phone, pack, activity } = submission

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#0ea5e9;margin-bottom:4px">Nouvelle demande d'onboarding</h2>
      <p style="color:#64748b;font-size:14px;margin-top:0">Un nouveau formulaire vient d'être complété sur DevShield.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
      <table style="width:100%;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#64748b;width:140px">Entreprise</td><td style="padding:8px 0;color:#1e293b;font-weight:600">${companyName}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Contact</td><td style="padding:8px 0;color:#1e293b">${contactName}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Email</td><td style="padding:8px 0;color:#1e293b"><a href="mailto:${email}" style="color:#0ea5e9">${email}</a></td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Téléphone</td><td style="padding:8px 0;color:#1e293b">${phone || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Pack</td><td style="padding:8px 0;color:#1e293b;font-weight:600">${pack === 'essentiel' ? 'Essentiel (700 €)' : 'Optimal (850 €)'}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Activité</td><td style="padding:8px 0;color:#1e293b">${activity || '—'}</td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
      <p style="color:#94a3b8;font-size:12px;margin:0">
        Connectez-vous sur <a href="https://clients.devshield.fr" style="color:#0ea5e9">clients.devshield.fr</a> pour voir les détails.
      </p>
    </div>
  `

  try {
    await transporter.sendMail({
      from: `"DevShield" <${FROM}>`,
      to: ADMIN_EMAIL,
      subject: `Nouvelle demande — ${companyName}`,
      html
    })
    logger.info(`Onboarding notification sent for ${companyName}`)
  } catch (err) {
    // Email failure should not block the submission
    logger.error(`Failed to send onboarding email: ${err.message}`)
  }
}
