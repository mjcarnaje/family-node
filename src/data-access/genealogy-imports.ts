import { eq, and, desc } from "drizzle-orm";
import { database } from "~/db";
import {
  genealogyImportSession,
  externalMemberReference,
  type GenealogyImportSession,
  type CreateGenealogyImportSessionData,
  type UpdateGenealogyImportSessionData,
  type ExternalMemberReference,
  type CreateExternalMemberReferenceData,
  type UpdateExternalMemberReferenceData,
  type GenealogyService,
  type GenealogyImportStatus,
} from "~/db/schema";

// ============================================
// Genealogy Import Session Data Access
// ============================================

/**
 * Find a genealogy import session by ID
 */
export async function findGenealogyImportById(
  id: string
): Promise<GenealogyImportSession | null> {
  const [result] = await database
    .select()
    .from(genealogyImportSession)
    .where(eq(genealogyImportSession.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find all import sessions for a family tree
 */
export async function findGenealogyImportsByTreeId(
  familyTreeId: string
): Promise<GenealogyImportSession[]> {
  return database
    .select()
    .from(genealogyImportSession)
    .where(eq(genealogyImportSession.familyTreeId, familyTreeId))
    .orderBy(desc(genealogyImportSession.createdAt));
}

/**
 * Find all import sessions for a user
 */
export async function findGenealogyImportsByUserId(
  userId: string
): Promise<GenealogyImportSession[]> {
  return database
    .select()
    .from(genealogyImportSession)
    .where(eq(genealogyImportSession.userId, userId))
    .orderBy(desc(genealogyImportSession.createdAt));
}

/**
 * Find the latest import session for a tree and service
 */
export async function findLatestGenealogyImport(
  familyTreeId: string,
  service: GenealogyService
): Promise<GenealogyImportSession | null> {
  const [result] = await database
    .select()
    .from(genealogyImportSession)
    .where(
      and(
        eq(genealogyImportSession.familyTreeId, familyTreeId),
        eq(genealogyImportSession.service, service)
      )
    )
    .orderBy(desc(genealogyImportSession.createdAt))
    .limit(1);

  return result || null;
}

/**
 * Create a new genealogy import session
 */
export async function createGenealogyImport(
  data: CreateGenealogyImportSessionData
): Promise<GenealogyImportSession> {
  const [result] = await database
    .insert(genealogyImportSession)
    .values(data)
    .returning();

  return result;
}

/**
 * Update a genealogy import session
 */
export async function updateGenealogyImport(
  id: string,
  data: UpdateGenealogyImportSessionData
): Promise<GenealogyImportSession | null> {
  const [result] = await database
    .update(genealogyImportSession)
    .set(data)
    .where(eq(genealogyImportSession.id, id))
    .returning();

  return result || null;
}

/**
 * Update import session status
 */
export async function updateGenealogyImportStatus(
  id: string,
  status: GenealogyImportStatus,
  additionalData?: Partial<UpdateGenealogyImportSessionData>
): Promise<GenealogyImportSession | null> {
  const updateData: UpdateGenealogyImportSessionData = {
    status,
    ...additionalData,
  };

  if (status === "in_progress" && !additionalData?.startedAt) {
    updateData.startedAt = new Date();
  }

  if ((status === "completed" || status === "failed") && !additionalData?.completedAt) {
    updateData.completedAt = new Date();
  }

  return updateGenealogyImport(id, updateData);
}

/**
 * Delete a genealogy import session
 */
export async function deleteGenealogyImport(id: string): Promise<boolean> {
  const result = await database
    .delete(genealogyImportSession)
    .where(eq(genealogyImportSession.id, id));

  return (result.rowCount ?? 0) > 0;
}

// ============================================
// External Member Reference Data Access
// ============================================

/**
 * Find an external member reference by ID
 */
export async function findExternalMemberReferenceById(
  id: string
): Promise<ExternalMemberReference | null> {
  const [result] = await database
    .select()
    .from(externalMemberReference)
    .where(eq(externalMemberReference.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find external references for a family member
 */
export async function findExternalReferencesByMemberId(
  familyMemberId: string
): Promise<ExternalMemberReference[]> {
  return database
    .select()
    .from(externalMemberReference)
    .where(eq(externalMemberReference.familyMemberId, familyMemberId));
}

/**
 * Find external references for a family tree
 */
export async function findExternalReferencesByTreeId(
  familyTreeId: string
): Promise<ExternalMemberReference[]> {
  return database
    .select()
    .from(externalMemberReference)
    .where(eq(externalMemberReference.familyTreeId, familyTreeId));
}

/**
 * Find a reference by external ID and service
 */
export async function findExternalReferenceByExternalId(
  familyTreeId: string,
  service: GenealogyService,
  externalId: string
): Promise<ExternalMemberReference | null> {
  const [result] = await database
    .select()
    .from(externalMemberReference)
    .where(
      and(
        eq(externalMemberReference.familyTreeId, familyTreeId),
        eq(externalMemberReference.service, service),
        eq(externalMemberReference.externalId, externalId)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Find a reference for a member and service
 */
export async function findExternalReferenceByMemberAndService(
  familyMemberId: string,
  service: GenealogyService
): Promise<ExternalMemberReference | null> {
  const [result] = await database
    .select()
    .from(externalMemberReference)
    .where(
      and(
        eq(externalMemberReference.familyMemberId, familyMemberId),
        eq(externalMemberReference.service, service)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Create a new external member reference
 */
export async function createExternalMemberReference(
  data: CreateExternalMemberReferenceData
): Promise<ExternalMemberReference> {
  const [result] = await database
    .insert(externalMemberReference)
    .values(data)
    .returning();

  return result;
}

/**
 * Create multiple external member references
 */
export async function createExternalMemberReferences(
  data: CreateExternalMemberReferenceData[]
): Promise<ExternalMemberReference[]> {
  if (data.length === 0) return [];

  return database
    .insert(externalMemberReference)
    .values(data)
    .returning();
}

/**
 * Update an external member reference
 */
export async function updateExternalMemberReference(
  id: string,
  data: UpdateExternalMemberReferenceData
): Promise<ExternalMemberReference | null> {
  const [result] = await database
    .update(externalMemberReference)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(externalMemberReference.id, id))
    .returning();

  return result || null;
}

/**
 * Delete an external member reference
 */
export async function deleteExternalMemberReference(id: string): Promise<boolean> {
  const result = await database
    .delete(externalMemberReference)
    .where(eq(externalMemberReference.id, id));

  return (result.rowCount ?? 0) > 0;
}

/**
 * Delete all external references for a family tree
 */
export async function deleteExternalReferencesByTreeId(
  familyTreeId: string
): Promise<number> {
  const result = await database
    .delete(externalMemberReference)
    .where(eq(externalMemberReference.familyTreeId, familyTreeId));

  return result.rowCount ?? 0;
}

/**
 * Update last sync timestamp for a reference
 */
export async function updateExternalReferenceLastSync(
  id: string
): Promise<ExternalMemberReference | null> {
  return updateExternalMemberReference(id, { lastSyncAt: new Date() });
}
