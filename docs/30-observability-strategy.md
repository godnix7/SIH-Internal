# Observability Strategy

> **Document**: 30-observability-strategy.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: DevOps engineers, SREs  
> **Related**: [Deployment Architecture](29-deployment-architecture.md), [Backend Architecture](13-backend-architecture.md)

---

## 1. Overview

Yatri Shield must achieve "four nines" (99.99%) availability for the critical SOS path. Observability is not just logging; it is the proactive detection of systemic degradation before it impacts tourists in distress.

## 2. The Three Pillars

### 2.1 Metrics

Metrics provide numerical data on system health.

- **Tool**: Prometheus.
- **Key Dashboards (Grafana)**:
  - **USE Method** (Infrastructure): Utilization, Saturation, Errors for CPU, Memory, Disk, Network.
  - **RED Method** (API Services): Rate (requests/sec), Errors (5xx counts), Duration (p50, p95, p99 latency).
  - **Business Metrics**: Active trips, SOS received per minute, SOS Acknowledgement SLA breaches, Queue depths.

### 2.2 Logs

Logs provide discrete, timestamped records of events.

- **Tool**: Promtail -> Loki (or FluentBit -> CloudWatch).
- **Structure**: All logs must be structured JSON. No raw text logging.
- **PII Scrubbing**: Logs _must never_ contain plain-text phone numbers, names, or exact locations.
- **Correlation**: Every log line must include `correlation_id`.

```json
{
  "timestamp": "2026-07-15T14:30:00Z",
  "level": "INFO",
  "logger": "incident.service",
  "msg": "SOS Acknowledged",
  "correlation_id": "req-9f1c3b",
  "sos_id": "550e8400-e29b-41d4-a716-446655440000",
  "operator_id": "user-8812",
  "latency_ms": 42
}
```

### 2.3 Traces

Distributed tracing allows tracking a request across microservices and database calls.

- **Tool**: OpenTelemetry.
- **Implementation**: Trace IDs injected at the WAF/Gateway, propagated via HTTP headers (`traceparent`), and attached to all log lines and DB queries. Helps identify which specific function or query is causing the p99 latency spike.

## 3. Alerting & On-Call

Alerts are routed via Prometheus Alertmanager to PagerDuty/Opsgenie.

### 3.1 Alert Priorities

| Priority          | Trigger Condition                                                              | Action                                                                        |
| ----------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **P1 (Critical)** | `/sos` endpoint 5xx error rate > 1%. <br> OR SOS queue depth > 5 for > 2 mins. | Pages primary on-call immediately (SMS + Phone). Requires immediate response. |
| **P2 (High)**     | Overall API latency p95 > 2 seconds. <br> OR DB CPU > 85% for 10 mins.         | Pages primary on-call (Push + SMS).                                           |
| **P3 (Warning)**  | A single node restarts. <br> OR Partition retention worker fails.              | Creates Jira/Slack ticket. Handled during business hours.                     |

### 3.2 Synthetic Monitoring (Blackbox)

We cannot rely solely on tourists triggering SOS to know if the system is working.

- A synthetic monitoring script (external to the primary cloud provider) simulates a tourist connecting, creating a draft trip, sending a location batch, and sending a test SOS every 60 seconds.
- If the synthetic transaction fails, a P1 alert is triggered.

## 4. Audit vs. Application Logs

It is critical to distinguish between Application Logs and Audit Logs.

- **Application Logs**: Ephemeral (30-day retention), used for debugging, stored in Loki/Elasticsearch.
- **Audit Logs**: Permanent, immutable, legal records of access and configuration changes. Stored in PostgreSQL (`admin.audit_log`) and backed up to WORM (Write Once Read Many) storage.

---

## References

- [Database Architecture](14-database-architecture.md)
- [Deployment Architecture](29-deployment-architecture.md)
