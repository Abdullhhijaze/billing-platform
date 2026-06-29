const mongoose = require('mongoose');

// Customers — TMF632
const CustomerSchema = new mongoose.Schema({
  customerId:       { type: String, required: true, unique: true },
  firstName:        String,
  lastName:         String,
  phoneNumber:      { type: String, index: true },
  email:            String,
  accountType:      { type: String, enum: ['Prepaid','Postpaid'], default: 'Postpaid' },
  planName:         String,
  registrationDate: { type: Date, default: Date.now },
}, { timestamps: true });

// Products — TMF620
const ProductSchema = new mongoose.Schema({
  productId:    { type: String, required: true, unique: true },
  packageName:  { type: String, required: true },
  productType:  String,
  basePrice:    Number,
  currency:     { type: String, default: 'USD' },
  billingCycle: { type: String, default: 'monthly' },
  status:       { type: String, default: 'Active' },
  features:     [String],
}, { timestamps: true });

// Customer Products — subscriptions
const CustomerProductSchema = new mongoose.Schema({
  customerId:  { type: String, required: true, index: true },
  productId:   { type: String, required: true },
  packageName: String,
  startDate:   { type: Date, default: Date.now },
  endDate:     Date,
  agreedPrice: Number,
  status:      { type: String, default: 'Active' },
}, { timestamps: true });

// Billing Invoices — TMF666
const BillingInvoiceSchema = new mongoose.Schema({
  invoiceId:     { type: String, required: true, unique: true },
  customerId:    { type: String, required: true, index: true },
  billingMonth:  String,
  totalAmount:   Number,
  taxAmount:     Number,
  discountAmount:{ type: Number, default: 0 },
  netPayable:    Number,
  dueDate:       Date,
  paymentStatus: { type: String, enum: ['Paid','Pending','Overdue'], default: 'Pending' },
  currency:      { type: String, default: 'USD' },
  invoiceType:   { type: String, default: 'Regular' },
}, { timestamps: true });

// Charges — all line items
const ChargeSchema = new mongoose.Schema({
  chargeId:    { type: String, required: true, unique: true },
  invoiceId:   { type: String, required: true, index: true },
  customerId:  { type: String, required: true, index: true },
  chargeType:  String,
  description: String,
  amount:      Number,
  taxRate:     { type: Number, default: 0.15 },
  chargeDate:  Date,
  status:      { type: String, default: 'Applied' },
  productId:   String,
}, { timestamps: true });

// Usage Records — TMF635
const UsageRecordSchema = new mongoose.Schema({
  usageId:     { type: String, required: true, unique: true },
  customerId:  { type: String, required: true, index: true },
  usageType:   { type: String, enum: ['Voice','Data','SMS'] },
  usageAmount: Number,
  unit:        String,
  roamingFlag: { type: Boolean, default: false },
  usageDate:   Date,
  chargeId:    String,
}, { timestamps: true });

// Complaints — TMF632 Trouble Ticket
const ComplaintSchema = new mongoose.Schema({
  complaintId:  { type: String, required: true, unique: true },
  customerId:   { type: String, required: true, index: true },
  complaintType: String,
  description:  String,
  complaintDate:{ type: Date, default: Date.now },
  status:       { type: String, default: 'Open' },
  channel:      { type: String, default: 'Selfcare' },
}, { timestamps: true });

// AI Investigations
const AIInvestigationSchema = new mongoose.Schema({
  investigationId: { type: String, required: true, unique: true },
  complaintId:     { type: String, required: true, index: true },
  customerId:      String,
  aiSummary:       String,
  rootCause:       String,
  recommendation:  String,
  nextAction:      String,
  confidenceScore: Number,
  investigatedBy:  { type: String, default: 'claude-sonnet-4-6' },
}, { timestamps: true });

module.exports = {
  Customer:        mongoose.model('Customer',        CustomerSchema),
  Product:         mongoose.model('Product',         ProductSchema),
  CustomerProduct: mongoose.model('CustomerProduct', CustomerProductSchema),
  BillingInvoice:  mongoose.model('BillingInvoice',  BillingInvoiceSchema),
  Charge:          mongoose.model('Charge',          ChargeSchema),
  UsageRecord:     mongoose.model('UsageRecord',     UsageRecordSchema),
  Complaint:       mongoose.model('Complaint',       ComplaintSchema),
  AIInvestigation: mongoose.model('AIInvestigation', AIInvestigationSchema),
};
