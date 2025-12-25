# Software Requirements Specification (SRS)
## Project: FinTrack Pro | Secure Ledger Ecosystem v3.0

### 1. Introduction
#### 1.1 Purpose
This document specifies the functional and non-functional requirements for FinTrack Pro, a secure financial transaction management system. It serves as the primary reference for developers, auditors, and stakeholders.

#### 1.2 Scope
FinTrack Pro is an enterprise-grade terminal for recording, auditing, and analyzing financial settlements. It integrates real-time ledger management with Neural Intelligence (GenAI) for forensic data verification and multi-modal interaction.

### 2. Overall Description
#### 2.1 Product Perspective
The system operates as a high-security Single Page Application (SPA) backed by a cloud-native PostgreSQL infrastructure (Supabase). It serves as a decentralized node for branch-level financial operations.

#### 2.2 System Features
- **Deterministic Ledger**: Immutable recording of transactions.
- **Cryptographic Audit Seal**: Client-side CSPRNG (Secure ID) generation.
- **RBAC (Role-Based Access Control)**: Tiered authority levels (Super Admin, Admin, User).
- **Neural Forensic Core**: AI-driven anomaly detection and real-time voice/vision auditing.
- **Multimodal Interface**: Support for traditional input, OCR document scanning, and real-time audio-visual sessions.

### 3. Functional Requirements
#### 3.1 Authorization Node (Auth)
- **ID-3.1.1**: System shall verify user identity via JWT.
- **ID-3.1.2**: User roles shall be fetched from the security-hardened `users` table.
- **ID-3.1.3**: Protected routes shall intercept unauthorized access at the component level.

#### 3.2 Transaction Settlement
- **ID-3.2.1**: Every entry must include `Amount`, `Source`, and `Payment Mode`.
- **ID-3.2.2**: Digital transactions (UPI/Bank) must enforce UTR/Reference ID validation.
- **ID-3.2.3**: Every record must generate an immutable `secure_id` using `window.crypto` (128-bit entropy).

#### 3.3 Neural Audit Terminal
- **ID-3.3.1**: System shall use Gemini 3.0 Pro for complex forensic analysis of ledger data.
- **ID-3.3.2**: Live Audit sessions shall utilize `gemini-2.5-flash-native-audio` for sub-500ms latency voice interaction.
- **ID-3.3.3**: Visual Intelligence shall stream 1fps JPEG frames during live sessions for document verification.

### 4. Data Requirements
#### 4.1 Schema Definition
- **Transactions**: Foreign Key `created_by` -> `users.id`.
- **Activity Logs**: Metadata field to store `JSON` diffs for forensic reconstruction.
- **Users**: Unique identifiers tied to Supabase Auth UUIDs.

### 5. Non-Functional Requirements
#### 5.1 Security
- **Data-at-Rest**: Encrypted via AES-256.
- **Data-in-Transit**: TLS 1.3 mandated.
- **Integrity**: Row Level Security (RLS) policies to prevent cross-tenant data leakage.

#### 5.2 Performance
- **Neural Response**: Dashboard briefing < 2s.
- **Live Sync**: < 200ms audio jitter.

#### 5.3 UX/UI Standards
- Typography: Inter (UI), JetBrains Mono (Data).
- Transitions: Framer Motion physics-based animations.
- Accessibility: ARIA-compliant terminal nodes.
