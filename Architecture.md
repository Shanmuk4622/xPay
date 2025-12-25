# Technical Architecture Document (TAD)
## FinTrack Pro | Neural Ledger Infrastructure

### 1. Architectural Overview
FinTrack Pro is built on a **Serverless Hybrid Architecture**. It leverages cloud-native data services combined with client-side edge intelligence (GenAI SDK) to provide a high-security financial environment.

### 2. High-Level Component Stack
- **Frontend Core**: React 19 (Strict Mode) using a Functional Component paradigm with custom hooks for state isolation.
- **State Orchestration**: React Context API for global session management; localized state (useState/useReducer) for terminal operations.
- **Data Persistence**: Supabase (PostgreSQL) with Row Level Security (RLS) policies defining the security boundary.
- **Neural Engine**: Google Gemini API (@google/genai) integration using a direct SDK implementation for multimodal grounding and thinking-enabled reasoning.
- **Real-time Layer**: Supabase Realtime (Postgres Changes) for live dashboard telemetry sync.

### 3. AI Integration Strategy
The application utilizes a **Multimodal Intelligence Layer** divided into three distinct operational modes:
1.  **Stateless Insights**: Used in the Dashboard for rapid summarization of ledger trends.
2.  **Multimodal Vision Pipeline**: Utilized in `ScanReceipt.tsx` for OCR and structured JSON extraction from physical artifacts.
3.  **Live Forensic Bridge**: A WebSocket-based bi-directional stream for synchronized audio/video auditing, using the `gemini-2.5-flash-native-audio` model for sub-second latency.

### 4. Security & Data Integrity
To ensure ledger immutability and data veracity:
- **CSPRNG Sealing**: Transactions are sealed using `crypto.getRandomValues()` during the authorization phase.
- **Signature Verification**: A client-side HMAC signature is generated using a local private key stored in the browser's secure context, allowing Super Admins to verify that transaction data hasn't been modified in transit or at the database level.
- **Forensic Activity Logging**: A dedicated `activity_logs` table acts as a shadow ledger, recording the "Before" and "After" states of every transaction edit.

### 5. Data Flow Diagram (Conceptual)
1.  **Transaction Entry**: User Input -> Zod Validation -> CSPRNG Seal Generation -> Supabase Insert -> Realtime Broadcast to Dashboard.
2.  **Forensic Audit**: Entity Context -> Gemini 3 Pro (Thinking Mode) -> Vector Risk Analysis -> UI Dashboard Visualization.
3.  **Activity Tracking**: Database Trigger/Manual Hook -> Activity Log Entry -> Real-time Chronological Stream Update.

### 6. Error Handling & Resilience
- **Exponential Backoff**: Implemented for AI API calls to handle rate-limiting.
- **Optimistic UI**: Dashboards reflect changes immediately while awaiting persistence confirmation.
- **Circuit Breaking**: The Live Vision bridge automatically severs and cleans up hardware resources on signal drift or session termination.
