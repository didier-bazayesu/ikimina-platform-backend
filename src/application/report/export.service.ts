import { Injectable } from '@nestjs/common';
import type { ExportServiceInterface } from './export.service.interface';
import PDFDocument from 'pdfkit';

@Injectable()
export class ExportService implements ExportServiceInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateCsv(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }
    const headers = Object.keys(data[0]);
    const csvRows: string[] = [];
    csvRows.push(headers.join(','));
    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        // naive escaping
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val}"`;
        }
        return String(val ?? '');
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generatePdf(title: string, data: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        doc.fontSize(20).text(title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12);

        for (const row of data) {
          for (const key of Object.keys(row)) {
            doc.text(`${key}: ${row[key]}`);
          }
          doc.moveDown();
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
