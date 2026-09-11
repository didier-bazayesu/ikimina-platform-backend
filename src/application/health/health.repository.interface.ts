export interface HealthRepositoryInterface {
  check(): Promise<boolean>;
}
