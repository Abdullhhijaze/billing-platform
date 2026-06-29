require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const path       = require('path');
const Anthropic  = require('@anthropic-ai/sdk');
const seed       = require('./seed');
const {
  Customer, Product, CustomerProduct,
  BillingInvoice, Charge, UsageRecord,
  Complaint, AIInvestigation
} = require('./models');

const app    = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── DB connect ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(e => console.error('MongoDB error:', e));

// ── health check ─────────────────────────────────────────────
app.get('/api/ping', (_, res) => res.json({ ok: true, time: new Date() }));

// ─────────────────────────────────────────────────────────────
// CARE SITE API  — read all tables
// ─────────────────────────────────────────────────────────────
app.get('/api/customers',         async (_, res) => res.json(await Customer.find().sort({ createdAt: -1 })));
app.get('/api/products',          async (_, res) => res.json(await Product.find().sort({ createdAt: -1 })));
app.get('/api/customer-products', async (_, res) => res.json(await CustomerProduct.find().sort({ createdAt: -1 })));
app.get('/api/invoices',          async (_, res) => res.json(await BillingInvoice.find().sort({ billingMonth: -1 })));
app.get('/api/charges',           async (_, res) => res.json(await Charge.find().sort({ chargeDate: -1 })));
app.get('/api/usage',             async (_, res) => res.json(await UsageRecord.find().sort({ usageDate: -1 })));
app.get('/api/complaints',        async (_, res) => res.json(await Complaint.find().sort({ createdAt: -1 })));
app.get('/api/investigations',    async (_, res) => res.json(await AIInvestigation.find().sort({ createdAt: -1 })));

app.get('/api/stats', async (_, res) => {
  const [customers, complaints, invoices, investigations] = await Promise.all([
    Customer.countDocuments(),
    Complaint.countDocuments({ status: 'Open' }),
    BillingInvoice.countDocuments(),
    AIInvestigation.countDocuments(),
  ]);
  res.json({ customers, complaints, invoices, investigations });
});

// ── seed endpoint
app.post('/api/seed', async (_, res) => {
  try {
    await seed(process.env.MONGO_URI);
    res.json({ ok: true, message: 'Database seeded successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// SELFCARE SITE API  — complaint + AI investigation
// ─────────────────────────────────────────────────────────────

// POST /api/complaint  — customer submits complaint, AI investigates
app.post('/api/complaint', async (req, res) => {
  const { customerId, description, channel = 'Selfcare' } = req.body;
  if (!customerId || !description)
    return res.status(400).json({ error: 'customerId and description required' });

  // 1. Find customer
  const customer = await Customer.findOne({ customerId });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  // 2. Load billing context
  const invoices = await BillingInvoice.find({ customerId }).sort({ billingMonth: -1 }).limit(3);
  const charges  = await Charge.find({ customerId }).sort({ chargeDate: -1 });
  const usage    = await UsageRecord.find({ customerId }).sort({ usageDate: -1 }).limit(20);
  const products = await CustomerProduct.find({ customerId, status: 'Active' });

  // 3. Save complaint to DB
  const complaintId = `CMP-${customerId}-${Date.now()}`;
  const complaint = await Complaint.create({
    complaintId, customerId,
    complaintType: detectType(description),
    description,
    complaintDate: new Date(),
    status: 'Open',
    channel,
  });

  // 4. Build context for Claude
  const prev = invoices[1];
  const curr = invoices[0];
  const diff = curr && prev ? (curr.netPayable - prev.netPayable).toFixed(2) : 'N/A';

  const billingContext = `
CUSTOMER: ${customer.firstName} ${customer.lastName} | ${customer.customerId} | ${customer.planName} | ${customer.accountType}

INVOICES (latest first):
${invoices.map(i => `  ${i.billingMonth}: total=$${i.totalAmount} tax=$${i.taxAmount} net=$${i.netPayable} [${i.paymentStatus}]`).join('\n')}
${curr && prev ? `  → Change from ${prev.billingMonth} to ${curr.billingMonth}: +$${diff}` : ''}

CURRENT CHARGES (${curr?.billingMonth || 'latest'}):
${charges.filter(c => c.invoiceId === curr?.invoiceId).map(c => `  [${c.chargeType}] ${c.description} — $${c.amount}`).join('\n') || '  None found'}

USAGE RECORDS (last 6):
${usage.slice(0,6).map(u => `  ${u.usageDate?.toISOString().split('T')[0]} | ${u.usageType} | ${u.usageAmount} ${u.unit} | Roaming: ${u.roamingFlag}`).join('\n')}

ACTIVE SUBSCRIPTIONS:
${products.map(p => `  ${p.packageName} — $${p.agreedPrice}/mo`).join('\n') || '  None'}
`.trim();

  // 5. Call Claude
  let aiResult;
  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 800,
      system: `You are an expert telecom billing investigation AI. Analyse the customer complaint and billing data.

Respond ONLY with valid JSON (no markdown):
{
  "aiSummary": "2-3 sentence summary of what you found by comparing the invoices and charges",
  "rootCause": "The specific root cause identified from the data",
  "recommendation": "Concrete action to resolve the issue",
  "nextAction": "Next step for the support agent or system",
  "confidenceScore": 0.0 to 1.0
}`,
      messages: [{
        role:    'user',
        content: `COMPLAINT: "${description}"\n\nBILLING DATA:\n${billingContext}`,
      }],
    });

    const raw = message.content.map(b => b.text || '').join('').trim();
    aiResult  = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    aiResult = {
      aiSummary:       'Unable to complete automated analysis. Manual review required.',
      rootCause:       'Analysis failed — please review billing data manually.',
      recommendation:  'Escalate to billing specialist.',
      nextAction:      'Open manual review ticket.',
      confidenceScore: 0,
    };
  }

  // 6. Save investigation to DB
  const investigationId = `INV-${complaintId}`;
  const investigation = await AIInvestigation.create({
    investigationId,
    complaintId,
    customerId,
    ...aiResult,
  });

  // 7. Update complaint status
  await Complaint.updateOne({ complaintId }, { status: 'Under Investigation' });

  res.json({ complaint, investigation });
});

// Chat endpoint — ongoing conversation
app.post('/api/chat', async (req, res) => {
  const { history, customerId } = req.body;
  if (!history?.length) return res.status(400).json({ error: 'history required' });

  let billingContext = '';
  if (customerId) {
    const customer = await Customer.findOne({ customerId });
    if (customer) {
      const invoices = await BillingInvoice.find({ customerId }).sort({ billingMonth: -1 }).limit(3);
      const charges  = await Charge.find({ customerId }).sort({ chargeDate: -1 });
      const curr     = invoices[0];
      const prev     = invoices[1];
      billingContext = `
Customer: ${customer.firstName} ${customer.lastName} | ${customer.planName}
Current invoice (${curr?.billingMonth}): $${curr?.netPayable}
Previous invoice (${prev?.billingMonth}): $${prev?.netPayable}
${curr && prev ? `Difference: +$${(curr.netPayable - prev.netPayable).toFixed(2)}` : ''}
Charges: ${charges.filter(c=>c.invoiceId===curr?.invoiceId).map(c=>`${c.description} $${c.amount}`).join(', ')}`;
    }
  }

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 500,
    system:     `You are a friendly telecom billing support agent. Answer the customer's billing questions naturally and helpfully.${billingContext ? `\n\nCustomer billing data:\n${billingContext}` : ''}`,
    messages:   history,
  });

  res.json({ reply: message.content.map(b => b.text || '').join('') });
});

function detectType(desc) {
  const t = desc.toLowerCase();
  if (t.includes('roam') || t.includes('travel') || t.includes('international')) return 'Roaming charge';
  if (t.includes('duplicate') || t.includes('twice') || t.includes('double'))    return 'Duplicate charge';
  if (t.includes('plan') || t.includes('upgrade') || t.includes('change'))       return 'Plan change fee';
  if (t.includes('data') || t.includes('overage'))                                return 'Data overage';
  if (t.includes('unknown') || t.includes('unauthorised'))                        return 'Unknown charge';
  return 'General billing';
}

// ─────────────────────────────────────────────────────────────
// Serve HTML pages
// ─────────────────────────────────────────────────────────────
app.get('/',         (_, res) => res.sendFile(path.join(__dirname, 'public', 'care.html')));
app.get('/care',     (_, res) => res.sendFile(path.join(__dirname, 'public', 'care.html')));
app.get('/selfcare', (_, res) => res.sendFile(path.join(__dirname, 'public', 'selfcare.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
