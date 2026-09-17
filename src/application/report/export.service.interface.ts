export interface ExportServiceInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateCsv(data: any[]): string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generatePdf(title: string, data: any[]): Promise<Buffer>;
}

export const EXPORT_SERVICE = Symbol('EXPORT_SERVICE');
