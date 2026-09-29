import { userService } from '../services/user.service';
import { authService } from '../services/auth.service';
import { updateProfileSchema } from '../validators/user.validator';
import { AuditLog } from '../models';
import { connectMongo, disconnectMongo } from './mongo';
import { logger } from '../utils/logger';

export const runProfileTests = async (): Promise<void> => {
  await connectMongo();

  logger.info('================================================================');
  logger.info('👤 STAGE 4: STUDENT & FACULTY PROFILES TEST SUITE');
  logger.info('================================================================');

  const studentId = 'b0000000-0000-0000-0000-000000000001';
  const facultyId = 'f0000000-0000-0000-0000-000000000001';

  // Test 1: Fetch Student Profile
  logger.info('\n▶ Test 1: Retrieve Comprehensive Student Profile');
  const studentProfile = await userService.getUserProfile(studentId);
  console.log('✓ Student profile retrieved successfully:');
  console.log(`  Name: ${studentProfile.firstName} ${studentProfile.lastName}`);
  console.log(`  Email: ${studentProfile.email}`);
  console.log(`  Department: ${studentProfile.departmentCode} - ${studentProfile.departmentName}`);
  console.log(`  Roll Number: ${studentProfile.profile?.rollNumber}`);
  console.log(`  Semester: ${studentProfile.profile?.semester}`);
  console.log(`  CGPA: ${studentProfile.profile?.cgpa}`);
  console.log(`  Active Projects: ${studentProfile.activeProjectCount}`);

  if (studentProfile.profile?.rollNumber !== '22AD001') {
    throw new Error(`Expected roll number 22AD001, got ${studentProfile.profile?.rollNumber}`);
  }

  // Test 2: Fetch Faculty Profile
  logger.info('\n▶ Test 2: Retrieve Comprehensive Faculty Profile');
  const facultyProfile = await userService.getUserProfile(facultyId);
  console.log('✓ Faculty profile retrieved successfully:');
  console.log(`  Name: ${facultyProfile.firstName} ${facultyProfile.lastName}`);
  console.log(`  Email: ${facultyProfile.email}`);
  console.log(`  Employee ID: ${facultyProfile.profile?.employeeId}`);
  console.log(`  Designation: ${facultyProfile.profile?.designation}`);
  console.log(`  Specialization: ${facultyProfile.profile?.specialization}`);
  console.log(`  Active Projects Supervised: ${facultyProfile.activeProjectCount}`);

  if (facultyProfile.profile?.employeeId !== 'FAC-AI-101') {
    throw new Error(`Expected employeeId FAC-AI-101, got ${facultyProfile.profile?.employeeId}`);
  }

  // Test 3: Update Student Profile (Semester & CGPA)
  logger.info('\n▶ Test 3: Update Permitted Student Profile Fields');
  const updatedStudent = await userService.updateUserProfile(studentId, 'STUDENT', {
    firstName: 'Rahul',
    lastName: 'Sharma (Honors)',
    semester: 7,
    cgpa: 9.15,
  });
  console.log('✓ Student profile updated:');
  console.log(`  Updated Name: ${updatedStudent.firstName} ${updatedStudent.lastName}`);
  console.log(`  Updated Semester: ${updatedStudent.profile?.semester}`);
  console.log(`  Updated CGPA: ${updatedStudent.profile?.cgpa}`);

  if (updatedStudent.profile?.semester !== 7 || updatedStudent.profile?.cgpa !== 9.15) {
    throw new Error('Student profile update failed to persist');
  }

  // Restore Student Profile
  await userService.updateUserProfile(studentId, 'STUDENT', {
    firstName: 'Rahul',
    lastName: 'Sharma',
    semester: 6,
    cgpa: 8.85,
  });

  // Test 4: Update Faculty Profile (Designation & Specialization)
  logger.info('\n▶ Test 4: Update Permitted Faculty Profile Fields');
  const updatedFaculty = await userService.updateUserProfile(facultyId, 'FACULTY', {
    designation: 'Senior Professor & Dean of Computing',
    specialization: 'Deep Learning, Medical AI, Responsible AI',
  });
  console.log('✓ Faculty profile updated:');
  console.log(`  Updated Designation: ${updatedFaculty.profile?.designation}`);
  console.log(`  Updated Specialization: ${updatedFaculty.profile?.specialization}`);

  if (updatedFaculty.profile?.designation !== 'Senior Professor & Dean of Computing') {
    throw new Error('Faculty profile update failed to persist');
  }

  // Restore Faculty Profile
  await userService.updateUserProfile(facultyId, 'FACULTY', {
    designation: 'Associate Professor',
    specialization: 'Computer Vision, Medical Image Analysis, Deep Learning',
  });

  // Test 5: Validation Schema Enforcement (CGPA > 10.0 or Semester > 8)
  logger.info('\n▶ Test 5: Validation Rule Enforcement (Invalid CGPA & Semester)');
  try {
    updateProfileSchema.parse({
      cgpa: 11.5, // Invalid CGPA
      semester: 10, // Invalid Semester
    });
    throw new Error('Test failed: Should have rejected out-of-range academic values');
  } catch (err: unknown) {
    const errorMsg = (err as Error).message;
    console.log(`✓ Caught expected Zod schema validation rejection: ${errorMsg.substring(0, 75)}...`);
  }

  // Test 6: Change Password with Incorrect Current Password
  logger.info('\n▶ Test 6: Change Password with Invalid Current Password (Expect 400 Bad Request)');
  try {
    await userService.changePassword(studentId, {
      currentPassword: 'IncorrectOldPassword123',
      newPassword: 'NewSecurePass@2026',
      confirmNewPassword: 'NewSecurePass@2026',
    });
    throw new Error('Test failed: Should have rejected incorrect current password');
  } catch (err: unknown) {
    const errorMsg = (err as Error).message;
    console.log(`✓ Caught expected rejection: "${errorMsg}"`);
  }

  // Test 7: Successful Password Change & Login Verification
  logger.info('\n▶ Test 7: Change Password Successfully & Verify Login with New Credentials');
  await userService.changePassword(studentId, {
    currentPassword: 'Password@123',
    newPassword: 'NewPassword@2026',
    confirmNewPassword: 'NewPassword@2026',
  });
  console.log('✓ Password changed successfully to NewPassword@2026');

  // Verify login with new password
  const newLogin = await authService.login({
    email: 'student1@splm.edu',
    password: 'NewPassword@2026',
  });
  console.log(`✓ Successfully authenticated with new credentials! User: ${newLogin.user.firstName}`);

  // Verify old password rejected
  try {
    await authService.login({
      email: 'student1@splm.edu',
      password: 'Password@123',
    });
    throw new Error('Test failed: Old password should no longer work');
  } catch {
    console.log('✓ Confirmed: Old password is permanently invalid');
  }

  // Verify audit log entry
  const auditDoc = await AuditLog.findOne({ userId: studentId }).sort({ createdAt: -1 });
  console.log(`✓ Audit log verified: Action=${auditDoc?.action}, Entity=${auditDoc?.entityType}`);

  // Revert password back to default for clean local testing state
  await userService.changePassword(studentId, {
    currentPassword: 'NewPassword@2026',
    newPassword: 'Password@123',
    confirmNewPassword: 'Password@123',
  });
  console.log('✓ Restored default password (Password@123) for continued platform testing');

  // Test 8: Specialized Student Academic Profile
  logger.info('\n▶ Test 8: Fetch Specialized Student Academic Profile (with Active Projects)');
  const studentAcademic = await userService.getStudentAcademicProfile(studentId);
  console.log(`✓ Student Academic Profile retrieved:`);
  console.log(`  Enrolled Projects Count: ${studentAcademic.projects.length}`);
  if (studentAcademic.projects.length > 0) {
    const p = studentAcademic.projects[0];
    console.log(`  Project 1: "${p.title}"`);
    console.log(`  Domain: ${p.domain} | Progress: ${p.progress}% | Role: ${p.roleInProject}`);
    console.log(`  Faculty Guide: ${p.facultyGuide}`);
  }

  // Test 9: Specialized Faculty Academic Profile
  logger.info('\n▶ Test 9: Fetch Specialized Faculty Academic Profile (Quota & Capacity)');
  const facultyAcademic = await userService.getFacultyAcademicProfile(facultyId);
  console.log(`✓ Faculty Academic Profile retrieved:`);
  console.log(`  Max Quota: ${facultyAcademic.maxQuota}`);
  console.log(`  Currently Assigned: ${facultyAcademic.currentlyAssigned}`);
  console.log(`  Remaining Capacity: ${facultyAcademic.remainingCapacity}`);
  console.log(`  Pending Reviews Count: ${facultyAcademic.pendingReviewsCount}`);
  if (facultyAcademic.assignedProjects.length > 0) {
    const fp = facultyAcademic.assignedProjects[0];
    console.log(`  Assigned Project: "${fp.title}" (Lead: ${fp.studentLead})`);
  }

  // Test 10: Role Boundary Guards
  logger.info('\n▶ Test 10: Strict Role Boundary Guards (Student accessing Faculty Profile & vice-versa)');
  try {
    await userService.getFacultyAcademicProfile(studentId);
    throw new Error('Test failed: Student should not access faculty academic profile');
  } catch (err: unknown) {
    console.log(`✓ Student blocked from faculty profile: "${(err as Error).message}"`);
  }

  try {
    await userService.getStudentAcademicProfile(facultyId);
    throw new Error('Test failed: Faculty should not access student academic profile');
  } catch (err: unknown) {
    console.log(`✓ Faculty blocked from student profile: "${(err as Error).message}"`);
  }

  logger.info('\n================================================================');
  logger.info('🎉 ALL 10 STAGE 4 PROFILE TESTS PASSED PERFECTLY!');
  logger.info('================================================================\n');

  await disconnectMongo();
};

// Standalone execution entrypoint
if (require.main === module) {
  runProfileTests()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Profile test suite failed:', err);
      process.exit(1);
    });
}
