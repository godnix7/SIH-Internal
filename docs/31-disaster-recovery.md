# Backup & Disaster Recovery

> **Document**: 31-disaster-recovery.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: DevOps engineers, System administrators  
> **Related**: [Deployment Architecture](29-deployment-architecture.md), [Database Architecture](14-database-architecture.md)

---

## 1. Objectives

Yatri Shield must survive catastrophic infrastructure failure (e.g., an entire data centre going offline) with minimal data loss and downtime.

- **Recovery Time Objective (RTO)**: 15 minutes. (The maximum acceptable time the system can be offline before services are restored).
- **Recovery Point Objective (RPO)**: 1 minute. (The maximum acceptable data loss).

## 2. High Availability (HA) Design

Disaster Recovery is the last resort. High Availability prevents the disaster from causing downtime in the first place.

- **Multi-AZ Deployment**: All components (Load Balancers, API Pods, PostgreSQL Replicas, Redis Replicas) are distributed across at least 3 Availability Zones (AZs) within the primary cloud region.
- **Database Failover**: PostgreSQL uses Patroni/Repmgr for automated failover. If the primary master dies, a replica is promoted to master automatically within seconds.

## 3. Backup Strategy

### 3.1 Database Backups (PostgreSQL)

- **Continuous Archiving**: WAL (Write-Ahead Logs) are continuously streamed to Object Storage (S3) via WAL-G or pgBackRest. This enables Point-In-Time Recovery (PITR) up to the minute.
- **Daily Snapshots**: Full base backups are taken at 03:00 AM IST daily.
- **Retention**: Daily backups kept for 30 days. Weekly for 1 year. (Note: PII inside the backups remains encrypted via KMS).

### 3.2 KMS Backup

The Key Management Service configuration and Key Encryption Keys (KEKs) must be backed up securely. If the KMS is lost, the entire database becomes permanently unreadable cryptographically.

- Keys are exported (wrapped) to a highly secure offline HSM (Hardware Security Module) vault monthly.

### 3.3 Infrastructure as Code

There is no "server backup" because servers are cattle, not pets. The entire infrastructure is defined in Terraform and Kubernetes manifests stored in Git. In a disaster, the infrastructure is recreated from code, not restored from a disk image.

## 4. Cross-Region Disaster Recovery

In the event of a total region failure (e.g., `ap-south-1` is entirely down):

1. **Active-Passive Setup**: A secondary region (`ap-south-2`) runs a scaled-down "Pilot Light" environment.
2. **Replication**: The primary database asynchronously replicates to the secondary region.
3. **Failover Execution**:
   - DNS (Route 53 or equivalent) health checks detect the primary region failure.
   - DNS records automatically update to point traffic to the secondary region ALB.
   - Kubernetes cluster in the secondary region scales up from minimum replicas to full capacity automatically based on incoming traffic.
   - The secondary database is promoted to Primary.
4. **Data Loss**: Limited to the replication lag (typically < 10 seconds).

## 5. DR Testing

A disaster recovery plan is useless if untested.

- **Game Days**: Bi-annual "Game Days" are scheduled where engineers simulate a total AZ or Region failure in the Staging environment to verify RTO and RPO metrics.
- **Restoration Drills**: DBAs must perform a successful Point-In-Time Restore from the S3 WAL archives to a dummy instance every quarter.

---

## References

- [Deployment Architecture](29-deployment-architecture.md)
