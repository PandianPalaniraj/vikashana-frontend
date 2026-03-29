import jsPDF from 'jspdf'
import { SCHOOL } from '../../constants'
import { fmt, fmtDate } from '../../helpers/format'

// ── WhatsApp — always reuse the same named tab ────────────────────────────────
export const openWA = (phone, msg) =>
  window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, 'whatsapp_school')

// Short WA message — the PDF is the full document
export const invMsg = (inv, s) => {
  const bal = inv.total - inv.paid
  return [
    `🏫 *${SCHOOL.name}*`,
    ``,
    `📄 *Fee Invoice* — ${inv.id}`,
    `👨‍🎓 ${s.name} | Class ${s.class}-${s.section}`,
    `💰 Total: ${fmt(inv.total)}  |  Due: ${fmtDate(inv.due_date)}`,
    bal > 0 ? `⚠️ Balance: ${fmt(bal)}` : `✅ Fully Paid`,
    ``,
    `Please find the invoice PDF attached.`,
    `📧 ${SCHOOL.email}`,
  ].join('\n')
}

export const rcptMsg = (inv, pmt, s) => {
  const bal = inv.total - inv.paid
  return [
    `🏫 *${SCHOOL.name}*`,
    ``,
    `🧾 *Payment Receipt* — ${pmt.id}`,
    `👨‍🎓 ${s.name} | Class ${s.class}-${s.section}`,
    `✅ Paid: ${fmt(pmt.amount)} via ${pmt.method}`,
    bal === 0 ? `🎉 All dues cleared!` : `📊 Balance: ${fmt(bal)}`,
    ``,
    `Please find the receipt PDF attached.`,
    `📧 ${SCHOOL.email}`,
  ].join('\n')
}

// ── jsPDF helpers ─────────────────────────────────────────────────────────────

const C = {
  dark:    [15,  23,  42],
  purple:  [99,  102, 241],
  green:   [5,   150, 105],
  red:     [220, 38,  38],
  amber:   [217, 119, 6],
  gray:    [100, 116, 139],
  lightBg: [248, 250, 252],
  border:  [226, 232, 240],
  white:   [255, 255, 255],
  greenBg: [236, 253, 245],
  redBg:   [254, 242, 242],
  amberBg: [255, 251, 235],
  purpleBg:[238, 242, 255],
}

const PW = 210  // A4 width mm
const M  = 14   // margin mm

function buildDoc() {
  return new jsPDF({ unit: 'mm', format: 'a4' })
}

function schoolHeader(doc) {
  // Dark header bar
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, PW, 26, 'F')

  doc.setTextColor(...C.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(SCHOOL.name, PW / 2, 10, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(SCHOOL.address, PW / 2, 16, { align: 'center' })
  doc.text(`${SCHOOL.phone}   •   ${SCHOOL.email}`, PW / 2, 21, { align: 'center' })

  return 30 // next y
}

function badge(doc, y, text, bg, textColor) {
  const bw = 52, bh = 8, bx = PW / 2 - bw / 2
  doc.setFillColor(...bg)
  doc.roundedRect(bx, y, bw, bh, 2, 2, 'F')
  doc.setTextColor(...textColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(text, PW / 2, y + 5.4, { align: 'center' })
  return y + bh + 4
}

function infoGrid(doc, y, cells, bgColor) {
  const cols   = 2
  const cellW  = (PW - M * 2) / cols
  const cellH  = 12
  const rows   = Math.ceil(cells.length / cols)
  const gridH  = rows * cellH + 6

  doc.setFillColor(...(bgColor || C.lightBg))
  doc.rect(M, y, PW - M * 2, gridH, 'F')

  cells.forEach((cell, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const cx  = M + col * cellW + 4
    const cy  = y + row * cellH + 7

    doc.setTextColor(...C.gray)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text((cell[0] || '').toUpperCase(), cx, cy)

    doc.setTextColor(...C.dark)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(String(cell[1] || '—'), cx, cy + 5)
  })

  return y + gridH + 3
}

function tableHeader(doc, y, cols) {
  const rowH = 7
  doc.setFillColor(...C.dark)
  doc.rect(M, y, PW - M * 2, rowH, 'F')
  doc.setTextColor(...C.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)

  cols.forEach(col => {
    const tx = col.right ? M + (PW - M * 2) - 4 : M + col.x
    doc.text(col.label, tx, y + 4.8, { align: col.right ? 'right' : 'left' })
  })
  return y + rowH
}

function tableRow(doc, y, rowIdx, leftText, rightText) {
  const rowH = 8
  doc.setFillColor(...(rowIdx % 2 === 0 ? C.white : C.lightBg))
  doc.rect(M, y, PW - M * 2, rowH, 'F')

  doc.setTextColor(...C.dark)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(leftText, M + 4, y + 5.5)

  doc.setFont('helvetica', 'bold')
  doc.text(rightText, M + (PW - M * 2) - 4, y + 5.5, { align: 'right' })
  return y + rowH
}

function totalRows(doc, y, rows) {
  rows.forEach(row => {
    const h = 9
    doc.setFillColor(...row.bg)
    doc.rect(M, y, PW - M * 2, h, 'F')
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.2)
    doc.line(M, y, M + PW - M * 2, y)

    doc.setTextColor(...row.color)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(row.large ? 11 : 9.5)
    doc.text(row.label, M + 4, y + 6)
    doc.text(row.value, M + (PW - M * 2) - 4, y + 6, { align: 'right' })
    y += h
  })
  return y
}

function statusBanner(doc, y, text, bg, color) {
  const h = 10
  doc.setFillColor(...bg)
  doc.roundedRect(M, y, PW - M * 2, h, 2, 2, 'F')
  doc.setTextColor(...color)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(text, PW / 2, y + 6.5, { align: 'center' })
  return y + h + 4
}

function docFooter(doc, y) {
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(M, y, PW - M, y)
  y += 4

  doc.setTextColor(...C.gray)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Computer-generated document. No signature required.', PW / 2, y, { align: 'center' })
  y += 4
  doc.text(
    `${SCHOOL.name}  •  ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    PW / 2, y, { align: 'center' }
  )
}

// ── Public: Invoice PDF → auto-downloads ──────────────────────────────────────
export const printInvoicePDF = (inv, s) => {
  const doc = buildDoc()
  const bal = inv.total - inv.paid

  let y = schoolHeader(doc)
  y = badge(doc, y, 'FEE INVOICE', C.purpleBg, C.purple)

  y = infoGrid(doc, y, [
    ['Invoice #',     inv.id],
    ['Status',        inv.status],
    ['Due Date',      fmtDate(inv.due_date)],
    ['Month',         inv.month || '—'],
  ])

  y = infoGrid(doc, y, [
    ['Student',       s.name],
    ['Class / Sec',   `${s.class} — ${s.section}`],
    ['Parent',        s.guardian],
    ['Phone',         s.phone],
    ['Admission No',  s.admission_no || '—'],
    ['Ref',           inv.invoice_no || '—'],
  ], [243, 244, 246])

  y += 2
  y = tableHeader(doc, y, [{ label: 'FEE TYPE', x: 4 }, { label: 'AMOUNT', right: true }])

  ;(inv.items || []).forEach((item, i) => {
    y = tableRow(doc, y, i, item.label, fmt(item.amount))
  })

  y = totalRows(doc, y, [
    { label: 'Total',   value: fmt(inv.total), bg: C.lightBg, color: C.dark,  large: true  },
    { label: 'Paid',    value: fmt(inv.paid),  bg: C.greenBg, color: C.green, large: false },
    ...(bal > 0
      ? [{ label: 'Balance Due', value: fmt(bal), bg: C.redBg, color: C.red, large: false }]
      : []),
  ])

  y += 3
  y = statusBanner(
    doc, y,
    bal > 0 ? `BALANCE DUE: ${fmt(bal)}` : 'ALL DUES CLEARED',
    bal > 0 ? C.redBg : C.greenBg,
    bal > 0 ? C.red   : C.green
  )

  docFooter(doc, y)

  doc.save(`Invoice-${inv.id}-${s.name.replace(/\s+/g, '_')}.pdf`)
}

// ── Public: Receipt PDF → auto-downloads ─────────────────────────────────────
export const printReceiptPDF = (inv, pmt, s) => {
  const doc = buildDoc()
  const bal = inv.total - inv.paid

  let y = schoolHeader(doc)
  y = badge(doc, y, 'PAYMENT RECEIPT', C.greenBg, C.green)

  y = infoGrid(doc, y, [
    ['Receipt #',   pmt.id],
    ['Invoice #',   inv.id],
    ['Paid On',     fmtDate(pmt.paid_at)],
    ['Method',      pmt.method],
    ['Reference',   pmt.reference || '—'],
    ['Month',       inv.month || '—'],
  ])

  y = infoGrid(doc, y, [
    ['Student',      s.name],
    ['Class / Sec',  `${s.class} — ${s.section}`],
    ['Parent',       s.guardian],
    ['Phone',        s.phone],
  ], [243, 244, 246])

  y += 2
  y = tableHeader(doc, y, [{ label: 'FEE TYPE', x: 4 }, { label: 'AMOUNT', right: true }])

  ;(inv.items || []).forEach((item, i) => {
    y = tableRow(doc, y, i, item.label, fmt(item.amount))
  })

  y = totalRows(doc, y, [
    { label: 'Invoice Total',  value: fmt(inv.total),    bg: C.lightBg, color: C.dark,   large: true  },
    { label: 'This Payment',   value: fmt(pmt.amount),   bg: C.greenBg, color: C.green,  large: false },
    ...(bal > 0
      ? [{ label: 'Balance Remaining', value: fmt(bal), bg: C.amberBg, color: C.amber, large: false }]
      : [{ label: 'All Dues Cleared',  value: '✓',     bg: C.greenBg, color: C.green, large: false }]),
  ])

  y += 3
  y = statusBanner(
    doc, y,
    bal === 0 ? 'PAYMENT COMPLETE — ALL DUES CLEARED' : `PARTIALLY PAID — BALANCE: ${fmt(bal)}`,
    bal === 0 ? C.greenBg : C.amberBg,
    bal === 0 ? C.green   : C.amber
  )

  docFooter(doc, y)

  doc.save(`Receipt-${pmt.id}-${s.name.replace(/\s+/g, '_')}.pdf`)
}
