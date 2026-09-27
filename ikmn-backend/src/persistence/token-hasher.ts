import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { TokenHasherInterface } from '../application/authentication/token-hasher.interface';

@Injectable()
export class TokenHasher implements TokenHasherInterface {
  hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
