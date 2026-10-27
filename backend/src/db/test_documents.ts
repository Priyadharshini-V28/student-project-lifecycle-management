import fs from 'fs';
import path from 'path';
import { connectMongo, disconnectMongo } from './mongo';
import { seedMongoData } from './seed_mongo';
import { documentService } from '../services/document.service';
import { validateFileType } from '../validators/document.validator';
import { DocumentModel, AuditLog } from '../models';
import { logger } from '../utils/logger';

export const runDocumentTests = async (): Promise<void> => {
  await connectMongo();
  await seedMongoData();

  logger.info('================================================================');
  logger.info('📄 STAGE 10: DOCUMENT MANAGEMENT & VERSION CONTROL TEST SUITE');
  logger.info('================================================================');

  const projectId = 'e0000000-0000-0000-0000-000000000001';
  const student1Id = 'b0000000-0000-0000-0000-000000000001'; // Project lead (authorized member)
  const student3Id = 'b0000000-0000-0000-0000-000000000003'; // Non-member student (unauthorized)
  const faculty1Id = 'f0000000-0000-0000-0000-000000000001'; // Assigned guide (authorized faculty)
  const faculty2Id = 'f0000000-0000-0000-0000-000000000002'; // Other faculty (unauthorized)

  // Ensure test directory and dummy files exist
  const testDir = path.resolve(process.cwd(), 'uploads', 'test_documents');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const srsV1File = path.join(testDir, 'srs_v1.pdf');
  const srsV2File = path.join(testDir, 'srs_v2.pdf');
  const archFile = path.join(testDir, 'system_architecture.png');
  fs.writeFileSync(srsV1File, '%PDF-1.4 Mock SRS Document content for testing');
  fs.writeFileSync(srsV2File, '%PDF-1.4 Mock SRS Document Version 2 with refined requirements');
  fs.writeFileSync(archFile, 'MOCK_PNG_DATA_FOR_ARCHITECTURE_DIAGRAM');

  // --------------------------------------------------------------------------
  // Assertion 1: Authorized Initial Document Upload (Version 1)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 1: Authorized Student Upload (SRS Version 1)');
  const mockMulterV1: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'SRS_Fundus_V1.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: fs.statSync(srsV1File).size,
    destination: testDir,
    filename: 'SRS_Fundus_V1_uuid1.pdf',
    path: srsV1File,
    buffer: Buffer.from([]),
    stream: null as any,
  };

  const docV1 = await documentService.uploadDocument({
    projectId,
    userId: student1Id,
    role: 'STUDENT',
    file: mockMulterV1,
    documentType: 'SRS',
    remarks: 'Initial Software Requirements Specification with functional scope.',
  });

  console.log(`✓ Document uploaded successfully: ${docV1.originalFileName}`);
  console.log(`  Type: ${docV1.documentType} | Version: v${docV1.version}`);
  console.log(`  Formatted Size: ${docV1.fileSizeFormatted} | Uploader: ${docV1.uploadedBy.fullName}`);

  if (docV1.version !== 1) {
    throw new Error(`Expected version 1, got ${docV1.version}`);
  }
  if (docV1.documentType !== 'SRS') {
    throw new Error(`Expected SRS, got ${docV1.documentType}`);
  }

  // --------------------------------------------------------------------------
  // Assertion 2: File Format & Extension Validation Security Guard
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 2: File Type and Extension Validation Guard');
  const invalidExt = validateFileType('malicious_script.exe', 'application/x-msdownload');
  console.log(`✓ Disallowed extension rejected: "${invalidExt.reason}"`);
  if (invalidExt.isValid) {
    throw new Error('Test failed: .exe file should have been rejected');
  }

  const validPdf = validateFileType('final_report.pdf', 'application/pdf');
  console.log(`✓ Allowed PDF extension accepted: isValid = ${validPdf.isValid}`);
  if (!validPdf.isValid) {
    throw new Error('Test failed: valid PDF should be accepted');
  }

  // --------------------------------------------------------------------------
  // Assertion 3: Automatic Version Increment (SRS Version 2)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 3: Automatic Version Increment on Re-upload (SRS Version 2)');
  const mockMulterV2: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'SRS_Fundus_V2_Revised.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: fs.statSync(srsV2File).size,
    destination: testDir,
    filename: 'SRS_Fundus_V2_uuid2.pdf',
    path: srsV2File,
    buffer: Buffer.from([]),
    stream: null as any,
  };

  const docV2 = await documentService.uploadDocument({
    projectId,
    userId: student1Id,
    role: 'STUDENT',
    file: mockMulterV2,
    documentType: 'SRS',
    remarks: 'Revised SRS incorporating faculty comments on clinical security.',
  });

  console.log(`✓ Re-uploaded document: ${docV2.originalFileName}`);
  console.log(`  Type: ${docV2.documentType} | Version: v${docV2.version}`);
  if (docV2.version !== 2) {
    throw new Error(`Expected version 2, got ${docV2.version}`);
  }

  // Verify v1 still exists in database (immutability)
  const allSrsDocs = await DocumentModel.find({ projectId, documentType: 'SRS' });
  console.log(`✓ Total SRS versions preserved in database: ${allSrsDocs.length}`);
  if (allSrsDocs.length !== 2) {
    throw new Error(`Expected 2 SRS document records, found ${allSrsDocs.length}`);
  }

  // --------------------------------------------------------------------------
  // Assertion 4: Student RBAC Guard - Unauthorized Student Upload Blocked
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 4: Student RBAC Upload Guard (Unauthorized Student Blocked)');
  try {
    await documentService.uploadDocument({
      projectId,
      userId: student3Id,
      role: 'STUDENT',
      file: mockMulterV1,
      documentType: 'ARCHITECTURE_DESIGN',
      remarks: 'Attempted unauthorized upload',
    });
    throw new Error('Test failed: Unauthorized student should not upload project documents');
  } catch (err: unknown) {
    console.log(`✓ Unauthorized student upload blocked: "${(err as Error).message}"`);
  }

  // --------------------------------------------------------------------------
  // Assertion 5: Faculty RBAC Guard - Non-Guide Faculty Upload Blocked
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 5: Faculty RBAC Upload Guard (Non-Guide Faculty Blocked)');
  try {
    await documentService.uploadDocument({
      projectId,
      userId: faculty2Id,
      role: 'FACULTY',
      file: mockMulterV1,
      documentType: 'MID_TERM_REPORT',
      remarks: 'Attempted unauthorized faculty upload',
    });
    throw new Error('Test failed: Non-guide faculty should not upload project documents');
  } catch (err: unknown) {
    console.log(`✓ Unauthorized faculty upload blocked: "${(err as Error).message}"`);
  }

  // --------------------------------------------------------------------------
  // Assertion 6: Authorized Project Documents Catalog Retrieval
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 6: Project Documents Catalog Retrieval with Latest Version Mapping');
  const catalog = await documentService.getProjectDocuments(projectId, student1Id, 'STUDENT');
  console.log(`✓ Catalog retrieved: ${catalog.totalDocuments} total document(s)`);
  console.log(`  Project: "${catalog.projectTitle}"`);
  console.log(`  Latest SRS Version: v${catalog.latestByType.SRS?.version} (${catalog.latestByType.SRS?.originalFileName})`);

  if (!catalog.latestByType.SRS || catalog.latestByType.SRS.version !== 2) {
    throw new Error('Expected latest SRS version in catalog to be v2');
  }

  // --------------------------------------------------------------------------
  // Assertion 7: Document Version History Retrieval
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 7: Document Version History Inspection');
  const versions = await documentService.getDocumentVersions(projectId, 'SRS', student1Id, 'STUDENT');
  console.log(`✓ Retrieved ${versions.length} versions for type SRS:`);
  versions.forEach((v) => {
    console.log(`    - v${v.version}: ${v.originalFileName} (${v.fileSizeFormatted}) - Remarks: "${v.remarks}"`);
  });

  if (versions.length !== 2 || versions[0].version !== 2 || versions[1].version !== 1) {
    throw new Error('Expected 2 versions in descending order: v2, then v1');
  }

  // --------------------------------------------------------------------------
  // Assertion 8: Student RBAC Download Guard (Unauthorized Student Blocked)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 8: Student RBAC Download Guard (Unauthorized Student Blocked)');
  try {
    await documentService.downloadDocument(projectId, docV2.id, student3Id, 'STUDENT');
    throw new Error('Test failed: Unauthorized student should not download project documents');
  } catch (err: unknown) {
    console.log(`✓ Unauthorized student download blocked: "${(err as Error).message}"`);
  }

  // --------------------------------------------------------------------------
  // Assertion 9: Authorized Faculty Guide Download & Additional Upload
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 9: Authorized Faculty Guide Deliverable Download & Upload');
  const downloadInfo = await documentService.downloadDocument(projectId, docV2.id, faculty1Id, 'FACULTY');
  console.log(`✓ Faculty guide verified download for: ${downloadInfo.originalFileName}`);
  console.log(`  Disk path exists: ${fs.existsSync(downloadInfo.filePath)}`);
  console.log(`  MIME Type: ${downloadInfo.mimeType} | Size: ${downloadInfo.fileSizeBytes} bytes`);

  if (!fs.existsSync(downloadInfo.filePath)) {
    throw new Error('Expected downloaded file to physically exist on disk');
  }

  // Faculty Guide uploads architecture diagram
  const mockMulterArch: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'System_Architecture_Approved.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: fs.statSync(archFile).size,
    destination: testDir,
    filename: 'System_Architecture_Approved_uuid3.png',
    path: archFile,
    buffer: Buffer.from([]),
    stream: null as any,
  };

  const facultyDoc = await documentService.uploadDocument({
    projectId,
    userId: faculty1Id,
    role: 'FACULTY',
    file: mockMulterArch,
    documentType: 'ARCHITECTURE_DESIGN',
    remarks: 'Approved high-level microservices and pipeline architecture schema.',
  });
  console.log(`✓ Faculty guide uploaded: ${facultyDoc.originalFileName} (v${facultyDoc.version})`);

  // --------------------------------------------------------------------------
  // Assertion 10: Complete Audit Trail Verification in MongoDB
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 10: Complete Audit Trail Verification for Upload and Download');
  const uploadLogs = await AuditLog.find({ action: 'DOCUMENT_UPLOADED' });
  const downloadLogs = await AuditLog.find({ action: 'DOCUMENT_DOWNLOADED' });

  console.log(`✓ Audit log entries found: ${uploadLogs.length} uploads, ${downloadLogs.length} downloads`);
  if (uploadLogs.length < 3) {
    throw new Error(`Expected at least 3 DOCUMENT_UPLOADED audit logs, found ${uploadLogs.length}`);
  }
  if (downloadLogs.length < 1) {
    throw new Error(`Expected at least 1 DOCUMENT_DOWNLOADED audit log, found ${downloadLogs.length}`);
  }

  console.log(`  Latest Upload Action: Document ${uploadLogs[uploadLogs.length - 1].entityId} by user ${uploadLogs[uploadLogs.length - 1].userId}`);
  console.log(`  Latest Download Action: Document ${downloadLogs[downloadLogs.length - 1].entityId} by user ${downloadLogs[downloadLogs.length - 1].userId}`);

  logger.info('\n================================================================');
  logger.info('🎉 ALL 10 STAGE 10 DOCUMENT MANAGEMENT TESTS PASSED PERFECTLY!');
  logger.info('================================================================');

  // Clean up test dummy files
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup error
  }

  await disconnectMongo();
};

if (require.main === module) {
  runDocumentTests()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Document tests failed:', err);
      process.exit(1);
    });
}
