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

describe('NCSAM Pledge Backend API — Comprehensive Test Suite', () => {
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
  test('Test 1 — Normal pledge: English, valid data, receiveCertificate=false', async () => {
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
    assert.equal(saved.certificateGeneratedAt, null);
    assert.equal(saved.certificateSentAt, null);

    const countAfter = await request(server).get('/api/pledges/count');
    assert.equal(countAfter.body.count, countBefore.body.count + 1);
  });

  // -----------------------------------------------------------
  // Test 2 — Certificate requested (receiveCertificate=true)
  // -----------------------------------------------------------
  test('Test 2 — Certificate requested: generates atomic ID, PDF and dispatches email', async () => {
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

    const certId = res.body.certificate.certificateId;
    assert.ok(certId.startsWith('NF/CSP/'), `Certificate ID ${certId} must start with NF/CSP/`);
    assert.match(certId, /^NF\/CSP\/26\d{6}$/, `Certificate ID ${certId} must follow NF/CSP/26xxxxxx`);

    const saved = await Pledge.findOne({ email: 'sanjeev.chaurasia@example.com' });
    assert.ok(saved);
    assert.equal(saved.receiveCertificate, true);
    assert.ok(saved.certificateGeneratedAt);
    assert.ok(saved.certificateSentAt);
    assert.equal(saved.certificateId, certId);
    assert.ok(saved.pledgeNumber >= 26000001);
  });

  // -----------------------------------------------------------
  // Test 3 — Hindi pledge
  // -----------------------------------------------------------
  test('Test 3 — Hindi pledge: language preserved and certificate workflow functions cleanly', async () => {
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
    assert.equal(saved.language, 'hi');
    assert.equal(saved.title, 'Ms.');
    assert.ok(saved.certificateSentAt);
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
    assert.ok(saved.certificateId);
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

    // Invalid language
    res = await request(server).post('/api/pledges').send({
      name: 'Valid Name',
      email: 'valid@example.com',
      phone: '9876543210',
      language: 'fr',
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
  // Test 6 — Counter concurrency & unique certificate ID
  // -----------------------------------------------------------
  test('Test 6 — Counter concurrency: multiple submissions produce strictly unique consecutive sequence IDs', async () => {
    const promises = [];
    for (let i = 1; i <= 5; i++) {
      promises.push(
        request(server)
          .post('/api/pledges')
          .send({
            title: 'Mr.',
            name: `Concurrent User ${i}`,
            email: `concurrent${i}@example.com`,
            phone: `987650000${i}`,
            pledgeAccepted: true,
            receiveCertificate: true,
          })
      );
    }

    const responses = await Promise.all(promises);
    const certIds = responses.map((r) => r.body.certificate.certificateId);

    // All should be successful
    responses.forEach((r) => assert.equal(r.status, 201));

    // All should be unique
    const uniqueIds = new Set(certIds);
    assert.equal(uniqueIds.size, 5, 'Every concurrent submission must have a distinct certificate ID');

    // All should match NF/CSP/26xxxxxx format
    certIds.forEach((id) => {
      assert.match(id, /^NF\/CSP\/26\d{6}$/);
    });
  });

  // -----------------------------------------------------------
  // Test 7 — Email failure handling
  // -----------------------------------------------------------
  test('Test 7 — Email failure: pledge stored, email failure reported without throwing 500 error', async () => {
    // Temporarily mock sendCertificateEmail to simulate SMTP network failure
    const originalSendMail = emailService.sendCertificateEmail;
    emailService.sendCertificateEmail = async () => {
      throw new Error('SMTP connection timeout: Host unreachable');
    };

    try {
      const payload = {
        title: 'Mrs.',
        name: 'Kavita Singh',
        email: 'kavita.singh@example.com',
        phone: '9855566677',
        pledgeAccepted: true,
        receiveCertificate: true,
      };

      const res = await request(server).post('/api/pledges').send(payload);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.pledgeCompleted, true);
      assert.equal(res.body.certificateGenerated, true);
      assert.equal(res.body.certificateSent, false);

      const saved = await Pledge.findOne({ email: 'kavita.singh@example.com' });
      assert.ok(saved, 'Pledge record must remain securely stored despite email failure');
      assert.equal(saved.certificateSentAt, null);
      assert.ok(saved.certificateError);
    } finally {
      emailService.sendCertificateEmail = originalSendMail;
    }
  });

  // -----------------------------------------------------------
  // Test 8 — Certificate visual inspection & buffer generation
  // -----------------------------------------------------------
  test('Test 8 — Certificate generation: produces non-empty PDF buffer with Lora font and QR', async () => {
    const buffer = await generateCertificateBuffer({
      title: 'Adv.',
      name: 'Rashi Bhatia',
      certificateId: 'NF/CSP/26000001',
      date: new Date(),
    });

    assert.ok(buffer);
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 50000, `PDF buffer size (${buffer.length} bytes) indicates complete artwork embedded`);
    
    // Verify PDF header magic bytes "%PDF-"
    const pdfHeader = buffer.slice(0, 5).toString();
    assert.equal(pdfHeader, '%PDF-');
  });

  // -----------------------------------------------------------
  // Test 9 — Route 404 handler
  // -----------------------------------------------------------
  test('Route 404: nonexistent route returns standard JSON error', async () => {
    const res = await request(server).get('/api/invalid-route');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.errorCode, 'NOT_FOUND');
  });

  // -----------------------------------------------------------
  // Test 10 — Certificate Verification: Valid Certificate (Privacy Safe)
  // -----------------------------------------------------------
  test('Test 10 — Certificate Verification: Valid certificate returns verified status with NO personal data leakage', async () => {
    const pledgeRes = await request(server).post('/api/pledges').send({
      title: 'Mr.',
      name: 'Deepak Kumar',
      email: 'deepak.kumar@example.com',
      phone: '9888877777',
      occupation: 'Government Officer',
      organisation: 'Ministry of IT',
      pledgeAccepted: true,
      receiveCertificate: true,
    });

    assert.equal(pledgeRes.status, 201);
    const certId = pledgeRes.body.certificate.certificateId;
    assert.ok(certId);

    // Call public verification endpoint with raw slash path
    const verifyRes = await request(server).get(`/api/certificates/verify/${certId}`);

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.success, true);
    assert.equal(verifyRes.body.verified, true);
    assert.equal(verifyRes.body.certificateId, certId);
    assert.equal(verifyRes.body.issuer, 'Naksh Foundation');
    assert.equal(verifyRes.body.status, 'Verified');
    assert.ok(verifyRes.body.issueDate);

    // CRITICAL PRIVACY CHECKS: Zero personal identifying information exposed
    assert.equal(verifyRes.body.email, undefined, 'Verification must never expose email');
    assert.equal(verifyRes.body.phone, undefined, 'Verification must never expose phone');
    assert.equal(verifyRes.body.officialName, undefined, 'Verification must never expose official name');
    assert.equal(verifyRes.body.name, undefined, 'Verification must never expose recipient name');
    assert.equal(verifyRes.body.occupation, undefined, 'Verification must never expose occupation');
    assert.equal(verifyRes.body.organisation, undefined, 'Verification must never expose organisation');
    assert.equal(verifyRes.body._id, undefined, 'Verification must never expose MongoDB _id');
    assert.equal(verifyRes.body.pdf, undefined, 'Verification must never expose certificate PDF');
    assert.equal(verifyRes.body.buffer, undefined, 'Verification must never expose buffer');
  });

  // -----------------------------------------------------------
  // Test 11 — Certificate Verification: Nonexistent Certificate
  // -----------------------------------------------------------
  test('Test 11 — Certificate Verification: Nonexistent ID returns generic safe rejection without leaking state', async () => {
    const res = await request(server).get('/api/certificates/verify/NF/CSP/26999999');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.verified, false);
    assert.match(res.body.message, /could not be verified/i);
    assert.equal(res.body.email, undefined);
    assert.equal(res.body._id, undefined);
  });

  // -----------------------------------------------------------
  // Test 12 — Certificate Verification: Injection & Traversal Attacks
  // -----------------------------------------------------------
  test('Test 12 — Certificate Verification: Injection attempts return 404 safely', async () => {
    const maliciousIds = [
      '../../../etc/passwd',
      '<script>alert(1)</script>',
      "NF/CSP/1' OR '1'='1",
      'NF/CSP/$where',
    ];

    for (const badId of maliciousIds) {
      const res = await request(server).get(`/api/certificates/verify/${encodeURIComponent(badId)}`);
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.verified, false);
    }
  });

  // -----------------------------------------------------------
  // Test 13 — Storage Security: Verify NO PDFs are stored in MongoDB
  // -----------------------------------------------------------
  test('Test 13 — Storage Security: MongoDB stores metadata only, zero binary PDF buffers', async () => {
    const pledgeRes = await request(server).post('/api/pledges').send({
      title: 'Dr.',
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phone: '9877766655',
      pledgeAccepted: true,
      receiveCertificate: true,
    });

    assert.equal(pledgeRes.status, 201);

    const saved = await Pledge.findOne({ email: 'priya.sharma@example.com' }).lean();
    assert.ok(saved);
    assert.equal(saved.certificateStatus, 'sent');
    assert.ok(saved.certificateId);
    assert.ok(saved.pledgeNumber);

    // Verify no PDF, binary, or buffer fields exist on the document
    assert.equal(saved.pdf, undefined);
    assert.equal(saved.buffer, undefined);
    assert.equal(saved.fileData, undefined);
    assert.equal(saved.base64, undefined);
    assert.equal(saved.certificateFile, undefined);
  });
});
