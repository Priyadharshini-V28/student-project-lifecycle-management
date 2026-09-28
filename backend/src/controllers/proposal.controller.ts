import { Request, Response, NextFunction } from 'express';
import { proposalService } from '../services/proposal.service';
import { ApiError } from '../utils/ApiError';
import {
  createProposalSchema,
  updateProposalSchema,
  reviewProposalSchema,
  addProposalMemberSchema,
  respondMemberInviteSchema,
  updateProjectRepoSchema,
} from '../validators/proposal.validator';

/**
 * Get system proposal settings (max team size, min team size, submission allowed)
 */
export const getSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await proposalService.getSystemSettings();
    res.status(200).json({
      success: true,
      message: 'System proposal settings retrieved successfully',
      data: settings,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new proposal
 */
export const createProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    if (req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students are authorized to author project proposals.');
    }

    const validatedInput = createProposalSchema.parse(req.body);
    const proposal = await proposalService.createProposal(req.user.id, validatedInput);

    res.status(201).json({
      success: true,
      message: 'Project proposal created successfully',
      data: proposal,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List proposals relevant to the authenticated user
 */
export const getProposals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const proposals = await proposalService.getProposalsForUser(req.user.id, req.user.role);

    res.status(200).json({
      success: true,
      message: 'Proposals retrieved successfully',
      data: proposals,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single proposal by ID
 */
export const getProposalById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const id = req.params.id as string;

    const proposal = await proposalService.getProposalById(id);

    res.status(200).json({
      success: true,
      message: 'Proposal retrieved successfully',
      data: proposal,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update proposal details
 */
export const updateProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const id = req.params.id as string;

    const validatedInput = updateProposalSchema.parse(req.body);
    const updated = await proposalService.updateProposal(id, req.user.id, validatedInput);

    res.status(200).json({
      success: true,
      message: 'Proposal updated successfully',
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Submit / Resubmit proposal
 */
export const submitProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const id = req.params.id as string;

    const submitted = await proposalService.submitProposal(id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Proposal submitted successfully for faculty appraisal',
      data: submitted,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Review proposal (Approve, Request Changes, Reject)
 */
export const reviewProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const id = req.params.id as string;

    const validatedInput = reviewProposalSchema.parse(req.body);
    const result = await proposalService.reviewProposal(
      id,
      req.user.id,
      req.user.role,
      validatedInput
    );

    res.status(200).json({
      success: true,
      message:
        validatedInput.status === 'APPROVED'
          ? 'Proposal approved and official project instantiated successfully'
          : `Proposal review saved as ${validatedInput.status}`,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Add / Invite team member
 */
export const addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const id = req.params.id as string;

    const { studentId } = addProposalMemberSchema.parse(req.body);
    const updated = await proposalService.addProposalMember(id, req.user.id, studentId);

    res.status(200).json({
      success: true,
      message: 'Prospective team member invitation sent successfully',
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Respond to member invitation
 */
export const respondInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const id = req.params.id as string;

    const { status } = respondMemberInviteSchema.parse(req.body);
    const updated = await proposalService.respondToInvitation(id, req.user.id, status);

    res.status(200).json({
      success: true,
      message: `Invitation ${status.toLowerCase()} successfully`,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Remove a team member
 */
export const removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const id = req.params.id as string;
    const memberId = req.params.memberId as string;

    const updated = await proposalService.removeProposalMember(id, req.user.id, memberId);

    res.status(200).json({
      success: true,
      message: 'Team member removed successfully',
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get project details by ID
 */
export const getProjectById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const id = req.params.id as string;

    const project = await proposalService.getProjectById(id);

    res.status(200).json({
      success: true,
      message: 'Active project details retrieved successfully',
      data: project,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update project repository URL
 */
export const updateProjectRepo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const id = req.params.id as string;

    const { repositoryUrl } = updateProjectRepoSchema.parse(req.body);
    await proposalService.updateProjectRepo(id, req.user.id, req.user.role, repositoryUrl);

    res.status(200).json({
      success: true,
      message: 'Project repository URL updated successfully',
      data: { projectId: id, repositoryUrl },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};
