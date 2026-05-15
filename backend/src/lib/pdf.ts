import PDFDocument from 'pdfkit';
import type { Response } from 'express';

export function streamPdf(
  res: Response,
  title: string,
  rows: Record<string, unknown>[],
): void {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).text(title, { align: 'center' });
  doc.moveDown();

  if (rows.length === 0) {
    doc.fontSize(11).text('No data available.');
  } else {
    const keys = Object.keys(rows[0] ?? {});
    for (const row of rows) {
      const line = keys.map((k) => `${k}: ${String(row[k] ?? '')}`).join('  |  ');
      doc.fontSize(9).text(line);
    }
  }

  doc.end();
}
