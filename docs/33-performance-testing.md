# Performance & Load Testing

> **Document**: 33-performance-testing.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: QA Engineers, SREs  
> **Related**: [Non-Functional Requirements](04-non-functional-requirements.md), [Test Strategy](32-test-strategy.md)

---

## 1. Objective

To validate that Yatri Shield meets the scalability targets defined in the Non-Functional Requirements (NFRs), specifically under extreme load conditions such as a regional disaster where thousands of tourists trigger SOS or Check-in simultaneously.

## 2. Load Models

We define three primary load models for testing.

### 2.1 Baseline Load (Normal Day)

- **Profile**: 100,000 active tourists.
- **Activity**:
  - 10,000 location batches ingested per minute.
  - 500 manual check-ins per minute.
  - 5 SOS triggers per hour.
- **Success Criteria**: Location ingest p95 latency < 500ms. No dropped requests.

### 2.2 Stress Load (Peak Season)

- **Profile**: 500,000 active tourists (e.g., Kumbh Mela or peak Goa season).
- **Activity**:
  - 50,000 location batches per minute.
  - 2,500 check-ins per minute.
  - 50 SOS triggers per hour.
- **Success Criteria**: Location ingest p95 latency < 1000ms. SOS creation p99 latency < 500ms.

### 2.3 Spike Load (Disaster Scenario)

- **Profile**: A sudden earthquake in a dense tourist zone.
- **Activity**:
  - 5,000 SOS triggers in 60 seconds.
  - 100,000 WebSocket reconnections (cellular network flap).
- **Success Criteria**:
  - 100% of SOS triggers accepted (202 Accepted) within 1000ms.
  - Zero dropped SOS requests.
  - It is acceptable for location batch ingestion to return 429 Backpressure to prioritize SOS.

## 3. Testing Methodology

### 3.1 Tooling

- **Load Generator**: `k6` (distributed via Kubernetes).
- **Mocking**: SMS gateways and Push Notification gateways must be mocked during load tests to avoid incurring massive external API costs or hitting partner rate limits.

### 3.2 Environment

Load tests must be executed against an environment that is a 1:1 replica of Production. Running a spike test against a single-node staging server is invalid.

### 3.3 Test Execution

1. **Pre-test**: Ensure database is seeded with realistic background data (e.g., 100 million historical location rows) to accurately measure index degradation.
2. **Ramp-up**: Increase virtual users gradually over 10 minutes.
3. **Plateau**: Hold peak load for 30 minutes.
4. **Analysis**: Correlate k6 latency metrics with Prometheus node metrics to identify the exact bottleneck (e.g., "The CPU on the Redis master pegged at 100% during the WebSocket reconnect storm").

## 4. The "Thundering Herd" Mitigation Test

When a zone pack updates or a mass check-in challenge is issued, 100,000 devices might wake up simultaneously and hit the API.

- **Test**: Trigger a mass push notification to simulated devices.
- **Validation**: Verify that the mobile client correctly applies random jitter (e.g., 0–30 seconds) before contacting the server, successfully flattening the traffic spike.

---

## References

- [Non-Functional Requirements](04-non-functional-requirements.md)
- [Observability Strategy](30-observability-strategy.md)
