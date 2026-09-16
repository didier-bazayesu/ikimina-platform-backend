import type {
  StorageAdapterInterface,
  FileUploadInput,
} from '../application/common/storage.interface';

export class StorageAdapterMock implements StorageAdapterInterface {
  async upload(file: FileUploadInput): Promise<string> {
    return `https://mock-storage.local/proofs/${file.originalname || 'proof.pdf'}`;
  }
}
