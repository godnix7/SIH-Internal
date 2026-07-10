# Cost Estimation & OPEX Model

> **Document**: 35-cost-estimation.md  
> **Version**: 1.0.0  
> **Last Updated**: July 2026  
> **Audience**: Project Sponsors, Cloud Architects  
> **Related**: [Deployment Architecture](29-deployment-architecture.md)

---

## 1. Overview

Yatri Shield is designed to be highly cost-efficient during idle periods while capable of scaling massively during peak seasons. This document outlines the Operational Expenditure (OPEX) model for a typical State-level deployment (e.g., 100,000 active tourists).

## 2. Infrastructure Costs (Cloud Provider)

Assuming a MeitY-empanelled cloud provider (e.g., AWS/Azure India region).

| Component                       | Sizing / Metric                              | Estimated Monthly Cost (INR) | Notes                                 |
| ------------------------------- | -------------------------------------------- | ---------------------------- | ------------------------------------- |
| **Kubernetes Cluster**          | Control Plane                                | ₹6,000                       | Fixed cost                            |
| **Compute Nodes (API/Workers)** | 6 x Medium Instances (Auto-scaling up to 20) | ₹30,000                      | Highly variable based on season       |
| **Database (PostgreSQL HA)**    | 2 x Large Instances + 1TB Storage            | ₹45,000                      | Fixed. Includes Multi-AZ              |
| **Cache (Redis)**               | 2 x Medium Instances                         | ₹12,000                      | Fixed.                                |
| **Object Storage (S3)**         | 2TB (Evidence + Logs)                        | ₹4,000                       | Incremental                           |
| **Load Balancer & WAF**         | Base + Traffic                               | ₹15,000                      | WAF rules incur extra cost            |
| **Network Egress**              | ~1TB                                         | ₹8,000                       | WebSockets use persistent connections |
| **Subtotal**                    |                                              | **~₹120,000 / month**        |                                       |

## 3. External API & Integration Costs

| Integration              | Metric                 | Estimated Monthly Cost (INR) | Notes                            |
| ------------------------ | ---------------------- | ---------------------------- | -------------------------------- |
| **SMS Gateway (DLT)**    | 200,000 SMS @ ₹0.15    | ₹30,000                      | OTPs and SOS fallbacks           |
| **FCM / APNs (Push)**    | Unlimited              | ₹0                           | Free tier                        |
| **DigiLocker / Aadhaar** | N/A                    | Variable / Gov Subsidized    | Assumed free for state project   |
| **Maps / Geocoding**     | OpenStreetMap / Mappls | ₹10,000                      | Caching heavily reduces API hits |
| **Subtotal**             |                        | **~₹40,000 / month**         |                                  |

## 4. Total Cost of Ownership (TCO)

**Estimated Cloud OPEX for 100k Active Tourists: ~~₹1.6 Lakhs per month (~~₹19.2 Lakhs/year).**

### 4.1 Cost Optimization Strategies

- **Spot Instances**: Use Spot instances for stateless async background workers (e.g., Risk Engine evaluation, anchor batching).
- **Partition Dropping**: Strict adherence to the 90-day data retention policy ensures the database does not grow infinitely, capping storage costs.
- **WebSocket over Polling**: Maintaining a WebSocket connection for 10,000 dashboards is significantly cheaper in compute and egress than having 10,000 dashboards polling a REST API every 3 seconds.

---

## References

- [Deployment Architecture](29-deployment-architecture.md)
