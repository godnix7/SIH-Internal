# Test Strategy

> **Document**: 32-test-strategy.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: QA Engineers, Software Engineers  
> **Related**: [System Architecture](11-system-architecture.md), [Performance Testing](33-performance-testing.md)

---

## 1. Overview

Yatri Shield handles life-or-death situations. Testing must be rigorous, automated, and continuous. We follow a strict Testing Pyramid approach.

## 2. The Testing Pyramid

### 2.1 Unit Testing (Base Layer)

- **Scope**: Individual functions, algorithms, and models isolated from the database and network.
- **Coverage Target**: 85% line coverage minimum.
- **Tools**: `pytest` (Backend), `Jest` (Frontend/Mobile).
- **Critical Areas**:
  - Risk Engine scoring algorithms (must have 100% path coverage).
  - Geofence point-in-polygon mathematical logic.
  - Encryption/Decryption helper functions.
  - JWT generation and validation logic.

### 2.2 Integration Testing (Middle Layer)

- **Scope**: Interactions between modules, database queries, Redis caching, and API endpoints.
- **Execution**: Runs against a real (but ephemeral) PostgreSQL and Redis instance spun up via Docker/Testcontainers.
- **Tools**: `pytest-asyncio`, `httpx.AsyncClient`.
- **Critical Areas**:
  - Outbox relay pattern (verifying DB write + Event publish).
  - API endpoint input validation and status codes.
  - Database schema migrations (Alembic downgrade/upgrade tests).

### 2.3 End-to-End (E2E) Testing (Top Layer)

- **Scope**: Full user journeys from the UI to the database and back.
- **Tools**: `Playwright` (Web Dashboards), `Detox` or `Appium` (Mobile App).
- **Execution**: Runs against the Staging environment nightly.
- **Critical Journeys**:
  - End-to-end SOS trigger → Dashboard receipt → Operator acknowledgement.
  - Full Trip creation → Check-in workflow.
  - Zone creation by Admin → Zone pack download by Mobile.

## 3. Specialized Testing

### 3.1 Contract Testing

Because the mobile app (frontend) and API (backend) may deploy at different times, API contracts must be strictly enforced.

- **Tool**: Pydantic schema validation against OpenAPI specs.
- Mobile clients run tests against mock servers generated directly from the backend's OpenAPI definition.

### 3.2 Chaos Engineering

To verify system resilience (Graceful Degradation):

- Randomly kill API pods during load tests.
- Introduce artificial latency to the database connection.
- Drop Redis cache to ensure the system gracefully falls back to PostgreSQL reads without crashing.

### 3.3 Security & Penetration Testing

- **Automated SAST**: Run `Bandit` (Python) and `Semgrep` in the CI pipeline to catch obvious vulnerabilities (e.g., hardcoded secrets, SQL injection).
- **Manual Pentest**: Required bi-annually by an external CERT-In empanelled auditor. Focus on JWT manipulation, IDOR (Insecure Direct Object Reference) on incidents, and privilege escalation.

## 4. Test Data Management

- **NO Production Data in Test**: Copying production databases to staging/dev is strictly forbidden due to PII.
- **Data Synthesis**: Use libraries like `Faker` to generate synthetic users, trips, and location histories.
- **Seed Scripts**: Automated scripts to populate a fresh database with the necessary organizations, roles, and dummy incidents for E2E testing.

---

## References

- [Performance Testing](33-performance-testing.md)
- [Deployment Architecture](29-deployment-architecture.md)
