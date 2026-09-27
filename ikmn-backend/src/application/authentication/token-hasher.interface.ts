export interface TokenHasherInterface {
  hash(rawToken: string): string;
}

export const TOKEN_HASHER = Symbol('TOKEN_HASHER');
