const toDate = (iso: string): Date => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
  return d
}

const toISODate = (d: Date): string => d.toISOString().slice(0, 10)

export type DateColumn = {
  iso: string
  dow: string
  label: string
}

export const buildDateColumns = (startISO: string, endISO: string): DateColumn[] => {
  const start = toDate(startISO)
  const end = toDate(endISO)
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())

  const fmtDow = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
  const fmtLabel = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
  })

  const out: DateColumn[] = []
  while (cursor.getTime() <= endUtc) {
    const iso = toISODate(cursor)
    out.push({
      iso,
      dow: fmtDow.format(cursor).replace('.', ''),
      label: fmtLabel.format(cursor),
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return out
}
