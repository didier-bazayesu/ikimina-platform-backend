import type { TokenHasherInterface } from './token-hasher.interface';

export class TokenHasherMock implements TokenHasherInterface {
  hash(rawToken: string): string {
    return `hashed:${rawToken}`;
  }
}
