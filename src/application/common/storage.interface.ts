export interface FileUploadInput {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
}

export interface StorageAdapterInterface {
  upload(file: FileUploadInput): Promise<string>;
}

export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');
