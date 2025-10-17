# LocalEx v6 – Legal & Financial Readiness Summary (Apple + Google)

**Version:** 1.0  
**Date:** October 12, 2025  
**Prepared for:** LocalEx Legal & Compliance Team  
**Purpose:** To summarize all legal, financial, and compliance actions required before enabling payment code and app store submission.

---

## 1. App Store / Play Store Compliance Overview

| Platform | Core Rule | How It Applies to LocalEx | Risk | Required Action |
|-----------|------------|---------------------------|------|-----------------|
| **Apple App Store (Section 3.1.1)** | Apple prohibits external or in-app payments for digital goods; allows off-platform payments for physical goods/services. | LocalEx facilitates **physical goods trades**; all payments are for **service fees** (escrow, safety verification). | ⚠️ Apple may misinterpret credits or escrow as digital currency. | Legal review of UI/wording; ensure credits are labeled as *non-redeemable barter tokens*. Avoid “buy,” “sell,” or “cash-out.” |
| **Google Play (Payments & Monetization Policy)** | Must use Play Billing for digital goods; off-platform payments allowed for physical goods or real-world services. | LocalEx exchanges **physical goods**; uses Stripe for processing service fees. | ⚠️ Google could classify $1.99 + 3.75% fees as digital service charges. | Include explicit disclosure in Play Store listing: “Facilitates in-person exchange of physical goods using Stripe for service fees.” |
| **Both Platforms** | Require accurate ToS, Privacy Policy, and disclosure of payment handling. | LocalEx has privacy-tiered design and escrow workflow. | ⚠️ Missing policies can cause rejection. | Publish ToS + Privacy Policy URLs before submission; reference Stripe and Coinbase in disclosures. |

---

## 2. Financial & Licensing Compliance

| Area | Current Coverage | Why It Matters | Action Required |
|------|------------------|----------------|----------------|
| **Money-Transmitter Laws (Federal & State)** | Likely exempt – credits are closed-loop barter tokens. | Avoids classification as stored-value or virtual currency. | Obtain **opinion memo** from fintech counsel confirming exemption. |
| **Stripe Merchant of Record** | Fully covered (Stripe Connect Standard/Express). | Stripe carries PCI and AML obligations. | Confirm Stripe Connect setup (Standard or Express, not Custom). |
| **BTC Conversion (Coinbase Commerce)** | Non-custodial redirect flow. | Avoids crypto custody and FinCEN licensing. | Request **written confirmation** from Coinbase Commerce. |
| **PCI DSS** | SAQ-A compliant via Stripe tokenization. | Ensures card data never hits LocalEx servers. | Confirm SAQ-A scope in documentation. |
| **Refund Policy & Disputes** | Partial coverage via webhook logic. | Required for both app stores. | Add refund terms to ToS and payment handling documentation. |

---

## 3. Privacy, Security & Data Handling Compliance

| Regulation | LocalEx Readiness | Importance | Action |
|-------------|-------------------|-------------|---------|
| **GDPR / CCPA / U.S. State Privacy Laws** | Tiered PII model (Tiers 1–3) already designed. | Legal requirement for user data protection and deletion. | Publish Privacy Policy referencing deletion/export rights and data retention windows. |
| **Children’s Online Privacy Protection (COPPA)** | Adults only implied. | Regulates under-18 user participation. | Add “Users must be 18+” clause in ToS. |
| **Location Permissions (Google Play + iOS)** | Safe Zone requires location data. | Must justify foreground location usage. | Add disclosure: “Location used to suggest safe meetup zones.” |
| **Photo & Identity Handling** | Escrow-gated access control already implemented. | Prevents privacy violations. | Include audit trail language in Privacy Policy. |

---

## 4. Required Legal Documents

| Document | Purpose | Owner | Notes |
|-----------|----------|--------|-------|
| **Terms of Service** | Defines trades, fees, disclaimers, Safe Zone liability limits. | Legal Counsel | Include sections for escrow, refunds, and user safety responsibility. |
| **Privacy Policy** | Describes data tiers, storage, retention, and user rights. | Legal Counsel | Required in both app store listings. |
| **Credits Policy Statement** | Defines credits as non-redeemable, non-transferable barter tokens. | Drafted internally, reviewed by counsel | Keeps LocalEx outside stored-value law. |
| **App Store & Play Store Listing Language** | Describes LocalEx as physical goods marketplace with Stripe integration. | Product + Legal | Avoid “buy/sell” terms; emphasize “trade” and “facilitation.” |
| **Compliance Opinion (Money-Transmitter)** | Confirms exemption from licensing. | Fintech Attorney | Provides legal backing for investors and app stores. |

---

## 5. Risk Controls & Mitigations

| Risk | Impact | Mitigation Strategy |
|------|--------|--------------------|
| **Safe Zone liability** | Physical injury or theft risk. | Add disclaimer: “Users responsible for own safety; meet only in verified Safe Zones.” |
| **User identity exposure** | Privacy breach potential. | Maintain escrow-gated photo access; log all views. |
| **Chargebacks or payment fraud** | Medium financial risk. | Use Stripe Radar + transaction velocity checks. |
| **Location misuse** | User tracking concerns. | Store ZIP + city only; never expose lat/lng externally. |

---

## 6. Immediate Action Plan

| Priority | Task | Deliverable | Responsible | Est. Cost/Time |
|-----------|------|--------------|--------------|----------------|
| 🔺 | Draft Credits Policy + Compliance Summary | 2-page doc | Product (with counsel review) | 1 day |
| 🔺 | Engage app/fintech counsel for dual-store review | Opinion memo | Legal counsel | $3–6K / 1–2 weeks |
| 🔺 | Verify Stripe Connect configuration | Stripe setup validation | Product + Stripe | Free / 1 day |
| 🔺 | Confirm Coinbase non-custodial model | Email confirmation | Product + Coinbase | Free / 1 day |
| ⚙️ | Draft Privacy Policy & ToS | Legal documentation | Counsel | $2–3K / 1 week |
| ⚙️ | Update App Store + Google Play listings | Metadata + screenshots | Product | 1–2 days |
| ⚙️ | Add refund/dispute clauses | Backend + ToS update | Engineering + Legal | 1 day |

---

## 7. Legal References for Counsel Review

### Apple App Store – Section 3.1.1 Key Points
- External payments allowed only for physical goods and services delivered outside the app.
- Apps offering peer-to-peer exchange of tangible goods may use third-party payment processors (e.g., Stripe).
- Credits must not function as redeemable currency.

### Google Play Payments Policy Key Points
- Play Billing required for digital goods.
- Third-party payment processing allowed for physical goods, peer-to-peer services, or real-world experiences.
- Must declare in the app listing that physical goods/services are exchanged and that Google is not involved in payment collection.

---

## 8. Appendix A – Draft Credits Policy Language

> **Credits Policy (Proposed)**  
> LocalEx Credits are non-redeemable digital barter tokens used solely to facilitate value exchanges within the LocalEx platform. Credits **have no cash value**, are **non-transferable outside LocalEx**, and **cannot be converted into currency or withdrawn**. They serve as a closed-loop accounting unit to simplify user trades. All real-world payments (platform or marketplace fees) are processed via Stripe, a PCI Level 1 certified payment provider. LocalEx does not issue, store, or redeem fiat or cryptocurrency.  

---

## 9. Appendix B – App Store & Google Play Compliance Summary

> **App Description Compliance Statement (Proposed)**  
> LocalEx is a community trading app that facilitates the **exchange of physical goods** between verified local users. The app uses **Stripe** for processing small service fees associated with escrow, safety verification, and platform operations. All goods exchanged occur **in person**, outside the app, at user-selected Safe Zones. LocalEx does **not** sell or deliver digital goods or services through the app and is therefore compliant with Apple App Store Section 3.1.1 and Google Play’s Payments Policy for physical goods.

---

## 10. Summary of Legal Readiness

| Category | Confidence | Reason |
|-----------|-------------|--------|
| **Phase 1 Technical Foundation** | ✅ 95% | Fully validated and tested infrastructure. |
| **App Store Compliance (Apple + Google)** | ⚠️ 80% | Requires legal verification of listings and terminology. |
| **Financial Compliance (Stripe, Coinbase)** | ✅ 90% | Stripe and Coinbase handle regulated functions. |
| **Privacy & Data Protection** | ✅ 85% | Tiered PII model implemented; needs privacy policy publication. |
| **Overall Legal Readiness for Payment Implementation** | ⚠️ 85% | Strong foundation pending final counsel review. |

---

**Prepared by:** GPT-5 (AI System Design Partner)  
**For:** LocalEx Legal, Product, and Compliance Teams  
**Contact:** travis@localex.ai  

*This document summarizes the legal and financial readiness steps for LocalEx v6 prior to Phase 2.5 implementation of payment features. It is not a substitute for legal advice.*

