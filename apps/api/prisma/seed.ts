// =============================================================================
// Real Estate CRM — Seed Data
// Development / Demo only — NOT for production
// =============================================================================

import { PrismaClient, UserRole, LeadSource, LeadStatus, UnitStatus, UnitType, PropertyType, ProjectStatus, DealStatus, PipelineStage, PaymentMethod, CommissionStatus, TaskPriority, TaskStatus, ViewingStatus, OfferStatus, LeadTemperature, FinancingPreference, PurchasePurpose } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo data...');

  // ---------------------------------------------------------------------------
  // ORGANIZATION
  // ---------------------------------------------------------------------------
  const org = await prisma.organization.create({
    data: {
      name: 'DEMO — Prestige Properties LLC',
      slug: 'demo-prestige-properties',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      currency: 'AED',
      timezone: 'Asia/Dubai',
      country: 'UAE',
      city: 'Dubai',
      phone: '+971 4 000 0000',
      email: 'admin@demo-prestige.com',
      website: 'https://demo-prestige.com',
    },
  });

  console.log(`✅ Organization: ${org.name}`);

  // ---------------------------------------------------------------------------
  // USERS
  // ---------------------------------------------------------------------------
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const companyAdmin = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'admin@demo-prestige.com',
      passwordHash: hash('Demo@1234'),
      role: UserRole.COMPANY_ADMIN,
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: { firstName: 'Ahmed', lastName: 'Al-Mansouri', phone: '+971 50 100 0001' },
      },
    },
  });

  const salesManager = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'manager@demo-prestige.com',
      passwordHash: hash('Demo@1234'),
      role: UserRole.SALES_MANAGER,
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: { firstName: 'Sara', lastName: 'Hassan', phone: '+971 50 100 0002' },
      },
    },
  });

  const agent1 = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'agent1@demo-prestige.com',
      passwordHash: hash('Demo@1234'),
      role: UserRole.SALES_AGENT,
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: { firstName: 'Mohammed', lastName: 'Al-Rashid', phone: '+971 50 100 0003' },
      },
    },
  });

  const agent2 = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'agent2@demo-prestige.com',
      passwordHash: hash('Demo@1234'),
      role: UserRole.SALES_AGENT,
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: { firstName: 'Fatima', lastName: 'Al-Zahra', phone: '+971 50 100 0004' },
      },
    },
  });

  const accountant = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'accounts@demo-prestige.com',
      passwordHash: hash('Demo@1234'),
      role: UserRole.ACCOUNTANT,
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: { firstName: 'Rania', lastName: 'Khalid', phone: '+971 50 100 0005' },
      },
    },
  });

  const propManager = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'properties@demo-prestige.com',
      passwordHash: hash('Demo@1234'),
      role: UserRole.PROPERTY_MANAGER,
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: { firstName: 'Khalid', lastName: 'Ibrahim', phone: '+971 50 100 0006' },
      },
    },
  });

  console.log('✅ Users created (6)');

  // ---------------------------------------------------------------------------
  // TEAM
  // ---------------------------------------------------------------------------
  const team = await prisma.team.create({
    data: {
      organizationId: org.id,
      name: 'Downtown Sales Team',
      members: {
        create: [
          { userId: salesManager.id, isLead: true },
          { userId: agent1.id },
          { userId: agent2.id },
        ],
      },
    },
  });

  console.log('✅ Team created');

  // ---------------------------------------------------------------------------
  // CAMPAIGNS
  // ---------------------------------------------------------------------------
  const fbCampaign = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: 'Q1 Dubai Hills Facebook',
      source: LeadSource.FACEBOOK,
      budget: 50000,
      isActive: true,
    },
  });

  const googleCampaign = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: 'Google Ads — Luxury Apartments',
      source: LeadSource.GOOGLE_ADS,
      budget: 80000,
      isActive: true,
    },
  });

  // ---------------------------------------------------------------------------
  // PROJECT 1: Dubai Hills Residence
  // ---------------------------------------------------------------------------
  const project1 = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: 'Dubai Hills Residence',
      developer: 'Emaar Properties',
      description: 'Luxury residential towers in the heart of Dubai Hills Estate.',
      propertyType: PropertyType.RESIDENTIAL,
      status: ProjectStatus.UNDER_CONSTRUCTION,
      city: 'Dubai',
      district: 'Dubai Hills',
      country: 'UAE',
      lat: 25.1124,
      lng: 55.2389,
      startingPrice: 1200000,
      completionDate: new Date('2026-06-01'),
      amenities: ['Pool', 'Gym', 'Concierge', 'Children Play Area', 'Retail'],
    },
  });

  const building1 = await prisma.building.create({
    data: {
      organizationId: org.id,
      projectId: project1.id,
      name: 'Tower A',
      buildingNumber: 'A',
      floorsCount: 30,
    },
  });

  const floors1 = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      prisma.floor.create({
        data: { buildingId: building1.id, floorNumber: i + 1 },
      })
    )
  );

  // Create units for project 1
  const units1 = await Promise.all([
    prisma.unit.create({
      data: {
        organizationId: org.id,
        projectId: project1.id,
        buildingId: building1.id,
        floorId: floors1[0].id,
        unitNumber: '101',
        unitType: UnitType.APARTMENT,
        propertyType: PropertyType.RESIDENTIAL,
        status: UnitStatus.AVAILABLE,
        area: 85,
        builtUpArea: 95,
        bedrooms: 1,
        bathrooms: 1,
        view: 'Pool View',
        price: 1250000,
        pricePerMeter: 14706,
        finishing: 'FULLY_FINISHED',
      },
    }),
    prisma.unit.create({
      data: {
        organizationId: org.id,
        projectId: project1.id,
        buildingId: building1.id,
        floorId: floors1[0].id,
        unitNumber: '102',
        unitType: UnitType.APARTMENT,
        propertyType: PropertyType.RESIDENTIAL,
        status: UnitStatus.AVAILABLE,
        area: 120,
        bedrooms: 2,
        bathrooms: 2,
        view: 'City View',
        price: 1850000,
        pricePerMeter: 15417,
        finishing: 'FULLY_FINISHED',
      },
    }),
    prisma.unit.create({
      data: {
        organizationId: org.id,
        projectId: project1.id,
        buildingId: building1.id,
        floorId: floors1[1].id,
        unitNumber: '201',
        unitType: UnitType.APARTMENT,
        propertyType: PropertyType.RESIDENTIAL,
        status: UnitStatus.RESERVED,
        area: 165,
        bedrooms: 3,
        bathrooms: 3,
        view: 'Golf Course View',
        price: 2800000,
        pricePerMeter: 16970,
        finishing: 'SUPER_LUX',
      },
    }),
    prisma.unit.create({
      data: {
        organizationId: org.id,
        projectId: project1.id,
        buildingId: building1.id,
        floorId: floors1[4].id,
        unitNumber: '501',
        unitType: UnitType.PENTHOUSE,
        propertyType: PropertyType.RESIDENTIAL,
        status: UnitStatus.AVAILABLE,
        area: 320,
        bedrooms: 4,
        bathrooms: 5,
        view: 'Panoramic View',
        price: 8500000,
        pricePerMeter: 26563,
        finishing: 'SUPER_LUX',
      },
    }),
  ]);

  // ---------------------------------------------------------------------------
  // PROJECT 2: Business Bay Office Tower
  // ---------------------------------------------------------------------------
  const project2 = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: 'Business Bay Executive Tower',
      developer: 'Damac Properties',
      description: 'Premium office and commercial spaces in Business Bay.',
      propertyType: PropertyType.COMMERCIAL,
      status: ProjectStatus.READY,
      city: 'Dubai',
      district: 'Business Bay',
      country: 'UAE',
      lat: 25.1853,
      lng: 55.2614,
      startingPrice: 800000,
      amenities: ['24/7 Security', 'Parking', 'Conference Rooms', 'Cafeteria'],
    },
  });

  const building2 = await prisma.building.create({
    data: {
      organizationId: org.id,
      projectId: project2.id,
      name: 'Main Tower',
      buildingNumber: '1',
      floorsCount: 20,
    },
  });

  const floor2 = await prisma.floor.create({
    data: { buildingId: building2.id, floorNumber: 5 },
  });

  const unit5 = await prisma.unit.create({
    data: {
      organizationId: org.id,
      projectId: project2.id,
      buildingId: building2.id,
      floorId: floor2.id,
      unitNumber: '501',
      unitType: UnitType.OFFICE,
      propertyType: PropertyType.COMMERCIAL,
      status: UnitStatus.SOLD,
      area: 200,
      price: 2200000,
      pricePerMeter: 11000,
      finishing: 'FULLY_FINISHED',
    },
  });

  console.log('✅ Projects, buildings, units created');

  // ---------------------------------------------------------------------------
  // LEADS
  // ---------------------------------------------------------------------------
  const leadsData = [
    {
      fullName: 'James Anderson',
      phone: '+971 55 200 1001',
      email: 'james.anderson@email.com',
      country: 'UK',
      city: 'London',
      source: LeadSource.FACEBOOK,
      campaignId: fbCampaign.id,
      status: LeadStatus.QUALIFIED,
      temperature: LeadTemperature.HOT,
      leadScore: 75,
      budgetMin: 1500000,
      budgetMax: 3000000,
      preferredType: PropertyType.RESIDENTIAL,
      bedrooms: 2,
      purchasePurpose: PurchasePurpose.INVESTMENT,
      assignedAgentId: agent1.id,
      teamId: team.id,
    },
    {
      fullName: 'Aisha Mohammed',
      phone: '+971 55 200 1002',
      email: 'aisha.m@email.com',
      country: 'UAE',
      city: 'Dubai',
      source: LeadSource.GOOGLE_ADS,
      campaignId: googleCampaign.id,
      status: LeadStatus.VIEWING_SCHEDULED,
      temperature: LeadTemperature.HOT,
      leadScore: 90,
      budgetMin: 2500000,
      budgetMax: 5000000,
      preferredType: PropertyType.RESIDENTIAL,
      bedrooms: 3,
      purchasePurpose: PurchasePurpose.OWN_USE,
      financingPref: FinancingPreference.CASH,
      assignedAgentId: agent1.id,
      teamId: team.id,
    },
    {
      fullName: 'Robert Chen',
      phone: '+971 55 200 1003',
      email: 'robert.chen@email.com',
      country: 'China',
      city: 'Shanghai',
      source: LeadSource.PROPERTY_PORTAL,
      status: LeadStatus.CONTACTED,
      temperature: LeadTemperature.WARM,
      leadScore: 45,
      budgetMin: 800000,
      budgetMax: 1500000,
      preferredType: PropertyType.RESIDENTIAL,
      bedrooms: 1,
      purchasePurpose: PurchasePurpose.INVESTMENT,
      assignedAgentId: agent2.id,
      teamId: team.id,
    },
    {
      fullName: 'Priya Sharma',
      phone: '+971 55 200 1004',
      email: 'priya.sharma@email.com',
      country: 'India',
      city: 'Mumbai',
      source: LeadSource.REFERRAL,
      status: LeadStatus.NEW,
      temperature: LeadTemperature.COLD,
      leadScore: 20,
      budgetMin: 1000000,
      budgetMax: 2000000,
      preferredType: PropertyType.RESIDENTIAL,
      bedrooms: 2,
      purchasePurpose: PurchasePurpose.INVESTMENT,
      assignedAgentId: agent2.id,
      teamId: team.id,
    },
    {
      fullName: 'Khalid Al-Saud',
      phone: '+971 55 200 1005',
      email: 'khalid.alsaud@email.com',
      country: 'Saudi Arabia',
      city: 'Riyadh',
      source: LeadSource.WHATSAPP,
      status: LeadStatus.RESERVED,
      temperature: LeadTemperature.HOT,
      leadScore: 95,
      budgetMin: 7000000,
      budgetMax: 12000000,
      preferredType: PropertyType.RESIDENTIAL,
      bedrooms: 4,
      purchasePurpose: PurchasePurpose.OWN_USE,
      financingPref: FinancingPreference.CASH,
      assignedAgentId: agent1.id,
      teamId: team.id,
    },
  ];

  const leads = await Promise.all(
    leadsData.map((data) =>
      prisma.lead.create({
        data: { organizationId: org.id, ...data },
      })
    )
  );

  console.log(`✅ Leads created (${leads.length})`);

  // Lead activities for lead[0]
  await prisma.leadActivity.createMany({
    data: [
      {
        leadId: leads[0].id,
        organizationId: org.id,
        actorId: agent1.id,
        type: 'LEAD_CREATED',
        payload: { source: 'FACEBOOK', campaign: 'Q1 Dubai Hills Facebook' },
      },
      {
        leadId: leads[0].id,
        organizationId: org.id,
        actorId: agent1.id,
        type: 'CALL_LOGGED',
        payload: { duration: 300, notes: 'Discussed budget and requirements' },
      },
      {
        leadId: leads[0].id,
        organizationId: org.id,
        actorId: agent1.id,
        type: 'STATUS_CHANGED',
        payload: { from: 'CONTACTED', to: 'QUALIFIED' },
      },
    ],
  });

  // ---------------------------------------------------------------------------
  // CUSTOMERS
  // ---------------------------------------------------------------------------
  const customer1 = await prisma.customer.create({
    data: {
      organizationId: org.id,
      leadId: leads[4].id,
      assignedAgentId: agent1.id,
      fullName: 'Khalid Al-Saud',
      phone: '+971 55 200 1005',
      email: 'khalid.alsaud@email.com',
      nationality: 'Saudi',
      country: 'Saudi Arabia',
      city: 'Riyadh',
      budgetMin: 7000000,
      budgetMax: 12000000,
      preferredType: PropertyType.RESIDENTIAL,
      bedrooms: 4,
      purchasePurpose: PurchasePurpose.OWN_USE,
      financingPref: FinancingPreference.CASH,
    },
  });

  // Customer for completed deal
  const customer2 = await prisma.customer.create({
    data: {
      organizationId: org.id,
      assignedAgentId: agent2.id,
      fullName: 'Michael Davies',
      phone: '+971 55 200 2001',
      email: 'michael.davies@email.com',
      nationality: 'British',
      country: 'UK',
      city: 'London',
      budgetMin: 2000000,
      budgetMax: 3000000,
      preferredType: PropertyType.COMMERCIAL,
    },
  });

  console.log('✅ Customers created');

  // ---------------------------------------------------------------------------
  // VIEWINGS
  // ---------------------------------------------------------------------------
  await prisma.viewing.create({
    data: {
      organizationId: org.id,
      leadId: leads[1].id,
      unitId: units1[2].id,
      agentId: agent1.id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      status: ViewingStatus.SCHEDULED,
      location: 'Dubai Hills Residence — Tower A, Unit 201',
      notes: 'Client specifically interested in golf course view',
    },
  });

  await prisma.viewing.create({
    data: {
      organizationId: org.id,
      customerId: customer1.id,
      unitId: units1[3].id,
      agentId: agent1.id,
      scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: ViewingStatus.COMPLETED,
      outcome: 'Very interested — requested payment plan details',
      customerFeedback: 'Loved the view and space',
      agentFeedback: 'High probability of closing',
    },
  });

  console.log('✅ Viewings created');

  // ---------------------------------------------------------------------------
  // OFFER
  // ---------------------------------------------------------------------------
  await prisma.offer.create({
    data: {
      organizationId: org.id,
      customerId: customer1.id,
      unitId: units1[3].id,
      agentId: agent1.id,
      originalPrice: 8500000,
      offeredPrice: 8200000,
      discount: 300000,
      discountPct: 3.53,
      downPayment: 2050000,
      installmentCount: 24,
      status: OfferStatus.SENT,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // ---------------------------------------------------------------------------
  // RESERVATION (unit 201 — already status RESERVED)
  // ---------------------------------------------------------------------------
  await prisma.reservation.create({
    data: {
      organizationId: org.id,
      unitId: units1[2].id,
      customerId: customer1.id,
      agentId: agent1.id,
      reservationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
      reservationAmount: 50000,
      status: 'ACTIVE',
      paymentStatus: 'PAID',
    },
  });

  // ---------------------------------------------------------------------------
  // DEAL (completed — unit 501 in project2, already SOLD)
  // ---------------------------------------------------------------------------
  const deal1 = await prisma.deal.create({
    data: {
      organizationId: org.id,
      customerId: customer2.id,
      unitId: unit5.id,
      agentId: agent2.id,
      managerId: salesManager.id,
      dealNumber: 'DEAL-2024-001',
      salePrice: 2200000,
      discount: 0,
      netSaleValue: 2200000,
      status: DealStatus.COMPLETED,
      pipelineStage: PipelineStage.CLOSED_WON,
      contractDate: new Date('2024-09-15'),
      closingDate: new Date('2024-10-01'),
    },
  });

  // Payment plan for deal1
  const paymentPlan = await prisma.paymentPlan.create({
    data: {
      dealId: deal1.id,
      organizationId: org.id,
      totalAmount: 2200000,
      downPayment: 440000,
      remainingAmount: 1760000,
      installmentCount: 8,
      installmentAmount: 220000,
      frequencyMonths: 3,
      startDate: new Date('2024-10-01'),
    },
  });

  // Installments
  const installments = await Promise.all(
    Array.from({ length: 8 }, (_, i) => {
      const dueDate = new Date('2024-10-01');
      dueDate.setMonth(dueDate.getMonth() + i * 3);
      const isPaid = i < 3;
      return prisma.installment.create({
        data: {
          paymentPlanId: paymentPlan.id,
          dealId: deal1.id,
          organizationId: org.id,
          dueDate,
          amount: 220000,
          paidAmount: isPaid ? 220000 : 0,
          remainingAmount: isPaid ? 0 : 220000,
          status: isPaid ? 'PAID' : i === 3 ? 'DUE' : 'UPCOMING',
          paidAt: isPaid ? dueDate : null,
        },
      });
    })
  );

  // Payments
  await prisma.payment.create({
    data: {
      organizationId: org.id,
      dealId: deal1.id,
      installmentId: installments[0].id,
      amount: 440000,
      method: PaymentMethod.BANK_TRANSFER,
      status: 'COMPLETED',
      referenceNumber: 'TRX-2024-0001',
      paidAt: new Date('2024-10-01'),
      notes: 'Down payment',
    },
  });

  // Commission
  await prisma.commission.create({
    data: {
      organizationId: org.id,
      dealId: deal1.id,
      agentId: agent2.id,
      managerId: salesManager.id,
      agentRate: 2.0,
      managerRate: 0.5,
      agentAmount: 44000,
      managerAmount: 11000,
      totalAmount: 55000,
      status: CommissionStatus.PAID,
      approvedAt: new Date('2024-10-05'),
      paidAt: new Date('2024-10-15'),
    },
  });

  console.log('✅ Deals, payments, commissions created');

  // ---------------------------------------------------------------------------
  // TASKS
  // ---------------------------------------------------------------------------
  await prisma.task.createMany({
    data: [
      {
        organizationId: org.id,
        assigneeId: agent1.id,
        createdById: salesManager.id,
        relatedType: 'LEAD',
        relatedId: leads[0].id,
        title: 'Follow up with James Anderson',
        description: 'Call to schedule a property viewing',
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      {
        organizationId: org.id,
        assigneeId: agent1.id,
        createdById: agent1.id,
        relatedType: 'CUSTOMER',
        relatedId: customer1.id,
        title: 'Send payment plan options to Khalid',
        priority: TaskPriority.URGENT,
        status: TaskStatus.TODO,
        dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      {
        organizationId: org.id,
        assigneeId: agent2.id,
        createdById: salesManager.id,
        relatedType: 'LEAD',
        relatedId: leads[2].id,
        title: 'Qualify Robert Chen - confirm budget',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('✅ Tasks created');

  // ---------------------------------------------------------------------------
  // LEAD SCORING RULES
  // ---------------------------------------------------------------------------
  await prisma.leadScoringRule.createMany({
    data: [
      { organizationId: org.id, signal: 'HAS_VALID_PHONE', points: 10 },
      { organizationId: org.id, signal: 'HAS_WHATSAPP', points: 10 },
      { organizationId: org.id, signal: 'HAS_BUDGET', points: 10 },
      { organizationId: org.id, signal: 'STATUS_QUALIFIED', points: 15 },
      { organizationId: org.id, signal: 'VIEWING_SCHEDULED', points: 15 },
      { organizationId: org.id, signal: 'VIEWING_COMPLETED', points: 20 },
      { organizationId: org.id, signal: 'OFFER_CREATED', points: 20 },
      { organizationId: org.id, signal: 'RESERVATION', points: 30 },
    ],
  });

  // ---------------------------------------------------------------------------
  // COMMISSION RULES
  // ---------------------------------------------------------------------------
  await prisma.commissionRule.create({
    data: {
      organizationId: org.id,
      name: 'Standard Commission',
      agentRate: 2.0,
      managerRate: 0.5,
      isDefault: true,
    },
  });

  // ---------------------------------------------------------------------------
  // ASSIGNMENT RULES
  // ---------------------------------------------------------------------------
  await prisma.assignmentRule.create({
    data: {
      organizationId: org.id,
      name: 'Default Round Robin',
      strategy: 'ROUND_ROBIN',
      teamId: team.id,
      isActive: true,
      priority: 1,
    },
  });

  console.log('\n🎉 Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Demo credentials:');
  console.log('  Admin:    admin@demo-prestige.com     / Demo@1234');
  console.log('  Manager:  manager@demo-prestige.com   / Demo@1234');
  console.log('  Agent 1:  agent1@demo-prestige.com    / Demo@1234');
  console.log('  Agent 2:  agent2@demo-prestige.com    / Demo@1234');
  console.log('  Accounts: accounts@demo-prestige.com  / Demo@1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
