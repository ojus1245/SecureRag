require('dotenv').config();
const mongoose = require('mongoose');
const Document = require('./src/models/Document');
const User = require('./src/models/User');
const documentService = require('./src/services/document.service');
const ragService = require('./src/services/rag.service');
const logger = require('./src/utils/logger');

const POLICY_CONTENT = `
================================================================================
VERTEXGLOBAL ENTERPRISE INFORMATION SECURITY, ACCEPTABLE USE & AI GOVERNANCE POLICY
Document Reference: POL-SEC-2026-V4
Effective Date: January 1, 2026 | Last Revision: October 2026
Classification Level: INTERNAL | Department: Security & Compliance
================================================================================

1. EXECUTIVE SUMMARY & POLICY OBJECTIVES
VertexGlobal Corporation is committed to safeguarding intellectual property, customer personally identifiable information (PII), and mission-critical enterprise systems. This policy establishes the mandatory technical, procedural, and governance standards across all corporate divisions, remote personnel, cloud services, and autonomous AI integrations. Compliance with this policy is mandatory for all full-time employees, contractors, third-party vendors, and temporary personnel.

2. IDENTITY & ACCESS MANAGEMENT (IAM) STANDARDS
2.1 Password Requirements
- Minimum Length: All user and service account passwords must be at least 16 characters in length.
- Complexity: Passwords must contain at least one uppercase letter (A-Z), one lowercase letter (a-z), one numeric digit (0-9), and one special symbol (!@#$%^&*()-_+=).
- Password Expiration: Passwords expire every 90 calendar days. Passwords may not be reused for 10 previous cycles.
- Account Lockout Threshold: Accounts are automatically locked after 5 consecutive failed authentication attempts. Account lockout duration is 30 minutes, or until verified by the IT Security Helpdesk.

2.2 Multi-Factor Authentication (MFA)
- Mandatory MFA is enforced for 100% of internal and external portal access.
- Approved MFA Factors: FIDO2 / WebAuthn hardware security keys (e.g., YubiKey) and RFC 6238 Time-based One-Time Passwords (TOTP) generated via approved authenticator apps.
- Prohibited Factors: SMS-based MFA and unencrypted voice-call verification are strictly prohibited due to SIM-swapping vulnerabilities.

2.3 Privileged Access Management (PAM)
- Administrative privileges (Root, Domain Admin, Global Admin) are never granted on a permanent basis.
- Just-in-Time (JIT) access must be requested via the PAM portal with dual-custody managerial approval.
- Maximum privileged session duration is 4 hours, after which sessions are automatically terminated and credentials rotated.

3. DATA CLASSIFICATION MATRIX & DATA HANDLING
Enterprise information is categorized into four distinct classification levels:

3.1 PUBLIC (Tier 1)
- Definition: Information authorized for unrestricted public distribution.
- Examples: Press releases, published annual reports, marketing collateral, public API schemas.
- Controls: No encryption required in storage, integrity checks required.

3.2 INTERNAL (Tier 2)
- Definition: Standard business information intended strictly for internal corporate operations.
- Examples: Internal employee handbooks, departmental memos, organization charts, team project trackers.
- Controls: Access restricted to authenticated personnel. AES-256-GCM encryption at rest, TLS 1.3 in transit.

3.3 CONFIDENTIAL (Tier 3)
- Definition: Proprietary business data whose unauthorized disclosure would cause commercial harm.
- Examples: Source code repositories, unreleased financial reports, customer PII, commercial contract drafts.
- Controls: Departmental access control lists (ACLs) enforced. Field-level data masking. Role-based access validation.

3.4 RESTRICTED (Tier 4)
- Definition: Highly sensitive assets where disclosure causes severe legal, regulatory, or existential harm.
- Examples: Cryptographic private keys, database root master credentials, M&A negotiation transcripts, executive board minutes.
- Controls: Zero-trust network isolation, hardware security module (HSM) key storage, mandatory multi-person approval, and continuous session recording.

4. CRYPTOGRAPHIC CONTROLS & ENCRYPTION STANDARDS
4.1 Data at Rest
- All databases, object storage buckets, and server volumes must employ AES-256-GCM (Galois/Counter Mode) authenticated encryption.
- Master encryption keys must be managed in a FIPS 140-3 Level 3 certified Key Management Service (KMS).
- Automated key rotation is executed every 365 calendar days.

4.2 Data in Transit
- Transport Layer Security (TLS) version 1.3 is mandatory across all internal and public endpoints.
- Perfect Forward Secrecy (PFS) cipher suites (e.g., TLS_AES_256_GCM_SHA384 and TLS_CHACHA20_POLY1305_SHA256) are required.
- Legacy protocols including SSLv2, SSLv3, TLS 1.0, and TLS 1.1 are permanently decommissioned and blocked at perimeter firewalls.

5. GENERATIVE AI & RETRIEVAL-AUGMENTED GENERATION (RAG) GOVERNANCE
5.1 Approved AI Architectures
- Enterprise AI systems utilize Google Gemini 3.5 Flash Lite through enterprise-grade zero-retention API endpoints.
- Models may only process organizational data through privacy-aware RAG pipelines that enforce role-based document access controls before semantic chunk retrieval.

5.2 Prompt & Input Privacy Controls
- Employees are strictly prohibited from pasting customer PII, unreleased source code, or proprietary financials into unauthorized third-party consumer AI tools.
- Corporate RAG pipelines must execute real-time content safety filtering and regex-based credential masking before forwarding context to external LLM endpoints.
- Vector embeddings must be encrypted at rest using isolated vector encryption keys to prevent inversion attacks.

5.3 Human-in-the-Loop Verification
- Automated code generation, system configuration scripts, and policy revisions produced by AI must undergo mandatory peer review by a certified senior engineer before merging to production.

6. REMOTE WORK, BYOD & ENDPOINT SECURITY
6.1 Mobile Device Management (MDM)
- All laptops, smartphones, and tablets accessing corporate networks must be enrolled in corporate MDM with remote wipe enabled.
- Screen Lock Timeout: Inactivity screen lockout must be configured for a maximum of 3 minutes with biometric or PIN unlocking required.
- Full-disk encryption (BitLocker with XTS-AES 256 or macOS FileVault) is mandatory on all client hardware.

6.2 Network Access & VPN
- Personnel working on public Wi-Fi networks (hotels, airports, cafes) must establish an always-on corporate WireGuard/IPsec VPN tunnel before accessing corporate services. Direct split-tunneling is disallowed.

7. INCIDENT RESPONSE, SLAS & BREACH NOTIFICATION
7.1 Incident Severity Levels & Response Times
- Severity 1 (Critical): Active ransomware infection, unauthorized root access, or confirmed exposure of Restricted (Tier 4) customer data.
  * Response SLA: Incident Response Team mobilization within 15 minutes.
  * Regulatory Notification: Mandatory notification to data protection regulators (GDPR / CCPA) within 72 hours of confirmation.
- Severity 2 (Major): Denial-of-service affecting production services, compromise of single host without privilege escalation.
  * Response SLA: 60 minutes.
- Severity 3 (Minor): Phishing email reports, policy non-compliance, localized malware isolated by endpoint detection.
  * Response SLA: 24 business hours.

7.2 Incident Reporting Hotline
- Security incidents must be reported immediately to security-ops@vertexglobal.internal or telephone hotline ext 4911.

8. AUDIT LOGGING & COMPLIANCE VERIFICATION
8.1 Log Retention
- Security audit logs, user authentication events, document access timestamps, and RAG query traces must be archived in immutable (WORM) storage for a minimum of 365 calendar days.
- Logs must capture: Timestamp (UTC), User ID, Source IP Address, Action/Verb, Target Resource, and Security Clearance Level.

8.2 Security Assessments & Testing
- Automated vulnerability scanning is executed weekly across all public IP ranges and cloud assets.
- Independent third-party penetration testing is conducted semi-annually (every 6 months).

================================================================================
END OF POLICY DOCUMENT | VERTEXGLOBAL SECURITY & COMPLIANCE DIVISION
================================================================================
`.trim();

async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_rag';
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    // Find admin user
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.error('Admin user not found! Please ensure default admin exists.');
      process.exit(1);
    }
    console.log(`Found admin user: ${adminUser.username} (${adminUser._id})`);

    // Check if document already exists
    const title = 'VertexGlobal Enterprise Information Security, Acceptable Use & AI Governance Policy';
    let doc = await Document.findOne({ title });

    if (doc) {
      console.log(`Existing policy document found (${doc._id}). Updating content and re-indexing...`);
      // Update content
      doc.content = POLICY_CONTENT;
      doc.department = 'Security & Compliance';
      doc.classification = 'internal';
      doc.tags = ['policy', 'security', 'compliance', 'iam', 'encryption', 'generative-ai', 'incident-response'];
      doc.status = 'published';
      await doc.save();
    } else {
      console.log('Processing new policy document...');
      const processed = await documentService.processDocument({
        title,
        content: POLICY_CONTENT,
        department: 'Security & Compliance',
        classification: 'internal',
        tags: ['policy', 'security', 'compliance', 'iam', 'encryption', 'generative-ai', 'incident-response'],
        fileType: 'txt',
        metadata: {
          reference: 'POL-SEC-2026-V4',
          author: 'VertexGlobal CISO Office',
          version: '4.0'
        }
      });

      doc = new Document({
        ...processed,
        owner: adminUser._id,
        status: 'published',
        metadata: {
          ...processed.metadata,
          uploadedBy: adminUser._id,
          uploadedAt: new Date().toISOString()
        }
      });

      await doc.save();
      console.log(`Created new Document in MongoDB: ${doc._id}`);
    }

    // Index into RAG / AI Service
    console.log('Indexing policy document into AI Service (RAG)...');
    try {
      const ragResult = await ragService.addDocument(doc);
      console.log('RAG indexing result:', ragResult);
    } catch (e) {
      console.error('RAG indexing error:', e.message);
    }

    // Now re-sync all other MongoDB published documents into RAG
    const allDocs = await Document.find({ status: 'published' });
    console.log(`\nRe-syncing all ${allDocs.length} published documents to RAG vector store...`);
    for (const d of allDocs) {
      try {
        await ragService.addDocument(d);
        console.log(` - Synced "${d.title}" (${d._id})`);
      } catch (err) {
        console.warn(` - Sync failed for "${d.title}":`, err.message);
      }
    }

    console.log('\nAll done successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Script failed:', err);
    process.exit(1);
  }
}

main();

