# Compliance & Standards

> **Document**: 28-compliance-standards.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Legal, QA, Product Managers, Engineers  
> **Related**: [Privacy Architecture](26-privacy-architecture.md), [Security Architecture](27-security-architecture.md)

---

## 1. Overview

Yatri Shield is a critical public safety platform. It must adhere to rigorous national and international standards across privacy, security, accessibility, and legal admissibility.

## 2. Privacy & Data Protection

| Standard / Act                                                | Application in Yatri Shield                                                                                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Digital Personal Data Protection (DPDP) Act, 2023 (India)** | Enforced via strict purpose limitation, granular consent tiers (0-3), the immutable Consent Ledger, and the Right to Erasure protocol. (See [Privacy Architecture](26-privacy-architecture.md)). |
| **GDPR (EU)**                                                 | While primarily for India, GDPR compliance is maintained to ensure European tourists trust the app. This includes Data Portability (ZIP export) and strict Data Minimization.                    |

## 3. Legal Admissibility

| Standard / Act                              | Application in Yatri Shield                                                                                                                                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bharatiya Sakshya Adhiniyam (BSA), 2023** | Replaces the Indian Evidence Act. Section 61/62 compliance regarding electronic records is achieved via the Hash-Chain and Merkle Tree blockchain anchoring. (See [Blockchain Architecture](22-blockchain-architecture.md)). |
| **Information Technology Act, 2000**        | Compliance regarding secure electronic records and signatures. Addressed via JWTs and cryptographic sealing of Zone Packs.                                                                                                   |

## 4. Security & Operations

| Standard / Act             | Application in Yatri Shield                                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CERT-In Guidelines**     | Adherence to the Indian Computer Emergency Response Team guidelines for secure application development, mandatory incident reporting (within 6 hours for critical breaches), and regular empanelled audits. |
| **ISO/IEC 27001:2022**     | Information Security Management Systems (ISMS). Framework used for defining access controls, break-glass procedures, and KMS integration.                                                                   |
| **MeitY Cloud Guidelines** | Deployment architecture strictly utilises MeitY-empanelled Cloud Service Providers (CSPs) within Indian geographic boundaries (Data Localization).                                                          |

## 5. Accessibility (a11y)

| Standard              | Application in Yatri Shield                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **WCAG 2.1 Level AA** | Mandatory for both the Mobile App and Dashboards.                                                                                              |
| **GIGW 3.0**          | Guidelines for Indian Government Websites and Apps. Enforces bilingual support (English/Hindi minimum), clear navigation, and contrast ratios. |

**Key Accessibility Implementations**:

- All critical workflows (SOS, Check-ins) are fully usable via TalkBack (Android) and VoiceOver (iOS).
- Contrast ratios exceed 4.5:1.
- No reliance on color alone to convey meaning (e.g., Red implies danger, but is always accompanied by an icon and text).
- Touch targets are minimum 48x48dp. (The SOS button is 120x120dp).

## 6. Audit & Certification Checklist

Prior to production launch, the following certifications are mandatory:

1. [ ] **CERT-In Empanelled Security Audit (Safe to Host Certificate)**.
2. [ ] **STQC (Standardisation Testing and Quality Certification)** for e-Governance applications.
3. [ ] **Accessibility Audit** (Internal + Third-party validation against WCAG 2.1 AA).
4. [ ] **Legal Review Sign-off** (Confirming DPDP and BSA 2023 alignment).

---

## References

- [Privacy Architecture](26-privacy-architecture.md)
- [Security Architecture](27-security-architecture.md)
- [Blockchain Architecture](22-blockchain-architecture.md)
