# Security Architecture

> **Document**: 27-security-architecture.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Security engineers, DevOps, Backend engineers  
> **Related**: [System Architecture](11-system-architecture.md), [Authentication & Authorization](17-authentication-authorization.md)

---

## 1. Threat Model Summary

Yatri Shield faces several primary threat vectors:

1. **DDoS & API Abuse**: Flooding the SOS endpoints or location ingestion to disrupt service.
2. **Data Breach (PII)**: Exfiltration of the database containing tourist locations or medical data.
3. **Insider Threat**: Rogue DBAs or Operators accessing data without authorization.
4. **Spoofing/Tampering**: Injecting fake SOS calls or modifying incident timelines.

## 2. Infrastructure Security

### 2.1 Edge Defense (WAF & DDoS)

- **Web Application Firewall (WAF)**: Blocks SQLi, XSS, and malformed requests.
- **Rate Limiting**: Strictly enforced by the API Gateway (e.g., max 60 req/min for location batches).
- **Exceptions**: The `/sos` endpoint has distinct, extremely high rate limits to ensure genuine emergencies are never dropped, but relies on `Idempotency-Key` and `clientSosId` to drop duplicates instantly at the edge.

### 2.2 Network Segmentation

- **DMZ**: Load Balancers and WAF.
- **Application Subnet**: API Servers, WebSockets, Background Workers. (No inbound internet access; only from DMZ).
- **Data Subnet**: PostgreSQL, Redis. (Strictly limited to Application Subnet via Security Groups).

## 3. Data Encryption (Envelope Encryption)

To protect against Database Exfiltration and Insider Threats, Yatri Shield uses Envelope Encryption for all PII.

### 3.1 Mechanism

1. The backend integrates with a Key Management Service (KMS).
2. The KMS holds the Master Key (Key Encryption Key - KEK).
3. For every row/field containing PII (e.g., phone number, medical conditions), the application generates a unique Data Encryption Key (DEK).
4. The application encrypts the PII using the DEK (AES-256-GCM).
5. The application asks the KMS to encrypt the DEK using the KEK.
6. The database stores the ciphertext of the PII _and_ the ciphertext of the DEK.

**Result**: A DBA dumping the database gets useless ciphertext. They cannot decrypt it because they do not have access to the KMS.

## 4. Application Security

### 4.1 Input Validation

- Strict Pydantic models validate every inbound request. Malformed data is rejected before it reaches business logic.
- PostGIS functions strictly validate polygon geometry before saving.

### 4.2 Authentication & MFA

- All Authority Users are mandated to use TOTP MFA.
- JWTs are short-lived (15 minutes).

### 4.3 Mobile Client Security

- **Certificate Pinning**: The mobile app pins the public key of the backend's TLS certificate to prevent Man-in-the-Middle (MitM) attacks on public Wi-Fi.
- **Root/Jailbreak Detection**: Optional block (or warning) if the app detects a compromised OS environment.
- **SQLCipher**: All offline queues and local data on the device are encrypted using SQLCipher.

## 5. Vulnerability Management

- **SAST/DAST**: Static and Dynamic analysis run on every CI/CD pipeline execution.
- **Dependency Scanning**: automated checks for CVEs in Python/Node packages.
- **Penetration Testing**: Scheduled bi-annually by CERT-In empanelled auditors.

---

## References

- [System Architecture](11-system-architecture.md)
- [Database Architecture](14-database-architecture.md)
- [Authentication & Authorization](17-authentication-authorization.md)
