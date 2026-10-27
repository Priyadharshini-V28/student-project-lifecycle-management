import { AcademicBatch, Domain, AuditLog } from '../models';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export interface CreateBatchInput {
  name: string;
  startYear: number;
  endYear: number;
  departmentId: number;
}

export interface CreateDomainInput {
  name: string;
  description?: string;
  departmentId?: number;
}

export class MetadataService {
  /**
   * Fetch all active academic batches (optionally filtered by department)
   */
  async getAcademicBatches(departmentId?: number): Promise<unknown[]> {
    const query: Record<string, unknown> = { isActive: true };
    if (departmentId) {
      query.departmentId = departmentId;
    }
    return AcademicBatch.find(query).sort({ startYear: -1 });
  }

  async getBatches(departmentId?: number): Promise<any[]> {
    return AcademicBatch.find(departmentId ? { departmentId } : {}).sort({ startYear: 1 });
  }

  async getAllAcademicBatches(): Promise<unknown[]> {
    return AcademicBatch.find().sort({ startYear: -1 });
  }

  async createBatch(
    input: { name: string; startYear: number; endYear: number; departmentId?: number; isCurrent?: boolean },
    adminUserId?: string
  ): Promise<any> {
    return this.createAcademicBatch(
      {
        name: input.name,
        startYear: input.startYear,
        endYear: input.endYear,
        departmentId: input.departmentId || 1,
      },
      adminUserId || 'a0000000-0000-0000-0000-000000000001'
    );
  }

  /**
   * Create a new academic batch (Admin privilege)
   */
  async createAcademicBatch(input: CreateBatchInput, adminUserId: string): Promise<any> {
    if (!input.name || !input.startYear || !input.endYear || !input.departmentId) {
      throw ApiError.badRequest('Batch name, startYear, endYear, and departmentId are required.');
    }

    if (input.endYear <= input.startYear) {
      throw ApiError.badRequest('End year must be greater than start year.');
    }

    const existing = await AcademicBatch.findOne({ name: input.name.trim() });
    if (existing) {
      throw ApiError.badRequest(`Academic batch "${input.name}" already exists.`);
    }

    const maxBatch = await AcademicBatch.findOne().sort({ _id: -1 });
    const nextId = (maxBatch?._id || 0) + 1;

    const newBatch = await AcademicBatch.create({
      _id: nextId,
      name: input.name.trim(),
      startYear: input.startYear,
      endYear: input.endYear,
      departmentId: input.departmentId,
      isActive: true,
    });

    await AuditLog.create({
      userId: adminUserId,
      action: 'ACADEMIC_BATCH_CREATED',
      entityType: 'ACADEMIC_BATCH',
      entityId: String(newBatch._id),
      details: { name: newBatch.name, startYear: newBatch.startYear, endYear: newBatch.endYear },
    });

    logger.info(`[MetadataService] Academic batch "${newBatch.name}" created by admin ${adminUserId}`);
    return newBatch;
  }

  /**
   * Fetch active project domains
   */
  async getActiveDomains(): Promise<unknown[]> {
    return Domain.find({ isActive: true }).sort({ name: 1 });
  }

  async getAllDomains(): Promise<unknown[]> {
    return Domain.find().sort({ name: 1 });
  }

  async getDomains(activeOnly?: boolean): Promise<any[]> {
    return activeOnly ? Domain.find({ isActive: true }).sort({ name: 1 }) : Domain.find().sort({ name: 1 });
  }

  /**
   * Create a new project domain (Admin privilege)
   */
  async createDomain(input: CreateDomainInput, adminUserId?: string): Promise<any> {
    const actorId = adminUserId || 'a0000000-0000-0000-0000-000000000001';
    if (!input.name || input.name.trim().length < 3) {
      throw ApiError.badRequest('Domain name must be at least 3 characters long.');
    }

    const trimmedName = input.name.trim();
    const existing = await Domain.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existing) {
      throw ApiError.badRequest(`Domain "${trimmedName}" already exists.`);
    }

    const domain = await Domain.create({
      name: trimmedName,
      description: input.description?.trim(),
      departmentId: input.departmentId || 1,
      isActive: true,
    });

    await AuditLog.create({
      userId: actorId,
      action: 'DOMAIN_CREATED',
      entityType: 'DOMAIN',
      entityId: domain.id,
      details: { name: domain.name, description: domain.description },
    });

    logger.info(`[MetadataService] Project domain "${domain.name}" created by admin ${actorId}`);
    return domain;
  }

  /**
   * Toggle domain active status (Admin privilege)
   */
  async toggleDomainStatus(domainId: string, isActive: boolean, adminUserId?: string): Promise<any> {
    const actorId = adminUserId || 'a0000000-0000-0000-0000-000000000001';
    const domain = await Domain.findById(domainId);
    if (!domain) {
      throw ApiError.notFound(`Domain with ID ${domainId} not found.`);
    }

    domain.isActive = isActive;
    await domain.save();

    await AuditLog.create({
      userId: actorId,
      action: 'DOMAIN_STATUS_UPDATED',
      entityType: 'DOMAIN',
      entityId: domainId,
      details: { name: domain.name, isActive },
    });

    logger.info(`[MetadataService] Domain "${domain.name}" status changed to ${isActive} by admin ${actorId}`);
    return domain;
  }
}

export const metadataService = new MetadataService();
