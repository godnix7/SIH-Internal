# Deployment Architecture

> **Document**: 29-deployment-architecture.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: DevOps engineers, System administrators  
> **Related**: [System Architecture](11-system-architecture.md), [Database Architecture](14-database-architecture.md)

---

## 1. Hosting Environment

Yatri Shield handles highly sensitive data (location, medical, legal evidence) and must comply with Indian data localisation laws.

- **Environment**: MeitY-empanelled Cloud Service Provider (e.g., AWS India, Azure India, NIC Cloud).
- **Region**: Primary region within India (e.g., `ap-south-1`).
- **Isolation**: Deployed within a dedicated Virtual Private Cloud (VPC) with strict security groups. No databases are accessible from the public internet.

## 2. MVP Deployment (Single/Dual Node)

For initial pilot phases (e.g., one district), a highly clustered architecture introduces unnecessary operational overhead.

### 2.1 Topology

- **Load Balancer**: Cloud provider's managed Application Load Balancer (ALB).
- **Compute Node (VM)**:
  - Nginx (Reverse Proxy)
  - FastAPI App (Multiple Uvicorn workers)
  - Celery/Custom Worker Process
- **Data Node (Managed Services)**:
  - Managed PostgreSQL (Primary + Read Replica).
  - Managed Redis.

### 2.2 Orchestration

- Docker Compose.
- Infrastructure mapped via Terraform.

## 3. Production Deployment (Kubernetes)

For state-wide or national deployment, the system scales horizontally using Kubernetes (EKS/AKS).

### 3.1 Namespace Topology

- `yatrishield-core`: API deployments, Real-time WebSockets.
- `yatrishield-workers`: Async workers (Notification, Risk, Anchor).
- `yatrishield-data`: StatefulSets (if self-hosting Redis/DB) or external endpoints.
- `yatrishield-monitoring`: Prometheus, Grafana, Promtail.

### 3.2 Autoscaling Policies

- **API Pods**: HPA based on CPU (target 70%) and concurrent requests.
- **WebSocket Pods**: HPA based on connection counts (target 500 per pod).
- **Worker Pods**: KEDA (Kubernetes Event-driven Autoscaling) based on Redis Queue depth. If the SOS queue exceeds 10 messages, scale up aggressively.

## 4. CI/CD Pipeline

The pipeline enforces code quality and security before any deployment.

### 4.1 Continuous Integration (CI)

Triggered on every Pull Request to `main`:

1. **Linting**: `ruff` (Python), `eslint` (TypeScript).
2. **Unit Tests**: `pytest` (Backend), `jest` (Frontend). Must pass 80% coverage.
3. **SAST**: Bandit (Python security scanning).
4. **Dependency Check**: OWASP Dependency Check / Dependabot.

### 4.2 Continuous Deployment (CD)

Triggered on merge to `main` (Staging) or Release Tag (Production):

1. **Build**: Docker images built and tagged with commit SHA.
2. **Push**: Images pushed to private Elastic Container Registry (ECR).
3. **Migrate**: Alembic runs database migrations (`expand` phase only during rolling deployments).
4. **Deploy**: Helm upgrades the Kubernetes release.
5. **Rollout**: Rolling update strategy. Old pods terminate only after new pods are `Ready`.

## 5. Environment Strategy

| Environment     | Purpose                            | Data                                                    |
| --------------- | ---------------------------------- | ------------------------------------------------------- |
| **Development** | Feature testing by devs.           | Mock data. Dropped frequently.                          |
| **Staging**     | QA, User Acceptance Testing (UAT). | Anonymised clone of production schema. No real PII.     |
| **Demo**        | Stakeholder demonstrations.        | Curated mock incidents. Visual watermark "DEMO SYSTEM". |
| **Production**  | Live system.                       | Live, encrypted PII. Strict access controls.            |

---

## References

- [System Architecture](11-system-architecture.md)
- [Disaster Recovery](31-disaster-recovery.md)
