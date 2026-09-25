import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { Pledge } from '../src/models/Pledge.js';
import { Counter } from '../src/models/Counter.js';
import { generateCertificateBuffer } from '../src/services/certificateService.js';
import emailService from '../src/services/emailService.js';

let mongoServer;
let server;

describe('NCSAM Pledge Backend API — Production & Minimal Storage Test Suite', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Seed Counter collection at 26000000
    await Counter.create({ _id: 'pledge', sequence: 26000000 });

    server = app.listen(0);
    server.keepAliveTimeout = 1000;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Pledge.deleteMany({});
  });

  // -----------------------------------------------------------
  // 1. Health Endpoint Tests
  // -----------------------------------------------------------
  test('GET /api/health should return ok and database connected', async () => {
    const res = await request(server).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database, 'connected');
    assert.ok(res.body.timestamp);
  });

  // -----------------------------------------------------------
  // Test 1 — Normal pledge (certificate unchecked)
  // -----------------------------------------------------------
  test('Test 1 — Normal pledge: valid data, receiveCertificate=false', async () => {
    const payload = {
      title: 'Mr.',
      name: 'Rohan Sharma',
      language: 'en',
      email: 'rohan.sharma@example.com',
      phone: '9876543210',
      occupation: 'Student',
      organisation: 'Delhi University',
      pledgeAccepted: true,
      receiveCertificate: false,
    };

    const countBefore = await request(server).get('/api/pledges/count');
    const res = await request(server).post('/api/pledges').send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.pledgeCompleted, true);
    assert.equal(res.body.certificateGenerated, false);
    assert.equal(res.body.certificateSent, false);
    assert.equal(res.body.certificate.requested, false);

    const saved = await Pledge.findOne({ email: 'rohan.sharma@example.com' });
    assert.ok(saved, 'Pledge record must be stored');
    assert.equal(saved.officialName, 'Rohan Sharma');
    assert.equal(saved.receiveCertificate, false);
    assert.equal(saved.certificateStatus, 'not_requested');
    assert.equal(saved.certificateGeneratedAt, undefined);
    assert.equal(saved.certificateSentAt, undefined);

    const countAfter = await request(server).get('/api/pledges/count');
    assert.equal(countAfter.body.count, countBefore.body.count + 1);
  });

  // -----------------------------------------------------------
  // Test 2 — Certificate requested (receiveCertificate=true)
  // -----------------------------------------------------------
  test('Test 2 — Certificate requested: generates atomic ID, in-memory PDF, dispatches email', async () => {
    const payload = {
      title: 'Mr.',
      name: 'Sanjeev Chaurasia',
      language: 'en',
      email: 'sanjeev.chaurasia@example.com',
      phone: '9811122233',
      occupation: 'Developer',
      organisation: 'Tech Lab',
      pledgeAccepted: true,
      receiveCertificate: true,
    };

    const res = await request(server).post('/api/pledges').send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.pledgeCompleted, true);
    assert.equal(res.body.certificateGenerated, true);
    assert.equal(res.body.certificateSent, true);
    assert.equal(res.body.certificate.requested, true);

    const certNum = res.body.certificate.certificateNumber || res.body.certificate.certificateId;
    assert.ok(certNum.startsWith('NF/CSP/'), `Certificate number ${certNum} must start with NF/CSP/`);
    assert.match(certNum, /^NF\/CSP\/26\d{6}$/, `Certificate number ${certNum} must follow NF/CSP/26xxxxxx`);

    const saved = await Pledge.findOne({ email: 'sanjeev.chaurasia@example.com' });
    assert.ok(saved);
    assert.equal(saved.receiveCertificate, true);
    assert.equal(saved.certificateStatus, 'sent');
    assert.equal(saved.certificateNumber, certNum);
    assert.ok(saved.pledgeNumber >= 26000001);
  });

  // -----------------------------------------------------------
  // Test 3 — Hindi language submission
  // -----------------------------------------------------------
  test('Test 3 — Hindi pledge: valid data handled smoothly', async () => {
    const payload = {
      title: 'Ms.',
      name: 'Pooja Verma',
      language: 'hi',
      email: 'pooja.verma@example.com',
      phone: '9822233344',
      occupation: 'Analyst',
      organisation: 'Govt School',
      pledgeAccepted: true,
      receiveCertificate: true,
    };

    const res = await request(server).post('/api/pledges').send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.certificateSent, true);

    const saved = await Pledge.findOne({ email: 'pooja.verma@example.com' });
    assert.ok(saved);
    assert.equal(saved.title, 'Ms.');
    assert.equal(saved.certificateStatus, 'sent');
  });

  // -----------------------------------------------------------
  // Test 4 — Optional fields empty
  // -----------------------------------------------------------
  test('Test 4 — Optional fields empty: occupation and organisation empty strings allowed', async () => {
    const payload = {
      title: 'Dr.',
      name: 'Aarav Patel',
      language: 'en',
      email: 'aarav.patel@example.com',
      phone: '9833344455',
      occupation: '',
      organisation: '',
      pledgeAccepted: true,
      receiveCertificate: true,
    };

    const res = await request(server).post('/api/pledges').send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);

    const saved = await Pledge.findOne({ email: 'aarav.patel@example.com' });
    assert.ok(saved);
    assert.equal(saved.occupation, '');
    assert.equal(saved.organisation, '');
  });

  // -----------------------------------------------------------
  // Test 5 — Invalid data handling
  // -----------------------------------------------------------
  test('Test 5 — Invalid data: rejects invalid email, phone, missing name, false pledgeAccepted', async () => {
    // Missing name
    let res = await request(server).post('/api/pledges').send({
      title: 'Mr.',
      email: 'valid@example.com',
      phone: '9876543210',
      pledgeAccepted: true,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);

    // Invalid email
    res = await request(server).post('/api/pledges').send({
      name: 'Valid Name',
      email: 'invalid-email-address',
      phone: '9876543210',
      pledgeAccepted: true,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);

    // Invalid phone (<10 digits)
    res = await request(server).post('/api/pledges').send({
      name: 'Valid Name',
      email: 'valid@example.com',
      phone: '12345',
      pledgeAccepted: true,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);

    // Pledge not accepted
    res = await request(server).post('/api/pledges').send({
      name: 'Valid Name',
      email: 'valid@example.com',
      phone: '9876543210',
      pledgeAccepted: false,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  // -----------------------------------------------------------
  // Test 6 — Counter Concurrency (50 simultaneous submissions)
  // -----------------------------------------------------------
  test('Test 6 — Counter concurrency: 50 simultaneous submissions produce strictly unique consecutive sequence IDs', async () => {
    const TOTAL_CONCURRENT = 50;
    const promises = [];
    for (let i = 1; i <= TOTAL_CONCURRENT; i++) {
      promises.push(
        request(server)
          .post('/api/pledges')
          .send({
            title: 'Mr.',
            name: `Participant ${i}`,
            email: `concurrent${i}@example.com`,
            phone: `98000000${String(i).padStart(2, '0')}`,
            pledgeAccepted: true,
            receiveCertificate: true,
          })
      );
    }

    const responses = await Promise.all(promises);
    const pledgeNumbers = [];
    const certNumbers = [];

    for (const r of responses) {
      assert.equal(r.status, 201);
      const num = r.body.pledgeNumber;
      const cert = r.body.certificateNumber || r.body.certificate.certificateNumber;
      pledgeNumbers.push(num);
      certNumbers.push(cert);
    }

    // Verify exactly 50 unique pledge numbers
    const uniquePledgeNums = new Set(pledgeNumbers);
    assert.equal(uniquePledgeNums.size, TOTAL_CONCURRENT, 'Every pledge number must be unique');

    // Verify exactly 50 unique certificate numbers
    const uniqueCertNums = new Set(certNumbers);
    assert.equal(uniqueCertNums.size, TOTAL_CONCURRENT, 'Every certificate number must be unique');

    // Verify sorted consecutive numbers
    pledgeNumbers.sort((a, b) => a - b);
    for (let j = 0; j < pledgeNumbers.length - 1; j++) {
      assert.equal(pledgeNumbers[j + 1], pledgeNumbers[j] + 1, 'Pledge numbers must be consecutive without gaps');
    }
  });

  // -----------------------------------------------------------
  // Test 7 — Email service failure resilience
  // -----------------------------------------------------------
  test('Test 7 — Email failure: pledge stored, email failure reported without throwing 500 error', async () => {
    const originalSend = emailService.sendCertificateEmail;
    emailService.sendCertificateEmail = async () => {
      throw new Error('SMTP connection timeout: Host unreachable');
    };

    try {
      const res = await request(server).post('/api/pledges').send({
        title: 'Ms.',
        name: 'Kavita Singh',
        email: 'kavita.singh@example.com',
        phone: '9844455566',
        pledgeAccepted: true,
        receiveCertificate: true,
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.pledgeCompleted, true);
      assert.equal(res.body.certificateGenerated, true);
      assert.equal(res.body.certificateSent, false);
      assert.ok(res.body.emailError);

      const saved = await Pledge.findOne({ email: 'kavita.singh@example.com' });
      assert.ok(saved, 'Pledge record must be safely preserved in database');
      assert.equal(saved.certificateStatus, 'failed');
    } finally {
      emailService.sendCertificateEmail = originalSend;
    }
  });

  // -----------------------------------------------------------
  // Test 8 — PDFKit Certificate Generation (Title+Name, Cert Num, Date only)
  // -----------------------------------------------------------
  test('Test 8 — Certificate generation: produces non-empty PDF buffer with Lora font and zero QR generation', async () => {
    const pdfBuffer = await generateCertificateBuffer({
      title: 'Dr.',
      name: 'Vikram Sarabhai',
      certificateNumber: 'NF/CSP/26000099',
      date: new Date('2026-09-25'),
    });

    assert.ok(Buffer.isBuffer(pdfBuffer));
    assert.ok(pdfBuffer.length > 5000, 'PDF buffer must be non-empty and reasonably sized');

    // Verify PDF header magic bytes "%PDF-"
    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    assert.equal(pdfHeader, '%PDF-', 'Buffer must be valid PDF');
  });

  // -----------------------------------------------------------
  // Test 9 — 404 Route handling
  // -----------------------------------------------------------
  test('Test 9 — Route 404: nonexistent route returns standard JSON error', async () => {
    const res = await request(server).get('/api/nonexistent-route-xyz');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /not found/i);
  });

  // -----------------------------------------------------------
  // Test 10 — Verification System Completely Removed
  // -----------------------------------------------------------
  test('Test 10 — Verification removed: /api/certificates routes return 404', async () => {
    const res = await request(server).get('/api/certificates/verify/NF/CSP/26000001');
    assert.equal(res.status, 404, 'Verification endpoint must not exist');
    assert.equal(res.body.success, false);
  });

  // -----------------------------------------------------------
  // Test 11 — Minimal Database Storage & Zero Binary Footprint
  // -----------------------------------------------------------
  test('Test 11 — Minimal Storage: MongoDB stores only minimal fields, zero PDFs, zero QR data', async () => {
    const pledgeRes = await request(server).post('/api/pledges').send({
      title: 'Dr.',
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phone: '9877766655',
      occupation: 'Scientist',
      organisation: 'ISRO',
      pledgeAccepted: true,
      receiveCertificate: true,
    });

    assert.equal(pledgeRes.status, 201);

    const savedDoc = await Pledge.findOne({ email: 'priya.sharma@example.com' }).lean();
    assert.ok(savedDoc);

    // Verify stored minimal fields
    assert.equal(savedDoc.title, 'Dr.');
    assert.equal(savedDoc.officialName, 'Priya Sharma');
    assert.equal(savedDoc.email, 'priya.sharma@example.com');
    assert.equal(savedDoc.phone, '9877766655');
    assert.equal(savedDoc.occupation, 'Scientist');
    assert.equal(savedDoc.organisation, 'ISRO');
    assert.equal(savedDoc.receiveCertificate, true);
    assert.ok(savedDoc.pledgeNumber);
    assert.equal(savedDoc.certificateStatus, 'sent');
    assert.ok(savedDoc.createdAt);

    // Verify strictly forbidden fields do NOT exist in MongoDB
    assert.equal(savedDoc.certificateId, undefined, 'certificateId must not be stored in document');
    assert.equal(savedDoc.certificateGeneratedAt, undefined, 'certificateGeneratedAt must not be stored');
    assert.equal(savedDoc.certificateSentAt, undefined, 'certificateSentAt must not be stored');
    assert.equal(savedDoc.updatedAt, undefined, 'updatedAt must not be stored');
    assert.equal(savedDoc.pdf, undefined, 'PDF buffer must not be stored');
    assert.equal(savedDoc.buffer, undefined, 'Buffer must not be stored');
    assert.equal(savedDoc.fileData, undefined, 'File data must not be stored');
    assert.equal(savedDoc.base64, undefined, 'Base64 must not be stored');
    assert.equal(savedDoc.qrCode, undefined, 'QR code must not be stored');
    assert.equal(savedDoc.qrData, undefined, 'QR data must not be stored');
    assert.equal(savedDoc.verificationUrl, undefined, 'Verification URL must not be stored');

    // Document keys must be strictly minimal
    const docKeys = Object.keys(savedDoc);
    const expectedKeys = new Set([
      '_id',
      'title',
      'officialName',
      'email',
      'phone',
      'occupation',
      'organisation',
      'receiveCertificate',
      'pledgeNumber',
      'certificateStatus',
      'createdAt',
    ]);
    for (const key of docKeys) {
      assert.ok(expectedKeys.has(key), `Unexpected field '${key}' stored in MongoDB document`);
    }

    // Verify derived virtual certificateNumber on Mongoose document instance
    const mongooseDoc = await Pledge.findOne({ email: 'priya.sharma@example.com' });
    assert.equal(mongooseDoc.certificateNumber, `NF/CSP/${savedDoc.pledgeNumber}`);
  });
});
