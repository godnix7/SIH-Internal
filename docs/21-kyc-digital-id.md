# KYC & Digital Tourist ID

> **Document**: 21-kyc-digital-id.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Backend engineers, Security engineers  
> **Related**: [Backend Architecture](13-backend-architecture.md), [Database Architecture](14-database-architecture.md)

---

## 1. Overview

To prevent abuse (prank SOS calls) and ensure responders have accurate identity data, Yatri Shield encourages identity verification (KYC). Verification is _not_ mandatory for basic SOS functions, but a verified identity receives higher priority in the Operator Queue.

## 2. Verification Methods

### 2.1 Domestic Tourists (Aadhaar via DigiLocker)

- **Integration**: Standard DigiLocker OAuth2 flow.
- **Data Fetched**: Name, Date of Birth, Photo, Address.
- **Storage**: Data is encrypted via KMS-backed envelope encryption before storage.
- **Confidence Level**: `HIGH`.

### 2.2 International Tourists (Passport OCR)

- **Integration**: Client-side MLKit / Vision OCR scans the Machine Readable Zone (MRZ).
- **Data Fetched**: Surname, Given Names, Nationality, Passport Number, DOB, Expiry.
- **Verification**: The app captures a photo of the passport page. The backend runs a secondary validity check on the MRZ checksums.
- **Storage**: Encrypted via KMS.
- **Confidence Level**: `MEDIUM`. (Subject to physical inspection by authorities if necessary).

### 2.3 Provisional (Unverified)

- Tourists who skip KYC are marked as `PROVISIONAL`.
- They can still trigger SOS, but their queue priority is lowered, and their Digital ID displays a prominent "⚠ Self-Declared" warning.
- **Confidence Level**: `LOW`.

## 3. Digital Tourist ID

The Digital Tourist ID is a verifiable credential presented as a QR code on the tourist's device.

### 3.1 QR Code Payload

The payload is a signed JSON Web Token (JWT).

```json
{
  "iss": "yatrishield",
  "sub": "user_uuid",
  "type": "digital_id",
  "name": "Elena Garcia",
  "verified": true,
  "bloodGroup": "B+",
  "tripId": "trip_uuid",
  "exp": 1784102400
}
```

### 3.2 Verification

Authorities scanning the QR code use their own Yatri Shield Dashboard/App, which verifies the JWT signature against the backend's public key. This proves the ID was issued by the platform and hasn't been tampered with.

## 4. Medical Card

The Medical Card is an extension of the Digital ID.

- It contains allergies, medications, pre-existing conditions, and insurance info.
- **Important**: This data is entirely user-supplied. It is _always_ flagged as `⚠ Self-Declared` in the Hospital Dashboard to ensure clinical decisions are made with appropriate caution.

---

## References

- [Form Specifications](10-form-specifications.md)
- [API Specification](15-api-specification.md)
