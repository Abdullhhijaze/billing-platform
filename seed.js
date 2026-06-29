const mongoose = require('mongoose');
const {
  Customer, Product, CustomerProduct,
  BillingInvoice, Charge, UsageRecord,
  Complaint, AIInvestigation
} = require('./models');

async function seed(MONGO_URI) {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI);
  }
  console.log('Seeding database...');

  await Customer.deleteMany({});
  await Product.deleteMany({});
  await CustomerProduct.deleteMany({});
  await BillingInvoice.deleteMany({});
  await Charge.deleteMany({});
  await UsageRecord.deleteMany({});
  await Complaint.deleteMany({});
  await AIInvestigation.deleteMany({});
  console.log('Cleared existing data');

  // ── Products ──────────────────────────────────────────────
  const products = await Product.insertMany([
    { productId:'PRD-4481920', packageName:'Basic 20GB',     productType:'mobile_data',   basePrice:49.99,  currency:'USD', billingCycle:'monthly', status:'Active', features:['20GB Data','Unlimited Calls','100 SMS'] },
    { productId:'PRD-4481921', packageName:'Unlimited Plus',  productType:'mobile_bundle', basePrice:89.99,  currency:'USD', billingCycle:'monthly', status:'Active', features:['Unlimited Data','Unlimited Calls','Unlimited SMS','Roaming 30 countries'] },
    { productId:'PRD-4481922', packageName:'Family Pack',     productType:'family_bundle', basePrice:149.99, currency:'USD', billingCycle:'monthly', status:'Active', features:['5 SIMs','100GB shared','Unlimited Calls'] },
    { productId:'PRD-4481923', packageName:'Business Pro',    productType:'business',      basePrice:199.99, currency:'USD', billingCycle:'monthly', status:'Active', features:['Unlimited everything','Priority network','Dedicated support'] },
    { productId:'PRD-4481924', packageName:'Roaming Add-on',  productType:'addon',         basePrice:19.99,  currency:'USD', billingCycle:'monthly', status:'Active', features:['International roaming','5GB roaming data','100 intl minutes'] },
    { productId:'PRD-4481925', packageName:'Student Deal',    productType:'mobile_data',   basePrice:29.99,  currency:'USD', billingCycle:'monthly', status:'Active', features:['10GB Data','Unlimited SMS','Social Media Free'] },
    { productId:'PRD-4481926', packageName:'Data Only 50GB',  productType:'data_sim',      basePrice:39.99,  currency:'USD', billingCycle:'monthly', status:'Active', features:['50GB Data','No Calls','Hotspot included'] },
  ]);
  console.log('Products created:', products.length);

  // ── 20 customers with real-looking account & phone numbers ─
  const custData = [
    // Roaming issues
    { id:'100000001', fn:'Ahmed',    ln:'Al-Rashid',   phone:'+966501234567', email:'ahmed.alrashid@gmail.com',    type:'Postpaid', prod:'PRD-4481921', since:'2022-03-15', scenario:'roaming'      },
    { id:'100000002', fn:'Mohammed', ln:'Al-Farsi',    phone:'+966509876543', email:'m.alfarsi@outlook.com',        type:'Postpaid', prod:'PRD-4481923', since:'2021-08-20', scenario:'roaming'      },
    { id:'100000003', fn:'Nour',     ln:'Al-Zahra',    phone:'+966551122334', email:'nour.alzahra@gmail.com',       type:'Postpaid', prod:'PRD-4481921', since:'2023-01-10', scenario:'roaming'      },
    { id:'100000004', fn:'Noura',    ln:'Al-Sulaiti',  phone:'+97450812345',  email:'noura.sulaiti@gmail.com',      type:'Postpaid', prod:'PRD-4481921', since:'2022-09-18', scenario:'roaming'      },
    { id:'100000005', fn:'Jasem',    ln:'Al-Kuwari',   phone:'+97455987654',  email:'jasem.kuwari@hotmail.com',     type:'Postpaid', prod:'PRD-4481923', since:'2021-06-05', scenario:'roaming'      },

    // Duplicate charges
    { id:'100000006', fn:'Sara',     ln:'Hassan',      phone:'+966561234567', email:'sara.hassan@yahoo.com',        type:'Postpaid', prod:'PRD-4481920', since:'2023-07-22', scenario:'duplicate'    },
    { id:'100000007', fn:'Fatima',   ln:'Al-Mansoori', phone:'+97143456789',  email:'fatima.mansoori@gmail.com',    type:'Postpaid', prod:'PRD-4481922', since:'2022-11-05', scenario:'duplicate'    },
    { id:'100000008', fn:'Yousef',   ln:'Al-Blooshi',  phone:'+97150234567',  email:'yousef.blooshi@outlook.com',   type:'Postpaid', prod:'PRD-4481923', since:'2020-11-22', scenario:'duplicate'    },
    { id:'100000009', fn:'Hamad',    ln:'Al-Thani',    phone:'+97433112233',  email:'hamad.althani@gmail.com',      type:'Postpaid', prod:'PRD-4481921', since:'2022-04-17', scenario:'duplicate'    },

    // Plan change fees
    { id:'100000010', fn:'Omar',     ln:'Karimi',      phone:'+966521234567', email:'omar.karimi@hotmail.com',      type:'Prepaid',  prod:'PRD-4481922', since:'2024-01-10', scenario:'plan_change'  },
    { id:'100000011', fn:'Khalid',   ln:'Al-Otaibi',   phone:'+966531234567', email:'khalid.otaibi@gmail.com',      type:'Postpaid', prod:'PRD-4481921', since:'2023-05-18', scenario:'plan_change'  },

    // Data overage
    { id:'100000012', fn:'Layla',    ln:'Nasser',      phone:'+966541234567', email:'layla.nasser@gmail.com',       type:'Postpaid', prod:'PRD-4481920', since:'2021-11-05', scenario:'data_overage' },
    { id:'100000013', fn:'Mariam',   ln:'Al-Jaber',    phone:'+97150912345',  email:'mariam.jaber@icloud.com',      type:'Postpaid', prod:'PRD-4481925', since:'2024-02-14', scenario:'data_overage' },
    { id:'100000014', fn:'Tariq',    ln:'Al-Hamdan',   phone:'+966501239876', email:'tariq.hamdan@gmail.com',       type:'Postpaid', prod:'PRD-4481926', since:'2023-09-01', scenario:'data_overage' },

    // Unknown / third-party charges
    { id:'100000015', fn:'Reem',     ln:'Al-Shammari', phone:'+966561239999', email:'reem.shammari@gmail.com',      type:'Postpaid', prod:'PRD-4481921', since:'2022-06-30', scenario:'unknown'      },
    { id:'100000016', fn:'Bandar',   ln:'Al-Qahtani',  phone:'+966501111222', email:'bandar.qahtani@outlook.com',   type:'Postpaid', prod:'PRD-4481923', since:'2021-03-12', scenario:'unknown'      },

    // Clean billing
    { id:'100000017', fn:'Dana',     ln:'Al-Mutairi',  phone:'+965990123456', email:'dana.mutairi@gmail.com',       type:'Postpaid', prod:'PRD-4481923', since:'2020-07-04', scenario:'clean'        },
    { id:'100000018', fn:'Faisal',   ln:'Al-Harbi',    phone:'+966503333444', email:'faisal.harbi@gmail.com',       type:'Postpaid', prod:'PRD-4481921', since:'2022-12-01', scenario:'clean'        },
    { id:'100000019', fn:'Saeed',    ln:'Al-Mazrouei', phone:'+97152777888',  email:'saeed.mazrouei@gmail.com',     type:'Postpaid', prod:'PRD-4481922', since:'2021-05-10', scenario:'clean'        },
    { id:'100000020', fn:'Hessa',    ln:'Al-Dosari',   phone:'+97433445566',  email:'hessa.dosari@yahoo.com',       type:'Prepaid',  prod:'PRD-4481925', since:'2024-03-20', scenario:'clean'        },
  ];

  function dueDate(year, month) {
    if (month === 12) return new Date(year + 1, 0, 15);
    return new Date(year, month, 15);
  }
  function rand(min, max)    { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max)); }

  for (const d of custData) {
    console.log('Creating:', d.id, d.fn, d.ln);

    const product   = products.find(p => p.productId === d.prod);
    const basePrice = product ? product.basePrice : 49.99;
    const planName  = product ? product.packageName : 'Basic';

    await Customer.create({
      customerId:       d.id,
      firstName:        d.fn,
      lastName:         d.ln,
      phoneNumber:      d.phone,
      email:            d.email,
      accountType:      d.type,
      planName:         planName,
      registrationDate: new Date(d.since),
    });

    await CustomerProduct.create({
      customerId:  d.id,
      productId:   d.prod,
      packageName: planName,
      startDate:   new Date('2024-01-01'),
      agreedPrice: basePrice,
      status:      'Active',
    });

    const months = [
      { label:'SEP', year:2024, month:9,  isCurrent:false },
      { label:'OCT', year:2024, month:10, isCurrent:false },
      { label:'NOV', year:2024, month:11, isCurrent:false },
      { label:'DEC', year:2024, month:12, isCurrent:true  },
    ];

    for (const mo of months) {
      const monthStr = `${mo.year}-${String(mo.month).padStart(2,'0')}`;
      // Invoice number: INV + account digits + month code
      const invId    = `INV-${d.id}-${mo.label}`;
      const charges  = [];
      let   extra    = 0;

      charges.push({
        chargeId:    `CHG-${invId}-SUB`,
        invoiceId:   invId,
        customerId:  d.id,
        chargeType:  'subscription',
        description: `${planName} — monthly subscription`,
        amount:      basePrice,
        taxRate:     0.15,
        chargeDate:  new Date(mo.year, mo.month - 1, 1),
        status:      'Applied',
        productId:   d.prod,
      });

      if (mo.isCurrent) {
        if (d.scenario === 'roaming') {
          const dataGB   = parseFloat(rand(1.5, 6.0).toFixed(1));
          const dataAmt  = parseFloat((dataGB * 14).toFixed(2));
          const voiceMin = randInt(20, 90);
          const voiceAmt = parseFloat((voiceMin * 0.30).toFixed(2));
          charges.push({
            chargeId: `CHG-${invId}-ROAM1`, invoiceId: invId, customerId: d.id,
            chargeType: 'roaming',
            description: `International data roaming — ${dataGB} GB at $14/GB`,
            amount: dataAmt, taxRate: 0.15,
            chargeDate: new Date(mo.year, mo.month - 1, randInt(5, 20)),
            status: 'Applied', productId: null,
          });
          charges.push({
            chargeId: `CHG-${invId}-ROAM2`, invoiceId: invId, customerId: d.id,
            chargeType: 'roaming',
            description: `International voice roaming — ${voiceMin} min at $0.30/min`,
            amount: voiceAmt, taxRate: 0.15,
            chargeDate: new Date(mo.year, mo.month - 1, randInt(5, 20)),
            status: 'Applied', productId: null,
          });
          extra = dataAmt + voiceAmt;

        } else if (d.scenario === 'duplicate') {
          charges.push({
            chargeId: `CHG-${invId}-DUP`, invoiceId: invId, customerId: d.id,
            chargeType: 'subscription',
            description: `${planName} — monthly subscription (DUPLICATE ENTRY)`,
            amount: basePrice, taxRate: 0.15,
            chargeDate: new Date(mo.year, mo.month - 1, 2),
            status: 'Applied', productId: d.prod,
          });
          extra = basePrice;

        } else if (d.scenario === 'plan_change') {
          const fee = parseFloat(rand(15, 35).toFixed(2));
          charges.push({
            chargeId: `CHG-${invId}-FEE`, invoiceId: invId, customerId: d.id,
            chargeType: 'plan_change_fee',
            description: 'Mid-cycle plan upgrade — prorated adjustment',
            amount: fee, taxRate: 0.15,
            chargeDate: new Date(mo.year, mo.month - 1, randInt(10, 20)),
            status: 'Applied', productId: null,
          });
          extra = fee;

        } else if (d.scenario === 'data_overage') {
          const overGB  = randInt(3, 12);
          const overAmt = parseFloat((overGB * 3).toFixed(2));
          charges.push({
            chargeId: `CHG-${invId}-OVR`, invoiceId: invId, customerId: d.id,
            chargeType: 'data_overage',
            description: `Data overage — ${overGB} GB beyond plan limit at $3/GB`,
            amount: overAmt, taxRate: 0.15,
            chargeDate: new Date(mo.year, mo.month - 1, randInt(15, 28)),
            status: 'Applied', productId: null,
          });
          extra = overAmt;

        } else if (d.scenario === 'unknown') {
          const svcAmt = parseFloat(rand(4.99, 14.99).toFixed(2));
          charges.push({
            chargeId: `CHG-${invId}-UNK`, invoiceId: invId, customerId: d.id,
            chargeType: 'third_party',
            description: 'Premium SMS subscription — third-party recurring charge',
            amount: svcAmt, taxRate: 0.15,
            chargeDate: new Date(mo.year, mo.month - 1, randInt(1, 10)),
            status: 'Applied', productId: null,
          });
          extra = svcAmt;
        }
      }

      const totalAmount   = basePrice + extra;
      const taxAmount     = parseFloat((totalAmount * 0.15).toFixed(2));
      const netPayable    = parseFloat((totalAmount + taxAmount).toFixed(2));
      const paymentStatus = mo.isCurrent ? 'Pending' : (Math.random() > 0.1 ? 'Paid' : 'Overdue');

      await BillingInvoice.create({
        invoiceId:      invId,
        customerId:     d.id,
        billingMonth:   monthStr,
        totalAmount:    parseFloat(totalAmount.toFixed(2)),
        taxAmount,
        discountAmount: 0,
        netPayable,
        dueDate:        dueDate(mo.year, mo.month),
        paymentStatus,
        currency:       'USD',
        invoiceType:    'Regular',
      });

      await Charge.insertMany(charges);

      await UsageRecord.insertMany([
        {
          usageId: `USG-${invId}-V`, customerId: d.id,
          usageType: 'Voice', usageAmount: randInt(80, 300),
          unit: 'min', roamingFlag: false,
          usageDate: new Date(mo.year, mo.month - 1, 10),
        },
        {
          usageId: `USG-${invId}-D`, customerId: d.id,
          usageType: 'Data', usageAmount: parseFloat(rand(5, 22).toFixed(1)),
          unit: 'GB', roamingFlag: false,
          usageDate: new Date(mo.year, mo.month - 1, 15),
        },
        {
          usageId: `USG-${invId}-S`, customerId: d.id,
          usageType: 'SMS', usageAmount: randInt(10, 120),
          unit: 'msg', roamingFlag: false,
          usageDate: new Date(mo.year, mo.month - 1, 12),
        },
        ...(d.scenario === 'roaming' && mo.isCurrent ? [{
          usageId: `USG-${invId}-RD`, customerId: d.id,
          usageType: 'Data', usageAmount: parseFloat(rand(1.5, 6.0).toFixed(1)),
          unit: 'GB', roamingFlag: true,
          usageDate: new Date(mo.year, mo.month - 1, randInt(5, 20)),
          chargeId: `CHG-${invId}-ROAM1`,
        }] : []),
      ]);
    }

    if (d.scenario !== 'clean') {
      const descMap = {
        roaming:      'My monthly bill increased unexpectedly. I see roaming charges I did not authorise.',
        duplicate:    'I was charged twice for the same monthly subscription.',
        plan_change:  'There is an unexpected fee on my bill after I changed my plan.',
        data_overage: 'I am being charged extra for data even though I have a data plan.',
        unknown:      'I see a charge on my bill for a service I never subscribed to.',
      };
      const typeMap = {
        roaming:      'Unexpected charge',
        duplicate:    'Duplicate charge',
        plan_change:  'Plan change fee',
        data_overage: 'Data overage',
        unknown:      'Unknown charge',
      };
      // Complaint ID: CMP + account number + sequence
      await Complaint.create({
        complaintId:   `CMP-${d.id}-001`,
        customerId:    d.id,
        complaintType: typeMap[d.scenario],
        description:   descMap[d.scenario],
        complaintDate: new Date('2024-12-28'),
        status:        'Open',
        channel:       'Selfcare',
      });
    }

    console.log('  ✓', d.id, d.fn, d.ln, '—', d.scenario);
  }

  console.log('\n✅ Seed complete!');
  console.log('   Customers:  ', custData.length);
  console.log('   Products:   ', products.length);
  console.log('   Invoices:   ', custData.length * 4, '(Sep–Dec 2024)');
  console.log('   Complaints: ', custData.filter(c => c.scenario !== 'clean').length);
}

module.exports = seed;