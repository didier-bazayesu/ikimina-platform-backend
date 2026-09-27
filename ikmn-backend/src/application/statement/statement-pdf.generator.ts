import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { StatementData } from './statement.repository.interface';

@Injectable()
export class StatementPdfGenerator {
  async generatePdf(data: StatementData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('Ikimina Member Statement', { align: 'center' });
        doc.moveDown();

        // Member Info
        doc
          .fontSize(12)
          .text(`Member Name: ${data.member.name}`)
          .text(`Member Number: ${data.member.number}`);

        // Period
        if (data.period.start || data.period.end) {
          const start = data.period.start
            ? data.period.start.toISOString().split('T')[0]
            : 'Beginning';
          const end = data.period.end
            ? data.period.end.toISOString().split('T')[0]
            : 'Now';
          doc.text(`Period: ${start} to ${end}`);
        } else {
          doc.text('Period: All Time');
        }

        doc.moveDown();
        doc.text(`Opening Balance: ${data.openingBalance.toFixed(2)}`);
        doc.moveDown();

        // Table Header
        const tableTop = doc.y;
        const colDate = 50;
        const colDesc = 150;
        const colAmt = 350;
        const colBal = 450;

        doc.font('Helvetica-Bold');
        doc.text('Date', colDate, tableTop);
        doc.text('Description', colDesc, tableTop);
        doc.text('Amount', colAmt, tableTop);
        doc.text('Running Balance', colBal, tableTop);

        doc
          .moveTo(50, tableTop + 15)
          .lineTo(550, tableTop + 15)
          .stroke();

        let y = tableTop + 20;
        doc.font('Helvetica');

        // Table Rows
        for (const tx of data.transactions) {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          const txDate = tx.date
            ? new Date(tx.date).toISOString().split('T')[0]
            : '';
          doc.text(txDate, colDate, y);
          doc.text(tx.description || '', colDesc, y, { width: 190 });
          doc.text(tx.amount.toFixed(2), colAmt, y);
          doc.text((tx.runningBalance || 0).toFixed(2), colBal, y);
          y += 20;
        }

        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 10;

        // Closing Balance
        doc.font('Helvetica-Bold');
        doc.text(
          `Closing Balance: ${data.closingBalance.toFixed(2)}`,
          colDate,
          y,
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
