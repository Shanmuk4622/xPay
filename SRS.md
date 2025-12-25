# Software Requirements Specification (SRS)
## Project: FinTrack Pro | Secure Ledger Ecosystem v3.5

### 1. Introduction
#### 1.1 Purpose
This document specifies the functional and non-functional requirements for FinTrack Pro, a secure financial transaction management system. It serves as the primary reference for developers, auditors, and stakeholders.

#### 1.2 Scope
FinTrack Pro is an enterprise-grade terminal for recording, auditing, and analyzing financial settlements. It integrates real-time ledger management with Neural Intelligence (GenAI) for forensic data verification and multi-modal interaction.

### 2. Overall Description
#### 2.1 Product Perspective
The system operates as a high-security Single Page Application (SPA) backed by a cloud-native PostgreSQL infrastructure (Supabase). It serves as a decentralized node for branch-level financial operations.

#### 2.2 System Features
- **Deterministic Ledger**: Immutable recording of transactions with secondary audit trails.
- **Cryptographic Audit Seal**: Client-side CSPRNG (Secure ID) generation and HMAC-based integrity verification.
- **RBAC (Role-Based Access Control)**: Tiered authority levels (Super Admin, Admin, User).
- **Neural Forensic Core**: AI-driven anomaly detection and real-time voice/vision auditing using Gemini 3 Pro.
- **Multimodal Interface**: Support for traditional input, OCR document scanning, and real-time audio-visual sessions.
- **Neural Activity Stream**: Real-time chronological tracking of all entity state changes.

### 3. Functional Requirements
#### 3.1 Authorization Node (Auth)
- **ID-3.1.1**: System shall verify user identity via JWT-based authentication.
- **ID-3.1.2**: User roles shall be fetched from the security-hardened `users` table via RLS (Row Level Security).
- **ID-3.1.3**: Protected routes shall intercept unauthorized access at the component level with a "Access Denied" terminal UI.

#### 3.2 Transaction Settlement
- **ID-3.2.1**: Every entry must include `Amount`, `Source`, and `Payment Mode`.
- **ID-3.2.2**: Digital transactions (UPI/Bank) must enforce UTR/Reference ID validation.
- **ID-3.2.3**: Every record must generate an immutable `secure_id` using `window.crypto` (128-bit entropy).
- **ID-3.2.4**: Super Admins shall have the authority to manage multi-dimensional neural tags for forensic categorization.

#### 3.3 Neural Audit Terminal
- **ID-3.3.1**: System shall use Gemini 3.0 Pro for complex forensic analysis of ledger data, including historical context cross-referencing.
- **ID-3.3.2**: Live Audit sessions shall utilize `gemini-2.5-flash-native-audio` for sub-500ms latency voice interaction.
- **ID-3.3.3**: Visual Intelligence shall stream 1fps JPEG frames during live sessions for real-time document verification.

#### 3.4 Forensic Timeline & Logging
- **ID-3.4.1**: Every state-changing action (Create, Update, Tagging, Seal Generation) shall be recorded in `activity_logs`.
- **ID-3.4.2**: The Transaction Detail page shall display a chronological "Neural Activity Stream" filtered by entity ID.

### 4. Data Requirements
#### 4.1 Schema Definition
- **Transactions Table**: Columns for `amount`, `payment_mode`, `source`, `reference_id`, `audit_tag`, `tags` (JSONB array), `secure_id`, and `signature`.
- **Activity Logs Table**: Tracks `entity_type`, `entity_id`, `action`, `performed_by`, and `details` (JSONB).
- **Users Table**: Direct mapping to Supabase Auth UUIDs with a mandatory `role` field.

### 5. Non-Functional Requirements
#### 5.1 Security
- **Data-at-Rest**: Encrypted via AES-256.
- **Data-in-Transit**: TLS 1.3 mandated for all API communications.
- **Integrity**: HMACS generated using client-side private keys to detect ledger tampering.
- **Auditability**: 100% trace coverage for all user actions.

#### 5.2 Performance
- **Neural Response**: Dashboard briefing and forensic insight generation < 3s.
- **Live Sync**: < 200ms audio jitter for the Live Vision Bridge.
- **Scalability**: Capable of handling 10k+ transactions per branch node.

#### 5.3 UX/UI Standards
- **Typography**: Inter (UI), JetBrains Mono (Data/Financials).
- **Transitions**: Framer Motion physics-based animations (stiffness: 400, damping: 30).
- **Tactility**: Haptic-like visual feedback on all transaction authorizations.
- **Accessibility**: ARIA-compliant terminal nodes and high-contrast diagnostic modes.

### 6. System Constraints
- **Hardware**: Requires camera and microphone access for the Vision/Live modules.
- **Connectivity**: Real-time functionality is dependent on WebSocket stability (Supabase Realtime).
- **Browser Compatibility**: Limited to modern evergreen browsers (Chrome, Edge, Safari) supporting Web Crypto and MediaStreams.
