import {
  SystemSetting,
  Department,
  AcademicBatch,
  User,
  Proposal,
  Project,
  Review,
  Domain,
  DocumentModel,
  AuditLog,
  Notification,
  Evaluation,
} from '../models';
import { logger } from '../utils/logger';

export const seedMongoData = async (): Promise<void> => {
  logger.info('🌱 Seeding MongoDB with complete academic dataset...');

  // Reset Documents, AuditLogs, Notifications, and Evaluations for fresh test run
  await DocumentModel.deleteMany({});
  await AuditLog.deleteMany({});
  await Notification.deleteMany({});
  await Evaluation.deleteMany({});

  // 1. System Settings
  await SystemSetting.deleteMany({});
  await SystemSetting.insertMany([
    { key: 'MAX_TEAM_SIZE', value: '4', description: 'Maximum allowed student members per project team' },
    { key: 'MIN_TEAM_SIZE', value: '1', description: 'Minimum student members required for project proposal' },
    { key: 'REVIEW_WEIGHT_TECH', value: '40', description: 'Technical progress score percentage weight in periodic reviews' },
    { key: 'REVIEW_WEIGHT_DOCS', value: '30', description: 'Documentation score percentage weight in periodic reviews' },
    { key: 'REVIEW_WEIGHT_PRES', value: '30', description: 'Presentation/Viva score percentage weight in periodic reviews' },
    { key: 'ALLOW_STUDENT_PROPOSALS', value: 'true', description: 'System-wide flag enabling new student proposal submissions' },
  ]);

  // 2. Departments
  await Department.deleteMany({});
  await Department.insertMany([
    { _id: 1, code: 'AIDS', name: 'Department of Artificial Intelligence & Data Science' },
    { _id: 2, code: 'CSE', name: 'Department of Computer Science & Engineering' },
    { _id: 3, code: 'ECE', name: 'Department of Electronics & Communication Engineering' },
  ]);

  // 3. Batches (Dynamic 5 Batches)
  await AcademicBatch.deleteMany({});
  await AcademicBatch.insertMany([
    { _id: 1, departmentId: 1, name: '2022-2026 Batch', startYear: 2022, endYear: 2026, isActive: true },
    { _id: 2, departmentId: 1, name: '2023-2027 Batch', startYear: 2023, endYear: 2027, isActive: true },
    { _id: 3, departmentId: 1, name: '2024-2028 Batch', startYear: 2024, endYear: 2028, isActive: true },
    { _id: 4, departmentId: 1, name: '2025-2029 Batch', startYear: 2025, endYear: 2029, isActive: true },
    { _id: 5, departmentId: 1, name: '2026-2030 Batch', startYear: 2026, endYear: 2030, isActive: true },
  ]);

  // 3.1 Project Domains (Dynamic Domains)
  await Domain.deleteMany({});
  await Domain.insertMany([
    { name: 'Artificial Intelligence & Healthcare', description: 'Deep learning for clinical imaging, diagnostics, and pathology detection.', departmentId: 1, isActive: true },
    { name: 'Natural Language Processing & LLMs', description: 'Transformer architectures, prompt engineering, RAG, and foundation models.', departmentId: 1, isActive: true },
    { name: 'Computer Vision & Medical Imaging', description: 'Image segmentation, object detection, Vision Transformers, and Grad-CAM.', departmentId: 1, isActive: true },
    { name: 'Distributed Machine Learning & Federated Learning', description: 'Privacy-preserving edge model training, differential privacy, and decentralized learning.', departmentId: 1, isActive: true },
    { name: 'Edge AI, Embedded Systems & IoT', description: 'Quantized neural networks on microcontrollers, edge accelerators, and sensor telemetry.', departmentId: 1, isActive: true },
    { name: 'Generative AI & Multimodal Systems', description: 'Diffusion models, vision-language alignment (CLIP), audio-visual generation.', departmentId: 1, isActive: true },
    { name: 'Cybersecurity & Threat Detection', description: 'Intrusion detection systems, adversarial robustness, and malware classification.', departmentId: 1, isActive: true },
    { name: 'Autonomous Robotics & Navigation', description: 'SLAM, reinforcement learning, obstacle avoidance, and robotic control.', departmentId: 1, isActive: true },
    { name: 'Blockchain & Decentralized Systems', description: 'Smart contracts, decentralized finance, ledger consensus, and identity protocols.', departmentId: 1, isActive: true },
    { name: 'FinTech & Quantitative Analytics', description: 'Algorithmic trading, credit risk models, fraud detection, and financial timeseries.', departmentId: 1, isActive: true },
    { name: 'Cloud Computing & Distributed Systems', description: 'Microservices orchestration, Kubernetes, high-concurrency event brokers.', departmentId: 1, isActive: true },
    { name: 'Internet of Medical Things (IoMT)', description: 'Wearable health telemetry, real-time vital monitoring, and HIPAA compliant streaming.', departmentId: 1, isActive: true },
  ]);

  // 4. Users (Password@123 hash for demo faculty & students, SPLM@Admin2026 for admin)
  const passwordHash = '$2a$10$imEZT27g5odn4W5j9Et/g.hqZhyjq/NskZHGAVMsJ4xZQEIm9lqdS'; // Password@123
  const adminPasswordHash = '$2a$10$0wTIyDg2ogAA2c5tobQkT.mQBjtGJms62HvxwaGMBDTUskIlByvUG'; // SPLM@Admin2026

  await User.deleteMany({});
  await User.insertMany([
    // Admin (Single Institutional Admin with SPLM@Admin2026)
    {
      _id: 'a0000000-0000-0000-0000-000000000001',
      email: 'admin@splm.edu',
      passwordHash: adminPasswordHash,
      firstName: 'Dr. Aruna',
      lastName: 'Devi',
      role: 'ADMIN',
      departmentId: 1,
      isActive: true,
    },
    // Faculty 1
    {
      _id: 'f0000000-0000-0000-0000-000000000001',
      email: 'faculty1@splm.edu',
      passwordHash,
      firstName: 'Dr. Rajesh',
      lastName: 'Kumar',
      role: 'FACULTY',
      departmentId: 1,
      isActive: true,
      facultyProfile: {
        employeeId: 'FAC-AI-101',
        designation: 'Associate Professor',
        specialization: 'Computer Vision, Medical Image Analysis, Deep Learning',
        maxProjects: 5,
      },
    },
    // Faculty 2
    {
      _id: 'f0000000-0000-0000-0000-000000000002',
      email: 'faculty2@splm.edu',
      passwordHash,
      firstName: 'Dr. Meenakshi',
      lastName: 'Sundaram',
      role: 'FACULTY',
      departmentId: 1,
      isActive: true,
      facultyProfile: {
        employeeId: 'FAC-AI-102',
        designation: 'Professor & Head',
        specialization: 'Natural Language Processing, Federated Learning, Edge AI',
        maxProjects: 6,
      },
    },
    // Student 1
    {
      _id: 'b0000000-0000-0000-0000-000000000001',
      email: 'student1@splm.edu',
      passwordHash,
      firstName: 'Rahul',
      lastName: 'Sharma',
      role: 'STUDENT',
      departmentId: 1,
      isActive: true,
      studentProfile: {
        batchId: 1,
        rollNumber: '22AD001',
        semester: 6,
        cgpa: 8.85,
      },
    },
    // Student 2
    {
      _id: 'b0000000-0000-0000-0000-000000000002',
      email: 'student2@splm.edu',
      passwordHash,
      firstName: 'Ananya',
      lastName: 'Verma',
      role: 'STUDENT',
      departmentId: 1,
      isActive: true,
      studentProfile: {
        batchId: 1,
        rollNumber: '22AD002',
        semester: 6,
        cgpa: 9.12,
      },
    },
    // Student 3
    {
      _id: 'b0000000-0000-0000-0000-000000000003',
      email: 'student3@splm.edu',
      passwordHash,
      firstName: 'Vikram',
      lastName: 'Patel',
      role: 'STUDENT',
      departmentId: 1,
      isActive: true,
      studentProfile: {
        batchId: 1,
        rollNumber: '22AD003',
        semester: 6,
        cgpa: 8.45,
      },
    },
    // Student 4
    {
      _id: 'b0000000-0000-0000-0000-000000000004',
      email: 'student4@splm.edu',
      passwordHash,
      firstName: 'Sneha',
      lastName: 'Iyer',
      role: 'STUDENT',
      departmentId: 1,
      isActive: true,
      studentProfile: {
        batchId: 1,
        rollNumber: '22AD004',
        semester: 6,
        cgpa: 8.92,
      },
    },
  ]);

  // 5. Proposals
  await Proposal.deleteMany({});
  await Proposal.insertMany([
    {
      _id: 'c0000000-0000-0000-0000-000000000001',
      title: 'Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy',
      abstract:
        'This project develops a high-precision multi-stage convolutional neural network coupled with Vision Transformers (ViT) to perform automated fundus retinal image classification and grading. The system generates pixel-level attention heatmaps via Grad-CAM to assist ophthalmologists with interpretable diagnostics.',
      domain: 'Artificial Intelligence & Healthcare',
      subjectCode: 'CAPSTONE-01',
      subjectName: 'Major Capstone Project',
      techStack: ['Python', 'PyTorch', 'Vision Transformer', 'FastAPI', 'React', 'Docker'],
      submittedBy: 'b0000000-0000-0000-0000-000000000001',
      assignedFacultyId: 'f0000000-0000-0000-0000-000000000001',
      status: 'APPROVED',
      facultyComments: 'Comprehensive proposal with strong clinical relevance. Approved for 2025-2026 capstone.',
      version: 2,
      academicYear: '2025-2026',
      members: [
        {
          studentId: 'b0000000-0000-0000-0000-000000000001',
          status: 'ACCEPTED',
          isLead: true,
          joinedAt: new Date('2026-01-05T09:00:00Z'),
        },
        {
          studentId: 'b0000000-0000-0000-0000-000000000002',
          status: 'ACCEPTED',
          isLead: false,
          joinedAt: new Date('2026-01-06T10:00:00Z'),
        },
      ],
      projectId: 'e0000000-0000-0000-0000-000000000001',
    },
    {
      _id: 'c0000000-0000-0000-0000-000000000002',
      title: 'Privacy-Preserving Federated Learning for Decentralized Health Records',
      abstract:
        'Investigating differential privacy mechanisms within asynchronous federated learning architectures across simulated edge hospital clusters. Ensures zero patient data leakage during global model gradient aggregations.',
      domain: 'Distributed Machine Learning & Cybersecurity',
      subjectCode: 'CAPSTONE-01',
      subjectName: 'Major Capstone Project',
      techStack: ['Python', 'TensorFlow Federated', 'PySyft', 'PostgreSQL', 'Docker'],
      submittedBy: 'b0000000-0000-0000-0000-000000000003',
      assignedFacultyId: 'f0000000-0000-0000-0000-000000000002',
      status: 'UNDER_REVIEW',
      facultyComments: 'Initial review in progress. Exploring simulation hardware requirements.',
      version: 1,
      academicYear: '2025-2026',
      members: [
        {
          studentId: 'b0000000-0000-0000-0000-000000000003',
          status: 'ACCEPTED',
          isLead: true,
          joinedAt: new Date('2026-01-12T09:00:00Z'),
        },
        {
          studentId: 'b0000000-0000-0000-0000-000000000004',
          status: 'INVITED',
          isLead: false,
          joinedAt: new Date('2026-01-13T10:00:00Z'),
        },
      ],
    },
  ]);

  // 6. Projects
  await Project.deleteMany({});
  await Project.insertMany([
    {
      _id: 'e0000000-0000-0000-0000-000000000001',
      proposalId: 'c0000000-0000-0000-0000-000000000001',
      title: 'Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy',
      abstract:
        'This project develops a high-precision multi-stage convolutional neural network coupled with Vision Transformers (ViT) to perform automated fundus retinal image classification and grading. The system generates pixel-level attention heatmaps via Grad-CAM to assist ophthalmologists with interpretable diagnostics.',
      domain: 'Artificial Intelligence & Healthcare',
      subjectCode: 'CAPSTONE-01',
      subjectName: 'Major Capstone Project',
      facultyGuideId: 'f0000000-0000-0000-0000-000000000001',
      status: 'IN_PROGRESS',
      overallProgress: 65,
      repositoryUrl: 'https://github.com/splm-projects/retinopathy-ai',
      teamMembers: [
        { studentId: 'b0000000-0000-0000-0000-000000000001', roleInProject: 'LEAD', joinedAt: new Date('2026-01-10T10:00:00Z') },
        { studentId: 'b0000000-0000-0000-0000-000000000002', roleInProject: 'MEMBER', joinedAt: new Date('2026-01-10T10:00:00Z') },
      ],
      milestones: [
        {
          _id: 'd0000000-0000-0000-0000-000000000001',
          milestoneNumber: 1,
          title: 'Requirement Analysis & Clinical Dataset Acquisition',
          description: 'Acquire EyePACS and Messidor-2 clinical datasets, establish preprocessing pipeline and data governance protocols.',
          startDate: new Date('2026-01-10'),
          dueDate: new Date('2026-02-15'),
          completionPercentage: 100,
          status: 'COMPLETED',
          studentRemarks: '88,702 retinal fundus images downloaded, sanitized, and labeled with clinical annotations.',
          facultyRemarks: 'Verified. Dataset ethical clearance and clinical metadata validated.',
          completedAt: new Date('2026-02-14T11:30:00Z'),
        },
        {
          _id: 'd0000000-0000-0000-0000-000000000002',
          milestoneNumber: 2,
          title: 'Model Architecture & Baseline Transfer Learning',
          description: 'Implement EfficientNet-B4 and ViT-Base encoders, perform stratified training and evaluate AUROC.',
          startDate: new Date('2026-02-15'),
          dueDate: new Date('2026-03-25'),
          completionPercentage: 100,
          status: 'COMPLETED',
          studentRemarks: 'Ensemble model achieved 94.6% quadratic weighted kappa score across test partition.',
          facultyRemarks: 'Robust experimental methodology. Hyperparameter tuning curves verified.',
          completedAt: new Date('2026-03-24T16:00:00Z'),
        },
        {
          _id: 'd0000000-0000-0000-0000-000000000003',
          milestoneNumber: 3,
          title: 'Explainable AI (Grad-CAM) & Web Integration',
          description: 'Generate saliency maps for lesion localization, construct FastAPI inference microservice and React UI dashboard.',
          startDate: new Date('2026-03-25'),
          dueDate: new Date('2026-05-10'),
          completionPercentage: 60,
          status: 'IN_PROGRESS',
          studentRemarks: 'Grad-CAM heatmaps operational; currently connecting FastAPI WebSocket endpoints to frontend.',
          facultyRemarks: 'Ensure inference latency remains below 250ms per fundus scan.',
        },
        {
          _id: 'd0000000-0000-0000-0000-000000000004',
          milestoneNumber: 4,
          title: 'Clinical Usability & Edge TensorRT Optimization',
          description: 'Export ONNX model graph to TensorRT runtime, conduct blind user study with ophthalmology residents.',
          startDate: new Date('2026-05-10'),
          dueDate: new Date('2026-06-15'),
          completionPercentage: 0,
          status: 'PENDING',
          studentRemarks: 'Scheduled following Milestone 3 completion.',
        },
        {
          _id: 'd0000000-0000-0000-0000-000000000005',
          milestoneNumber: 5,
          title: 'Final Capstone Thesis, Defense Deck & Viva Voce',
          description: 'Compile comprehensive thesis documentation, archive GitHub source code, and present capstone viva defense.',
          startDate: new Date('2026-06-15'),
          dueDate: new Date('2026-07-10'),
          completionPercentage: 0,
          status: 'PENDING',
        },
      ],
    },
  ]);

  // 7. Reviews
  await Review.deleteMany({});
  await Review.insertMany([
    {
      _id: 'fa000000-0000-0000-0000-000000000001',
      projectId: 'e0000000-0000-0000-0000-000000000001',
      facultyId: 'f0000000-0000-0000-0000-000000000001',
      reviewTitle: 'Review 1: Architectural Baseline & Data Governance',
      roundNumber: 1,
      reviewDate: new Date('2026-02-20'),
      generalFeedback: 'Commendable initial progress. Preprocessing data augmentation pipeline requires stricter class balancing.',
      strengths: 'Rigorous dataset curation and ethical clearance adherence. Solid theoretical foundation in Vision Transformers.',
      issuesIdentified: 'Severe class imbalance observed between Grade 0 (No DR) and Grade 4 (Proliferative DR).',
      requiredChanges: 'Incorporate focal loss or class-conditioned weighted sampling to mitigate grade 4 under-representation.',
      hasMarks: true,
      technicalScore: 34.0,
      documentationScore: 26.5,
      presentationScore: 24.5,
      totalScore: 85.0,
      status: 'CHANGES_REQUESTED',
      resubmissions: [
        {
          _id: 'fb000000-0000-0000-0000-000000000001',
          resubmittedBy: 'b0000000-0000-0000-0000-000000000001',
          studentNotes: 'Replaced cross-entropy with Focal Loss (gamma=2.0, alpha=0.25) and applied dynamic mixup augmentation. F1-score for Grade 4 improved from 0.71 to 0.89.',
          resubmittedAt: new Date('2026-03-01T14:20:00Z'),
        },
      ],
    },
    {
      _id: 'fa000000-0000-0000-0000-000000000002',
      projectId: 'e0000000-0000-0000-0000-000000000001',
      facultyId: 'f0000000-0000-0000-0000-000000000001',
      reviewTitle: 'Review 2: Mid-Term Model Evaluation & Explainability',
      roundNumber: 2,
      reviewDate: new Date('2026-04-05'),
      generalFeedback: 'Outstanding resolution of previous round feedback. Focal loss implementation significantly enhanced minority class sensitivity.',
      strengths: 'Excellent ablation studies comparing ViT vs EfficientNet. Grad-CAM visual heatmaps demonstrate high localization fidelity with clinical lesions.',
      issuesIdentified: 'Minor documentation formatting errors in IEEE citation format.',
      requiredChanges: 'Refine thesis Chapter 3 formatting and prepare ONNX runtime benchmark tables.',
      hasMarks: true,
      technicalScore: 37.5,
      documentationScore: 26.0,
      presentationScore: 26.7,
      totalScore: 90.2,
      status: 'APPROVED',
      resubmissions: [],
    },
  ]);

  logger.info('✅ MongoDB academic dataset seeded successfully (7 users, 2 proposals, 1 project, 2 reviews).');
};

// Standalone execution entrypoint
if (require.main === module) {
  import('../db/mongo').then(({ connectMongo, disconnectMongo }) => {
    connectMongo()
      .then(() => seedMongoData())
      .then(() => disconnectMongo())
      .then(() => {
        logger.info('Database seeding completed.');
        process.exit(0);
      })
      .catch((err) => {
        logger.error('Database seeding failed:', err);
        process.exit(1);
      });
  });
}
