export interface HealthServiceInterface {
  check(): Promise<boolean>;
}
