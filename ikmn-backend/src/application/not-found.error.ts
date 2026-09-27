export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    // Restores correct `instanceof` behavior when extending a built-in
    // like Error under some TS compile targets — without this,
    // `@Catch(NotFoundError)` can silently fail to match.
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
