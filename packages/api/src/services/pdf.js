import PDFDocument from 'pdfkit'

// Génère un PDF brandé DevShield pour un devis ou une facture.
// Retourne un Buffer.
export const generateInvoicePdf = (invoice) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const isDevis = invoice.type === 'devis'
    const title = isDevis ? 'DEVIS' : 'FACTURE'

    // --- Header ---
    doc.fontSize(24).fillColor('#00D4FF').text('DevShield', 50, 50)
    doc.fontSize(10).fillColor('#666666')
      .text('Développement web sécurisé & audits OWASP', 50, 80)
      .text('contact@devshield.fr', 50, 95)

    // Document type + number
    doc.fontSize(20).fillColor('#0A1628')
      .text(`${title} ${invoice.number}`, 300, 50, { align: 'right' })

    // Status
    const statusLabels = { draft: 'Brouillon', sent: 'Envoyé', paid: 'Payé', cancelled: 'Annulé' }
    doc.fontSize(10).fillColor('#999999')
      .text(statusLabels[invoice.status] || invoice.status, 300, 75, { align: 'right' })

    // Date
    doc.text(`Date : ${formatDate(invoice.issued_at)}`, 300, 90, { align: 'right' })
    if (invoice.due_at) {
      doc.text(`Échéance : ${formatDate(invoice.due_at)}`, 300, 105, { align: 'right' })
    }

    // --- Separator ---
    doc.moveTo(50, 130).lineTo(545, 130).strokeColor('#00D4FF').lineWidth(1).stroke()

    // --- Client info ---
    doc.fontSize(12).fillColor('#0A1628').text('Client', 50, 150)
    doc.fontSize(10).fillColor('#333333')
    let y = 168
    doc.text(invoice.client_name, 50, y); y += 15
    if (invoice.client_contact) { doc.text(invoice.client_contact, 50, y); y += 15 }
    if (invoice.client_email) { doc.text(invoice.client_email, 50, y); y += 15 }
    if (invoice.client_phone) { doc.text(invoice.client_phone, 50, y); y += 15 }
    if (invoice.client_address) { doc.text(invoice.client_address, 50, y); y += 15 }
    if (invoice.client_siret) { doc.text(`SIRET : ${invoice.client_siret}`, 50, y); y += 15 }

    // --- Table header ---
    y = Math.max(y + 20, 260)
    doc.rect(50, y, 495, 25).fill('#0A1628')
    doc.fontSize(10).fillColor('#FFFFFF')
    doc.text('Description', 60, y + 7)
    doc.text('Montant HT', 400, y + 7, { align: 'right', width: 135 })

    // --- Table row ---
    y += 25
    const packLabels = { essentiel: 'Pack Essentiel', optimal: 'Pack Optimal', custom: 'Personnalisé' }
    const desc = invoice.description || packLabels[invoice.pack] || invoice.pack

    doc.fillColor('#333333')
    doc.text(desc, 60, y + 8, { width: 330 })
    doc.text(formatAmount(invoice.amount_ht), 400, y + 8, { align: 'right', width: 135 })

    // Row border
    const rowHeight = Math.max(doc.heightOfString(desc, { width: 330 }) + 16, 30)
    doc.moveTo(50, y + rowHeight).lineTo(545, y + rowHeight).strokeColor('#EEEEEE').stroke()

    // --- Totals ---
    y += rowHeight + 20
    doc.fontSize(10).fillColor('#666666')
    doc.text('Total HT', 350, y, { align: 'right', width: 100 })
    doc.fillColor('#333333').text(formatAmount(invoice.amount_ht), 460, y, { align: 'right', width: 80 })

    y += 18
    doc.fillColor('#666666').text(`TVA (${invoice.tax_rate}%)`, 350, y, { align: 'right', width: 100 })
    const taxAmount = invoice.amount_ttc - invoice.amount_ht
    doc.fillColor('#333333').text(formatAmount(taxAmount), 460, y, { align: 'right', width: 80 })

    y += 18
    doc.moveTo(350, y).lineTo(545, y).strokeColor('#0A1628').lineWidth(1).stroke()
    y += 8
    doc.fontSize(12).fillColor('#0A1628')
    doc.text('Total TTC', 350, y, { align: 'right', width: 100 })
    doc.text(formatAmount(invoice.amount_ttc), 460, y, { align: 'right', width: 80 })

    // --- Notes ---
    if (invoice.notes) {
      y += 40
      doc.fontSize(9).fillColor('#999999').text('Notes :', 50, y)
      doc.fillColor('#666666').text(invoice.notes, 50, y + 14, { width: 495 })
    }

    // --- Footer / mentions légales ---
    const footerY = 750
    doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#EEEEEE').lineWidth(0.5).stroke()
    doc.fontSize(7).fillColor('#999999')
    doc.text(
      'DevShield — Micro-entreprise — SIRET : à compléter — TVA non applicable, article 293 B du CGI',
      50, footerY + 8, { align: 'center', width: 495 }
    )
    doc.text(
      isDevis
        ? 'Ce devis est valable 30 jours à compter de sa date d\'émission.'
        : 'En cas de retard de paiement, une pénalité de 3 fois le taux d\'intérêt légal sera appliquée. Indemnité forfaitaire de recouvrement : 40 €.',
      50, footerY + 20, { align: 'center', width: 495 }
    )

    doc.end()
  })
}

// Helpers
const formatAmount = (cents) => {
  const euros = (cents / 100).toFixed(2)
  return `${euros} €`
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
