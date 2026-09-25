# 🔒 Secure Enterprise RAG Knowledge Base

A privacy-aware Retrieval-Augmented Generation (RAG) system designed for enterprise environments. Features end-to-end encryption, role-based access control, content safety classification, and comprehensive audit logging.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│                   React + Nginx (Port 3000)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────────┐
│                     Backend API                             │
│               Node.js + Express (Port 5000)                 │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐    │
│  │  Auth   │ │Documents │ │   Chat   │ │    Audit     │    │
│  │ Service │ │ Service  │ │ Service  │ │   Service    │    │
│  └─────────┘ └──────────┘ └──────────┘ └──────────────┘    │
└────┬──────────────┬──────────────┬──────────────────────────┘
     │              │              │
┌────▼──────────────▼──────────────▼──────────────────────────┐
│                     AI Service                              │
│               Python + FastAPI (Port 8000)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │Embeddings│ │Encryption│ │  Safety  │ │     RAG      │   │
│  │ Engine   │ │  Layer   │ │Classifier│ │ Orchestrator │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
└────┬──────────────┬──────────────┬──────────────────────────┘
     │              │              │
┌────▼────┐  ┌──────▼────┐  ┌─────▼─────┐  ┌────────────────┐
│ MongoDB │  │PostgreSQL │  │   Redis   │  │    Ollama      │
│  :27017 │  │   :5432   │  │   :6379   │  │    :11434      │
└─────────┘  └───────────┘  └───────────┘  └────────────────┘
```

## ✨ Key Features

### 🔐 Security & Privacy
- **AES-256-GCM encryption** for documents and embeddings at rest
- **JWT authentication** with refresh tokens and optional MFA
- **Role-based access control** (RBAC) with document-level ACLs
- **Data sanitization** against XSS, NoSQL injection, and HPP attacks
- **Content safety classification** with ML + rule-based hybrid approach

### 🧠 AI & RAG
- **Local LLM** support via Ollama (Llama 2, Mistral, etc.)
- **External LLM** support (OpenAI, Anthropic) with automatic routing
- **Sentence-transformer embeddings** (all-MiniLM-L6-v2, 384 dimensions)
- **Encrypted vector storage** with FAISS/ChromaDB
- **Citation generation** linking responses back to source documents
- **Safety-first approach** — all queries pass through content moderation

### 📊 Enterprise Features
- **Comprehensive audit logging** with configurable retention
- **Rate limiting** and request throttling
- **Redis caching** for performance optimization
- **Health check endpoints** for monitoring
- **Graceful shutdown** handling across all services

---

## 📁 Project Structure

```
privacy-aware-rag/
│
├── frontend/                    # React frontend application
│   ├── package.json
│   └── src/
│
├── backend/                     # Node.js Express API
│   ├── package.json
│   └── src/
│       ├── app.js               # Express app setup & middleware
│       ├── server.js            # Server startup & connection
│       ├── config/
│       │   ├── config.js        # Centralized configuration
│       │   ├── database.js      # MongoDB connection manager
│       │   └── redis.js         # Redis client manager
│       ├── controllers/         # Request handlers
│       │   ├── auth.controller.js
│       │   ├── document.controller.js
│       │   ├── chat.controller.js
│       │   ├── user.controller.js
│       │   └── audit.controller.js
│       ├── middleware/           # Express middleware
│       │   ├── authenticate.js  # JWT auth middleware
│       │   ├── authorize.js     # RBAC authorization
│       │   ├── documentACL.js   # Document-level access control
│       │   ├── auditLogger.js   # Audit event logging
│       │   └── validate.js      # Input validation
│       ├── models/              # Mongoose data models
│       │   ├── User.js
│       │   ├── Document.js
│       │   ├── DocumentACL.js
│       │   ├── Role.js
│       │   └── AuditLog.js
│       ├── routes/              # API route definitions
│       │   ├── auth.routes.js
│       │   ├── document.routes.js
│       │   ├── chat.routes.js
│       │   ├── user.routes.js
│       │   └── audit.routes.js
│       ├── services/            # Business logic layer
│       │   ├── ai.service.js    # AI service client
│       │   ├── auth.service.js
│       │   ├── document.service.js
│       │   ├── rag.service.js
│       │   └── audit.service.js
│       └── utils/               # Utilities
│           ├── logger.js
│           ├── errorHandler.js
│           ├── encryption.js
│           ├── helpers.js
│           └── validators.js
│
├── ai-service/                  # Python FastAPI AI service
│   ├── requirement.txt
│   └── app/
│       ├── main.py              # FastAPI application entry
│       ├── embedder/            # Text embedding generation
│       │   ├── embedder.py
│       │   └── model.py
│       ├── encryption/          # AES-GCM encryption layer
│       │   ├── aes_gcm.py
│       │   ├── key_manager.py
│       │   └── vector_encryption.py
│       ├── safety/              # Content safety classification
│       │   ├── classifier.py
│       │   ├── predictor.py
│       │   └── rules.py
│       ├── retrieval/           # Document retrieval & ranking
│       │   ├── retriever.py
│       │   ├── reranker.py
│       │   └── scorer.py
│       ├── rag/                 # RAG orchestration
│       │   ├── orchestrator.py
│       │   ├── prompt_builder.py
│       │   ├── context_builder.py
│       │   └── Citation_generator.py
│       ├── llm/                 # LLM client abstraction
│       │   ├── ollama_client.py
│       │   ├── external_client.py
│       │   └── router.py
│       └── schemas/             # Pydantic request/response models
│           ├── chat.py
│           ├── document.py
│           └── retrieval.py
│
├── database/                    # Database schemas & migrations
│   ├── schema.sql               # Master schema loader
│   ├── seed.sql                 # Seed data
│   └── migrations/              # Ordered SQL migrations
│       ├── 001_create_extensions.sql
│       ├── 002_create_schemas.sql
│       ├── 003_create_auth_tables.sql
│       ├── 004_create_document_tables.sql
│       ├── 005_create_chat_tables.sql
│       ├── 006_create_audit_tables.sql
│       ├── 007_create_system_tables.sql
│       ├── 008_create_triggers.sql
│       ├── 009_create_views.sql
│       └── 010_create_functions.sql
│
├── models/                      # ML models & evaluation
│   ├── safety-classifier/
│   │   ├── config.json          # Model configuration
│   │   └── README.md            # Classifier documentation
│   └── evaluation/
│       ├── evaluate.py          # Evaluation runner
│       ├── metrics.py           # Metrics computation
│       ├── test_data.json       # Labeled test dataset
│       └── README.md            # Evaluation documentation
│
├── docker/                      # Dockerfiles
│   ├── backend.Dockerfile       # Node.js backend
│   ├── ai.Dockerfile            # Python AI service
│   └── frontend.Dockerfile      # React + Nginx
│
├── docker-compose.yml           # Full-stack orchestration
├── .env                         # Environment variables
└── README.md                    # This file
```

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) v20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) v2.0+
- 8 GB+ RAM (16 GB recommended for running LLMs locally)

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/privacy-aware-rag.git
cd privacy-aware-rag

# Review and update environment variables
# ⚠ Change all secrets marked with "change-this" before production use
nano .env
```

### 2. Start All Services

```bash
# Build and start everything
docker-compose up -d --build

# Check service health
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Pull an LLM Model

```bash
# Pull Llama 2 into Ollama
docker exec -it rag-ollama ollama pull llama2

# Or use a smaller model for testing
docker exec -it rag-ollama ollama pull tinyllama
```

### 4. Verify

| Service    | URL                          | Health Check                       |
|------------|------------------------------|------------------------------------|
| Frontend   | http://localhost:3000         | —                                  |
| Backend    | http://localhost:5000/health  | `GET /health`                      |
| AI Service | http://localhost:8000/health  | `GET /health`                      |
| API Docs   | http://localhost:5000/api/docs| `GET /api/docs`                    |

---

## 🔌 API Reference

### Authentication

```bash
# Register
POST /api/auth/register
Content-Type: application/json
{
  "username": "john",
  "email": "john@company.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "department": "Engineering"
}

# Login
POST /api/auth/login
Content-Type: application/json
{
  "email": "john@company.com",
  "password": "SecurePass123!"
}
# Returns: { token, refreshToken, user }
```

### Documents

```bash
# Upload document
POST /api/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data
  file: <document>
  title: "Security Policy"
  classification: "confidential"
  tags: ["security", "policy"]

# Search documents
GET /api/documents?search=security&classification=confidential
Authorization: Bearer <token>
```

### Chat (RAG)

```bash
# Ask a question
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json
{
  "query": "What is our password rotation policy?",
  "options": {
    "maxTokens": 500,
    "includeCitations": true
  }
}
```

### Audit

```bash
# Get audit logs
GET /api/audit?action=DOCUMENT_ACCESS&startDate=2024-01-01
Authorization: Bearer <token>
```

---

## 🛡 Security Features

### Encryption Flow

```
Document Upload
    │
    ├──► Content encrypted (AES-256-GCM)
    │       └── Unique key per document
    │
    ├──► Embedding generated (all-MiniLM-L6-v2)
    │       └── Vector encrypted before storage
    │
    └──► Metadata indexed in MongoDB
            └── ACL created for owner
```

### Safety Classification Pipeline

All user queries pass through a two-stage safety classifier before reaching the LLM:

1. **Rule Engine** (60% weight): PII detection, keyword matching, prompt injection detection
2. **ML Classifier** (40% weight): DistilBERT-based 6-class text classifier
3. **Fail-Closed**: If classification errors, the query is blocked

Categories: `safe` | `sensitive` | `confidential` | `harmful` | `inappropriate` | `malicious`

### Access Control

| Role       | Documents          | Users      | Audit     | System     |
|-----------|--------------------|-----------  |-----------|------------|
| Admin      | Full access        | Manage all | Full view | Full config|
| Manager    | Department docs    | View team  | Dept view | Limited    |
| Analyst    | Assigned + public  | Self only  | Own logs  | None       |
| Viewer     | Shared read-only   | Self only  | None      | None       |

---

## 🛠 Development

### Local Development (without Docker)

#### Backend

```bash
cd backend
npm install
npm run dev      # Uses nodemon for auto-reload
```

#### AI Service

```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirement.txt
uvicorn app.main:app --reload --port 8000
```

#### Prerequisites for Local Dev

- Node.js 20+
- Python 3.11+
- MongoDB 7.0+ running locally
- Redis 7+ running locally
- Ollama installed and running

### Running Tests

```bash
# Backend tests
cd backend && npm test

# AI service tests
cd ai-service && pytest

# Safety classifier evaluation
python models/evaluation/evaluate.py --rule-only
```

### Code Quality

```bash
# Backend
cd backend
npx eslint src/
npx prettier --check src/

# AI service
cd ai-service
black app/
flake8 app/
mypy app/
```

---

## 📦 Deployment

### Production Checklist

- [ ] Change all secrets in `.env` (JWT_SECRET, ENCRYPTION_KEY, passwords)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (TLS termination at reverse proxy)
- [ ] Configure CORS_ORIGIN to your actual domain
- [ ] Enable rate limiting (`ENABLE_RATE_LIMITING=true`)
- [ ] Enable audit logging (`ENABLE_AUDIT_LOGGING=true`)
- [ ] Set up log rotation and monitoring
- [ ] Configure database backups
- [ ] Review and tighten CSP headers
- [ ] Run security scan (`npm audit`, `pip audit`)

### Scaling

```bash
# Scale AI service workers
AI_WORKERS=4 docker-compose up -d ai-service

# Scale backend behind a load balancer
docker-compose up -d --scale backend=3
```

### GPU Support (NVIDIA)

Uncomment the GPU section in `docker-compose.yml` under the `ollama` service, then:

```bash
# Install NVIDIA Container Toolkit
# https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html

docker-compose up -d ollama
docker exec -it rag-ollama ollama pull llama2
```

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🤝 Contributing

1. Create a feature branch from `main`
2. Write tests for new functionality
3. Ensure all tests pass and linting is clean
4. Submit a pull request with a clear description

---

## 📞 Support

For issues and feature requests, open a GitHub issue or contact the engineering team.
