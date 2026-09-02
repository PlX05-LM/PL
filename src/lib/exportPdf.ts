import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { Ceremony, Track } from '../types'
import { toSafeFilename } from './filename'

const typeLabels: Record<Ceremony['ceremonyType'], string> = {
  obseques: 'Obsèques',
  creation: 'Crémation',
  inhumation: 'Inhumation',
  hommage: 'Hommage / recueillement',
  autre: 'Autre',
}

function formatDateLong(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function exportCeremonyPdf(ceremony: Ceremony, tracks: Track[]) {
  const trackName = (id?: string) => (id ? tracks.find((t) => t.id === id)?.name ?? '—' : '—')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 18
  const contentWidth = pageWidth - marginX * 2

  // -- En-tête --
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(20, 20, 20)
  doc.text(ceremony.title || 'Déroulé de cérémonie', marginX, 22)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(90, 90, 90)
  doc.text(typeLabels[ceremony.ceremonyType], marginX, 29)

  doc.setDrawColor(201, 162, 75) // gold
  doc.setLineWidth(0.6)
  doc.line(marginX, 33, pageWidth - marginX, 33)

  const infoRows: [string, string][] = [
    ['Défunt', ceremony.deceasedName || '—'],
    ['Date', formatDateLong(ceremony.date)],
    ['Heure', ceremony.time],
    ['Lieu', ceremony.location || '—'],
    ['Contact famille', ceremony.familyContact || '—'],
    ['Officiant', ceremony.officiant || '—'],
  ]

  autoTable(doc, {
    startY: 39,
    margin: { left: marginX, right: marginX },
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 1 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [90, 90, 90], cellWidth: 38 },
      1: { textColor: [20, 20, 20] },
    },
    body: infoRows,
  })

  // -- Tableau récapitulatif du déroulé --
  const afterInfoY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(20, 20, 20)
  doc.text('Déroulé', marginX, afterInfoY)

  const totalMinutes = ceremony.segments.reduce((s, seg) => s + (seg.estimatedDuration || 0), 0)

  autoTable(doc, {
    startY: afterInfoY + 4,
    margin: { left: marginX, right: marginX },
    head: [['#', 'Étape', 'Durée', 'Musique']],
    body: ceremony.segments.map((seg, i) => [
      String(i + 1),
      seg.title,
      `${seg.estimatedDuration} min`,
      seg.trackId ? trackName(seg.trackId) : '—',
    ]),
    foot: [['', 'Durée totale estimée', `${totalMinutes} min`, '']],
    headStyles: { fillColor: [23, 26, 33], textColor: [201, 162, 75] },
    footStyles: { fillColor: [255, 255, 255], textColor: [90, 90, 90], fontStyle: 'italic' },
    styles: { fontSize: 10 },
    columnStyles: { 0: { cellWidth: 8 }, 2: { cellWidth: 22 } },
  })

  // -- Diaporama --
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  if (y > pageHeight - 40) {
    doc.addPage()
    y = 22
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Diaporama photo', marginX, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90, 90, 90)
  const transitionLabels: Record<string, string> = {
    fade: 'Fondu enchaîné',
    dissolve: 'Dissolution',
    slide: 'Glissement',
    kenburns: 'Ken Burns',
    cut: 'Cut sec',
  }
  const slideshowLine =
    `${ceremony.slideshow.photoIds.length} photo(s) · transition : ${transitionLabels[ceremony.slideshow.transition] ?? ceremony.slideshow.transition} · ` +
    `${ceremony.slideshow.slideDuration}s/photo · musique : ${trackName(ceremony.slideshow.trackId)}`
  doc.text(slideshowLine, marginX, y + 6)

  // -- Texte complet de chaque étape --
  const segmentsWithScript = ceremony.segments.filter((s) => s.script.trim().length > 0)
  if (segmentsWithScript.length > 0) {
    doc.addPage()
    y = 22
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(20, 20, 20)
    doc.text('Textes à lire', marginX, y)
    y += 10

    for (const seg of segmentsWithScript) {
      const titleLines = 8
      if (y > pageHeight - 30) {
        doc.addPage()
        y = 22
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(163, 132, 62) // gold-dim
      doc.text(seg.title, marginX, y)
      y += 6

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(30, 30, 30)
      const lines = doc.splitTextToSize(seg.script, contentWidth) as string[]
      for (const line of lines) {
        if (y > pageHeight - 18) {
          doc.addPage()
          y = 22
        }
        doc.text(line, marginX, y)
        y += 5.5
      }
      y += titleLines - 2
    }
  }

  // -- Pied de page --
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Céréma · ${ceremony.title}`, marginX, pageHeight - 10)
    doc.text(`Page ${i}/${pageCount}`, pageWidth - marginX, pageHeight - 10, { align: 'right' })
  }

  const safeTitle = toSafeFilename(ceremony.title) || 'ceremonie'
  const filename = `Deroule - ${safeTitle} - ${ceremony.date}.pdf`
  doc.save(filename)
}
