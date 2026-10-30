import type { Match } from '../types';

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export function visitListToCsv(matches: readonly Match[]): string {
  const header = ['Row', 'Booth', 'Exhibitor', 'Match %', 'Matched on', 'Product areas'];
  const rows = matches.map((m) => [
    m.exhibitor.hall,
    m.exhibitor.booth,
    m.exhibitor.name,
    m.score,
    m.insights.map((f) => f.label).join('; '),
    m.exhibitor.tags.join('; '),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
