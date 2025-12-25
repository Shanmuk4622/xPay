# FinTrack Pro | Secure Financial Ledger

FinTrack Pro is a high-fidelity, high-security financial settlement and audit application designed for modern organizational branches. It provides a centralized command center for monitoring transaction telemetry, recording settlements, and maintaining an immutable audit trail.

## 🚀 Core Technologies

- **Frontend:** React 19 with TypeScript
- **Styling:** Tailwind CSS (Modern Utility-First UI)
- **Animations:** Framer Motion (High-performance tactile transitions)
- **Backend-as-a-Service:** Supabase (PostgreSQL, Auth, and Real-time)
- **Icons:** Lucide React
- **Typography:** Inter (Sans) & JetBrains Mono (Tabular/Financial data)

## 🏗️ Application Architecture

The app follows a standard Single Page Application (SPA) architecture with strict **Role-Based Access Control (RBAC)**:

1.  **Context-Driven Auth:** A robust `AuthContext` manages sessions and fetches persistent user roles (`super_admin`, `admin`, `user`) from the `users` table.
2.  **Protected Routing:** Specialized route wrappers intercept unauthorized access attempt based on role hierarchies.
3.  **Real-time Ledger:** Utilizes Supabase's high-speed querying for live activity streams and historical vault searches.
4.  **Tactile UI:** Every interaction is enhanced with Framer Motion to provide the "professional equipment" feel required for financial terminals.

## 🛠️ Functional Workflow

### 1. Authorization & Onboarding
- **Secure Entry:** Users authenticate via email/password.
- **Identity Sync:** Upon login, the system verifies the user's UUID against the internal security node to determine their operational permissions.
- **Recovery:** Full support for password resets via automated email dispatch.

### 2. The Command Dashboard (Pulse)
- **Telemetry Cards:** High-level overview of daily volume, node health, and branch identity.
- **Live Stream:** Displays the most recent signals (transactions) recorded across the unit.
- **Visual Performance:** Simple trend charts indicate transaction momentum.

### 3. Settlement Recording (The Entry Workflow)
- **Initialization:** Admins trigger the "Record Log" terminal.
- **Input Sanitization:** Precise numeric entry with currency formatting.
- **Multi-Channel Support:** Choose between **Cash**, **Bank**, or **UPI/Network**.
- **Ref ID Enforcement:** Non-cash transactions require a UTR (Unique Transaction Reference) to ensure auditability.
- **Authorization Modal:** A final confirmation step to prevent accidental ledger entries.

### 4. Ledger Explorer (Audit Vault)
- **Advanced Filtering:** Query the archive by value range, payment channel, or specific dates.
- **Deep Search:** Search entities, branch tags, or reference IDs using debounced server-side querying.
- **Immutable History:** A read-only view of the entire consolidated archive.

### 5. Detailed Audit (Settlement Node)
- **Integrity Seal:** Every transaction is rendered as a professional "Record Log" with a unique cryptographic hash reference.
- **Print Optimization:** Native support for thermal printers or PDF exports (hides UI chrome automatically).
- **Network Metadata:** Tracks the operator ID and branch timestamp for accountability.

## 🔒 Security Measures

- **RBAC (Role-Based Access Control):** Users can only see telemetry; Admins can record entries; Super Admins manage the vault.
- **Data Integrity:** Strict PostgreSQL schema constraints prevent corrupted financial records.
- **Visual Privacy:** Subtle "glassmorphism" and sensitive data masking during transitions.
- **Encrypted Transmission:** All telemetry is delivered via TLS 1.3 secured channels.

---

*FinTrack Pro is an operational command tool developed for high-frequency financial environments.*