export interface HealthService {
  check(): Promise<boolean>;
}
