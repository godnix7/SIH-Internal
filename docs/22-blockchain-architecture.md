# Blockchain & Evidence Anchoring

> **Document**: 22-blockchain-architecture.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Backend engineers, Security engineers, Legal/Compliance  
> **Related**: [Backend Architecture](13-backend-architecture.md), [Database Architecture](14-database-architecture.md)

---

## 1. Objective

To comply with the _Bharatiya Sakshya Adhiniyam, 2023 (BSA)_ regarding electronic evidence admissibility, Yatri Shield implements a cryptographic hash-chaining mechanism for all incident data. This guarantees non-repudiation and proves that no system administrator or operator altered the timeline of an incident after the fact.

## 2. Architecture

We do not store PII or actual event data on a blockchain. We store mathematical proofs (hashes).

### 2.1 The Event Hash Chain

Every event related to an Incident (creation, operator acknowledgement, location update, evidence upload, closure) forms a chronological chain.

```
Hash_N = SHA-256( Hash_N-1 || Event_Type || Event_Data_Hash || Timestamp )
```

This chain lives in the standard PostgreSQL database (`incident.incident_events` and `blockchain.event_chain`). If any past event is modified, all subsequent hashes become invalid.

### 2.2 Merkle Tree Batching

Writing every single event to a blockchain is too slow and expensive. We use a batching approach.

1. The `anchor_batcher` background worker runs every 10 minutes (or every 500 events).
2. It collects the terminal `chain_head` hashes of all active incidents that had activity in that window.
3. It constructs a Merkle Tree from these hashes.
4. The Merkle Root is generated.

### 2.3 The Blockchain Anchor

The Merkle Root is written to a distributed ledger.

- **MVP**: A cryptographic Transparency Log (similar to Certificate Transparency logs) hosted across multiple government servers.
- **Production**: A Hyperledger Besu permissioned consortium network (nodes run by Police Dept, Tourism Dept, and an independent judicial auditor).

## 3. Verification Process

When a digital forensic report is required for court:

1. The system exports the specific Incident's event chain.
2. It exports the Merkle Inclusion Proof connecting the incident's `chain_head` to the Merkle Root.
3. The court auditor queries the Blockchain to verify the Merkle Root exists and was timestamped at the claimed time.
4. The auditor hashes the incident events sequentially to verify they match the `chain_head`.

If the hashes match, mathematical proof exists that the records have remained pristine since the moment they were anchored.

---

## References

- [System Architecture](11-system-architecture.md)
- [Database Architecture](14-database-architecture.md)
