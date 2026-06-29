# AI Billing Investigation Platform

## Two sites, one server

| URL | Site |
|-----|------|
| `http://localhost:3001/` or `/care` | **Care Portal** — view all DB tables |
| `http://localhost:3001/selfcare` | **Selfcare Agent** — customer chat + AI investigation |

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/billing_db
ANTHROPIC_API_KEY=sk-ant-xxxxxx
PORT=3001
```

### 3. Start the server
```bash
node server.js
```

### 4. Seed test data
Go to Care Portal → click **🌱 Seed Test Data** button
OR call: `POST http://localhost:3001/api/seed`

---

## How it works

### Care Portal (`/care`)
- Sidebar navigation to all 8 MongoDB collections
- Live data from real MongoDB — refreshes every 30s
- Stats dashboard at the top
- Seed button to populate test data

### Selfcare Agent (`/selfcare`)
- Customer enters their Account ID
- Types billing complaint in free text
- Server calls Claude API with full billing context from MongoDB
- Claude analyses invoices, charges, usage records dynamically
- Results (complaint + investigation) saved to MongoDB in real time
- You can see the new records appear in the Care Portal immediately

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | All customers |
| GET | `/api/invoices` | All invoices |
| GET | `/api/charges` | All charges |
| GET | `/api/products` | All products |
| GET | `/api/customer-products` | All subscriptions |
| GET | `/api/usage` | All usage records |
| GET | `/api/complaints` | All complaints |
| GET | `/api/investigations` | All AI investigations |
| GET | `/api/stats` | Dashboard counts |
| POST | `/api/seed` | Seed test data |
| POST | `/api/complaint` | Submit complaint + trigger AI investigation |
| POST | `/api/chat` | Ongoing chat with billing context |

---

## MongoDB Collections (TMF-aligned)

- `customers` — TMF632 Party Management
- `billing_invoices` — TMF666 Account Management
- `charges` — All invoice line items
- `products` — TMF620 Product Catalog
- `customer_products` — Subscriptions
- `usage_records` — TMF635 Usage Management
- `complaints` — TMF632 Trouble Ticket
- `ai_investigations` — AI root cause results
