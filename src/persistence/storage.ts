import { Injectable } from '@nestjs/common';
import type {
  StorageAdapterInterface,
  FileUploadInput,
} from '../application/common/storage.interface';

@Injectable()
export class StorageAdapter implements StorageAdapterInterface {
  async upload(file: FileUploadInput): Promise<string> {
    const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    return `http://localhost:3000/uploads/${filename}`;
  }
}
