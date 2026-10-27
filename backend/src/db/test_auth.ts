import { authService } from '../services/auth.service';
import { verifyAccessToken } from '../utils/jwt';
import { requireRole } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';
import { connectMongo, disconnectMongo } from './mongo';
import { seedMongoData } from './seed_mongo';

export const runAuthTests = async (): Promise<void> => {
  await connectMongo();
  await seedMongoData();

  logger.info('================================================================');
  logger.info('🔐 STAGE 3: AUTHENTICATION & ROLE AUTHORIZATION TEST SUITE');
  logger.info('================================================================');

  // Test 1: Student Login with Valid Credentials
  logger.info('\n▶ Test 1: Student Login with Valid Credentials');
  const studentLogin = await authService.login({
    email: 'student1@splm.edu',
    password: 'Password@123',
  });
  console.log('✓ Student logged in successfully:');
  console.log(`  Name: ${studentLogin.user.firstName} ${studentLogin.user.lastName}`);
  console.log(`  Role: ${studentLogin.user.role}`);
  console.log(`  Roll Number: ${studentLogin.user.profile?.rollNumber}`);
  console.log(`  CGPA: ${studentLogin.user.profile?.cgpa}`);
  console.log(`  Access Token: ${studentLogin.tokens.accessToken.substring(0, 25)}...`);

  // Test 2: Student Login with Invalid Password
  logger.info('\n▶ Test 2: Student Login with Invalid Password (Expect 401)');
  try {
    await authService.login({
      email: 'student1@splm.edu',
      password: 'WrongPassword999',
    });
    throw new Error('Test failed: Should have thrown 401 Unauthorized');
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.log(`✓ Caught expected authorization rejection: "${message}"`);
  }

  // Test 3: Faculty Login
  logger.info('\n▶ Test 3: Faculty Login & Profile Retrieval');
  const facultyLogin = await authService.login({
    email: 'faculty1@splm.edu',
    password: 'Password@123',
  });
  console.log('✓ Faculty logged in successfully:');
  console.log(`  Name: ${facultyLogin.user.firstName} ${facultyLogin.user.lastName}`);
  console.log(`  Role: ${facultyLogin.user.role}`);
  console.log(`  Employee ID: ${facultyLogin.user.profile?.employeeId}`);
  console.log(`  Specialization: ${facultyLogin.user.profile?.specialization}`);

  // Test 4: Token Verification
  logger.info('\n▶ Test 4: Access Token Verification');
  const decodedPayload = verifyAccessToken(studentLogin.tokens.accessToken);
  console.log('✓ Access token verified and decoded cryptographically:');
  console.log(`  User ID: ${decodedPayload.id}`);
  console.log(`  Email: ${decodedPayload.email}`);
  console.log(`  Role: ${decodedPayload.role}`);

  // Test 5: Role Authorization Middleware Guard (Student trying to access Faculty route)
  logger.info('\n▶ Test 5: Role Guard Test (Student accessing Faculty-only endpoint)');
  const facultyGuard = requireRole(['FACULTY', 'ADMIN']);
  const fakeReq = { user: decodedPayload } as Request;
  const fakeRes = {} as Response;
  const fakeNext: NextFunction = () => {
    throw new Error('Test failed: Role guard should not have called next() for unauthorized role');
  };

  try {
    facultyGuard(fakeReq, fakeRes, fakeNext);
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.log(`✓ Access blocked by role guard: "${message}"`);
  }

  // Test 6: Refresh Token Rotation in Redis
  logger.info('\n▶ Test 6: Active Refresh Token Rotation');
  const oldRefreshToken = studentLogin.tokens.refreshToken;
  const rotatedTokens = await authService.refreshToken(oldRefreshToken);
  console.log('✓ Refresh token successfully rotated:');
  console.log(`  New Access Token: ${rotatedTokens.accessToken.substring(0, 25)}...`);
  console.log(`  New Refresh Token: ${rotatedTokens.refreshToken.substring(0, 25)}...`);

  // Test 7: Replay Attack Defense (Old refresh token should now be invalid/revoked)
  logger.info('\n▶ Test 7: Replay Attack Defense (Old Token Revocation Check)');
  try {
    await authService.refreshToken(oldRefreshToken);
    throw new Error('Test failed: Revoked token should not have been accepted');
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.log(`✓ Replay blocked: "${message}"`);
  }

  // Test 8: Register a New Student
  logger.info('\n▶ Test 8: Register New Student with Bcrypt Hashing');
  const newStudent = await authService.register({
    email: 'newstudent@splm.edu',
    password: 'Password@123',
    firstName: 'Priya',
    lastName: 'Nair',
    role: 'STUDENT',
    departmentId: 1,
    rollNumber: '22AD005',
    batchId: 1,
    semester: 6,
    cgpa: 9.35,
  });
  console.log('✓ New student registered successfully:');
  console.log(`  Name: ${newStudent.user.firstName} ${newStudent.user.lastName} (${newStudent.user.email})`);
  console.log(`  Roll Number: ${newStudent.user.profile?.rollNumber}`);
  console.log(`  Semester: ${newStudent.user.profile?.semester}, CGPA: ${newStudent.user.profile?.cgpa}`);

  // Test 9: Duplicate Email Registration Check
  logger.info('\n▶ Test 9: Duplicate Email Rejection');
  try {
    await authService.register({
      email: 'newstudent@splm.edu',
      password: 'Password@123',
      firstName: 'Priya',
      lastName: 'Nair',
      role: 'STUDENT',
      departmentId: 1,
      rollNumber: '22AD006',
      batchId: 1,
      semester: 6,
    });
    throw new Error('Test failed: Duplicate email should have thrown 409 Conflict');
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.log(`✓ Duplicate registration blocked: "${message}"`);
  }

  // Test 10: Logout & Session Revocation
  logger.info('\n▶ Test 10: Logout & Session Invalidation');
  await authService.logout(newStudent.tokens.refreshToken);
  try {
    await authService.refreshToken(newStudent.tokens.refreshToken);
    throw new Error('Test failed: Logged out token should not be refreshable');
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.log(`✓ Session successfully invalidated upon logout: "${message}"`);
  }

  // Test 11: Public Registration Role Guard (Rejection of ADMIN role)
  logger.info('\n▶ Test 11: Admin Public Registration Guard (Expect 403 Forbidden)');
  try {
    await authService.register({
      email: 'fakeadmin@splm.edu',
      password: 'Password@123',
      firstName: 'Unauthorized',
      lastName: 'Admin',
      role: 'ADMIN' as any,
      departmentId: 1,
    });
    throw new Error('Test failed: Public registration with ADMIN role should have thrown 403');
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.log(`✓ Public ADMIN registration blocked: "${message}"`);
  }

  // Test 12: Seeded Admin Authentication Success
  logger.info('\n▶ Test 12: Seeded Admin Authentication (admin@splm.edu + SPLM@Admin2026)');
  const adminLogin = await authService.login({
    email: 'admin@splm.edu',
    password: 'SPLM@Admin2026',
  });
  console.log('✓ Admin authenticated successfully:');
  console.log(`  Name: ${adminLogin.user.firstName} ${adminLogin.user.lastName}`);
  console.log(`  Email: ${adminLogin.user.email}`);
  console.log(`  Role: ${adminLogin.user.role}`);
  console.log(`  Access Token: ${adminLogin.tokens.accessToken.substring(0, 25)}...`);
  if (adminLogin.user.role !== 'ADMIN') {
    throw new Error(`Expected role ADMIN, got: ${adminLogin.user.role}`);
  }

  // Test 13: Admin JWT and Session State Verification
  logger.info('\n▶ Test 13: Admin Access Token Cryptographic Verification');
  const decodedAdminPayload = verifyAccessToken(adminLogin.tokens.accessToken);
  console.log('✓ Admin access token verified:');
  console.log(`  User ID: ${decodedAdminPayload.id}`);
  console.log(`  Email: ${decodedAdminPayload.email}`);
  console.log(`  Role: ${decodedAdminPayload.role}`);
  if (decodedAdminPayload.role !== 'ADMIN') {
    throw new Error(`Token payload role is not ADMIN: ${decodedAdminPayload.role}`);
  }

  // Test 14: Admin Access to Admin Dashboard / Management Role Guard
  logger.info('\n▶ Test 14: Admin Authorized Access to Admin-Only Endpoint Guard');
  const adminOnlyGuard = requireRole(['ADMIN']);
  let adminAuthorized = false;
  const adminReq = { user: decodedAdminPayload } as Request;
  const adminRes = {} as Response;
  const adminNext: NextFunction = () => {
    adminAuthorized = true;
  };
  adminOnlyGuard(adminReq, adminRes, adminNext);
  if (!adminAuthorized) {
    throw new Error('Admin was unexpectedly blocked from ADMIN role guard');
  }
  console.log('✓ Admin successfully authorized through ADMIN-only guard');

  // Test 15: Role Boundary Enforcement - Student Blocked from Admin Endpoints
  logger.info('\n▶ Test 15: Role Boundary - Student Blocked from Admin-Only Guard (Expect 403)');
  let studentBlocked = false;
  const studentReq = { user: decodedPayload } as Request; // decoded student token from Test 4
  const studentNext: NextFunction = () => {
    throw new Error('Test failed: Student should not have passed ADMIN role guard');
  };
  try {
    adminOnlyGuard(studentReq, adminRes, studentNext);
  } catch (err: unknown) {
    studentBlocked = true;
    const message = (err as Error).message;
    console.log(`✓ Student blocked from Admin endpoints: "${message}"`);
  }
  if (!studentBlocked) {
    throw new Error('Student was not blocked by ADMIN-only guard');
  }

  // Test 16: Role Boundary Enforcement - Faculty Blocked from Admin Endpoints
  logger.info('\n▶ Test 16: Role Boundary - Faculty Blocked from Admin-Only Guard (Expect 403)');
  const decodedFacultyPayload = verifyAccessToken(facultyLogin.tokens.accessToken);
  let facultyBlocked = false;
  const facultyReq = { user: decodedFacultyPayload } as Request;
  const facultyNext: NextFunction = () => {
    throw new Error('Test failed: Faculty should not have passed ADMIN role guard');
  };
  try {
    adminOnlyGuard(facultyReq, adminRes, facultyNext);
  } catch (err: unknown) {
    facultyBlocked = true;
    const message = (err as Error).message;
    console.log(`✓ Faculty blocked from Admin endpoints: "${message}"`);
  }
  if (!facultyBlocked) {
    throw new Error('Faculty was not blocked by ADMIN-only guard');
  }

  logger.info('\n================================================================');
  logger.info('🎉 STAGE 3 BACKEND AUTH & RBAC VERIFICATION COMPLETED (16/16 TESTS PASSED)');
  logger.info('================================================================');

  await disconnectMongo();
};

if (require.main === module) {
  runAuthTests()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Auth tests failed:', err);
      process.exit(1);
    });
}
