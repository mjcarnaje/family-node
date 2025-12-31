import { createNotification } from "~/data-access/notifications";
import { findCollaboratorsByTreeId } from "~/data-access/tree-sharing";
import { findFamilyTreeById } from "~/data-access/family-trees";
import { findUserById } from "~/data-access/users";
import type {
  NotificationType,
  NotificationRelatedType,
  TreeChangeType,
  FamilyMember,
  ParentChildRelationship,
  MarriageConnection,
} from "~/db/schema";

// Map tree change types to notification types
const CHANGE_TYPE_TO_NOTIFICATION_TYPE: Record<TreeChangeType, NotificationType> = {
  MEMBER_ADDED: "TREE_MEMBER_ADDED",
  MEMBER_UPDATED: "TREE_MEMBER_UPDATED",
  MEMBER_DELETED: "TREE_MEMBER_DELETED",
  RELATIONSHIP_ADDED: "TREE_RELATIONSHIP_ADDED",
  RELATIONSHIP_UPDATED: "TREE_RELATIONSHIP_UPDATED",
  RELATIONSHIP_DELETED: "TREE_RELATIONSHIP_DELETED",
  MARRIAGE_ADDED: "TREE_MARRIAGE_ADDED",
  MARRIAGE_UPDATED: "TREE_MARRIAGE_UPDATED",
  MARRIAGE_DELETED: "TREE_MARRIAGE_DELETED",
  TREE_UPDATED: "GENERAL",
  BULK_IMPORT: "GENERAL",
  REVERT: "GENERAL",
};

// Get related type for entity type
function getRelatedType(entityType: string): NotificationRelatedType {
  switch (entityType) {
    case "MEMBER":
      return "FAMILY_MEMBER";
    case "RELATIONSHIP":
      return "RELATIONSHIP";
    case "MARRIAGE":
      return "MARRIAGE";
    case "TREE":
    default:
      return "FAMILY_TREE";
  }
}

interface NotificationDetails {
  type: TreeChangeType;
  entityType: "MEMBER" | "RELATIONSHIP" | "MARRIAGE" | "TREE";
  entityId: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Get all users who should be notified about changes to a tree
 * This includes the owner and all collaborators (excluding the action performer)
 */
export async function getTreeNotificationRecipients(
  familyTreeId: string,
  excludeUserId: string
): Promise<string[]> {
  const recipients: string[] = [];

  // Get tree to find owner
  const tree = await findFamilyTreeById(familyTreeId);
  if (!tree) {
    return recipients;
  }

  // Add owner if not the action performer
  if (tree.ownerId !== excludeUserId) {
    recipients.push(tree.ownerId);
  }

  // Get all collaborators
  const collaborators = await findCollaboratorsByTreeId(familyTreeId);
  for (const collaborator of collaborators) {
    // Only notify accepted collaborators, excluding the action performer
    if (
      collaborator.userId !== excludeUserId &&
      collaborator.acceptedAt !== null
    ) {
      recipients.push(collaborator.userId);
    }
  }

  return [...new Set(recipients)]; // Remove duplicates
}

/**
 * Generate notification title based on change type
 */
function generateNotificationTitle(
  changeType: TreeChangeType,
  treeName: string,
  performerName: string
): string {
  switch (changeType) {
    case "MEMBER_ADDED":
      return `New member added to "${treeName}"`;
    case "MEMBER_UPDATED":
      return `Member updated in "${treeName}"`;
    case "MEMBER_DELETED":
      return `Member removed from "${treeName}"`;
    case "RELATIONSHIP_ADDED":
      return `New relationship added in "${treeName}"`;
    case "RELATIONSHIP_UPDATED":
      return `Relationship updated in "${treeName}"`;
    case "RELATIONSHIP_DELETED":
      return `Relationship removed from "${treeName}"`;
    case "MARRIAGE_ADDED":
      return `New marriage added in "${treeName}"`;
    case "MARRIAGE_UPDATED":
      return `Marriage updated in "${treeName}"`;
    case "MARRIAGE_DELETED":
      return `Marriage removed from "${treeName}"`;
    case "TREE_UPDATED":
      return `"${treeName}" was updated`;
    case "BULK_IMPORT":
      return `Data imported to "${treeName}"`;
    case "REVERT":
      return `"${treeName}" was reverted`;
    default:
      return `Changes made to "${treeName}"`;
  }
}

/**
 * Generate notification content based on change details
 */
function generateNotificationContent(
  changeType: TreeChangeType,
  entityName: string | undefined,
  description: string,
  performerName: string
): string {
  const actor = performerName || "Someone";

  switch (changeType) {
    case "MEMBER_ADDED":
      return `${actor} added ${entityName || "a new member"} to the family tree.`;
    case "MEMBER_UPDATED":
      return `${actor} updated ${entityName || "a family member"}'s information.`;
    case "MEMBER_DELETED":
      return `${actor} removed ${entityName || "a member"} from the family tree.`;
    case "RELATIONSHIP_ADDED":
      return `${actor} added a new parent-child relationship${entityName ? `: ${entityName}` : ""}.`;
    case "RELATIONSHIP_UPDATED":
      return `${actor} updated a parent-child relationship${entityName ? `: ${entityName}` : ""}.`;
    case "RELATIONSHIP_DELETED":
      return `${actor} removed a parent-child relationship${entityName ? `: ${entityName}` : ""}.`;
    case "MARRIAGE_ADDED":
      return `${actor} added a new marriage connection${entityName ? `: ${entityName}` : ""}.`;
    case "MARRIAGE_UPDATED":
      return `${actor} updated a marriage connection${entityName ? `: ${entityName}` : ""}.`;
    case "MARRIAGE_DELETED":
      return `${actor} removed a marriage connection${entityName ? `: ${entityName}` : ""}.`;
    case "BULK_IMPORT":
      return `${actor} imported data to the family tree.`;
    case "REVERT":
      return `${actor} reverted the family tree to a previous version.`;
    default:
      return description || `${actor} made changes to the family tree.`;
  }
}

/**
 * Send notifications to all tree collaborators about a change
 */
export async function notifyTreeChange(
  familyTreeId: string,
  performerUserId: string,
  details: NotificationDetails
): Promise<{ notificationsSent: number; errors: string[] }> {
  const errors: string[] = [];
  let notificationsSent = 0;

  try {
    // Get tree info
    const tree = await findFamilyTreeById(familyTreeId);
    if (!tree) {
      errors.push("Tree not found");
      return { notificationsSent, errors };
    }

    // Get performer info for notification content
    const performer = await findUserById(performerUserId);
    const performerName = performer?.name || "A user";

    // Get all recipients
    const recipients = await getTreeNotificationRecipients(
      familyTreeId,
      performerUserId
    );

    if (recipients.length === 0) {
      return { notificationsSent: 0, errors: [] };
    }

    // Generate notification content
    const notificationType = CHANGE_TYPE_TO_NOTIFICATION_TYPE[details.type];
    const title = generateNotificationTitle(details.type, tree.name, performerName);
    const content = generateNotificationContent(
      details.type,
      details.entityName,
      details.description,
      performerName
    );

    // Create notifications for each recipient
    const notificationPromises = recipients.map(async (userId) => {
      try {
        await createNotification({
          id: crypto.randomUUID(),
          userId,
          type: notificationType,
          title,
          content,
          relatedId: details.entityId,
          relatedType: getRelatedType(details.entityType),
          metadata: {
            familyTreeId,
            familyTreeName: tree.name,
            performerUserId,
            performerName,
            entityType: details.entityType,
            entityName: details.entityName,
            ...details.metadata,
          },
          isRead: false,
        });
        notificationsSent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to notify user ${userId}: ${errorMessage}`);
      }
    });

    await Promise.all(notificationPromises);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`General error: ${errorMessage}`);
  }

  return { notificationsSent, errors };
}

/**
 * Notify about a new family member being added
 */
export async function notifyMemberAdded(
  familyTreeId: string,
  performerUserId: string,
  member: FamilyMember
): Promise<void> {
  const memberName = `${member.firstName} ${member.lastName}`;

  try {
    await notifyTreeChange(familyTreeId, performerUserId, {
      type: "MEMBER_ADDED",
      entityType: "MEMBER",
      entityId: member.id,
      entityName: memberName,
      description: `Added family member: ${memberName}`,
      metadata: {
        memberId: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
      },
    });
  } catch (error) {
    console.error("Failed to send member added notification:", error);
  }
}

/**
 * Notify about a family member being updated
 */
export async function notifyMemberUpdated(
  familyTreeId: string,
  performerUserId: string,
  member: FamilyMember
): Promise<void> {
  const memberName = `${member.firstName} ${member.lastName}`;

  try {
    await notifyTreeChange(familyTreeId, performerUserId, {
      type: "MEMBER_UPDATED",
      entityType: "MEMBER",
      entityId: member.id,
      entityName: memberName,
      description: `Updated family member: ${memberName}`,
      metadata: {
        memberId: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
      },
    });
  } catch (error) {
    console.error("Failed to send member updated notification:", error);
  }
}

/**
 * Notify about a family member being deleted
 */
export async function notifyMemberDeleted(
  familyTreeId: string,
  performerUserId: string,
  memberId: string,
  memberName: string
): Promise<void> {
  try {
    await notifyTreeChange(familyTreeId, performerUserId, {
      type: "MEMBER_DELETED",
      entityType: "MEMBER",
      entityId: memberId,
      entityName: memberName,
      description: `Removed family member: ${memberName}`,
      metadata: {
        memberId,
        memberName,
      },
    });
  } catch (error) {
    console.error("Failed to send member deleted notification:", error);
  }
}

/**
 * Notify about a relationship being added
 */
export async function notifyRelationshipAdded(
  familyTreeId: string,
  performerUserId: string,
  relationship: ParentChildRelationship,
  parentName: string,
  childName: string
): Promise<void> {
  const entityName = `${parentName} -> ${childName}`;

  try {
    await notifyTreeChange(familyTreeId, performerUserId, {
      type: "RELATIONSHIP_ADDED",
      entityType: "RELATIONSHIP",
      entityId: relationship.id,
      entityName,
      description: `Added parent-child relationship: ${entityName}`,
      metadata: {
        relationshipId: relationship.id,
        parentId: relationship.parentId,
        childId: relationship.childId,
        parentName,
        childName,
        relationshipType: relationship.relationshipType,
      },
    });
  } catch (error) {
    console.error("Failed to send relationship added notification:", error);
  }
}

/**
 * Notify about a relationship being updated
 */
export async function notifyRelationshipUpdated(
  familyTreeId: string,
  performerUserId: string,
  relationship: ParentChildRelationship,
  parentName: string,
  childName: string
): Promise<void> {
  const entityName = `${parentName} -> ${childName}`;

  try {
    await notifyTreeChange(familyTreeId, performerUserId, {
      type: "RELATIONSHIP_UPDATED",
      entityType: "RELATIONSHIP",
      entityId: relationship.id,
      entityName,
      description: `Updated parent-child relationship: ${entityName}`,
      metadata: {
        relationshipId: relationship.id,
        parentId: relationship.parentId,
        childId: relationship.childId,
        parentName,
        childName,
        relationshipType: relationship.relationshipType,
      },
    });
  } catch (error) {
    console.error("Failed to send relationship updated notification:", error);
  }
}

/**
 * Notify about a relationship being deleted
 */
export async function notifyRelationshipDeleted(
  familyTreeId: string,
  performerUserId: string,
  relationshipId: string,
  parentName: string,
  childName: string
): Promise<void> {
  const entityName = `${parentName} -> ${childName}`;

  try {
    await notifyTreeChange(familyTreeId, performerUserId, {
      type: "RELATIONSHIP_DELETED",
      entityType: "RELATIONSHIP",
      entityId: relationshipId,
      entityName,
      description: `Removed parent-child relationship: ${entityName}`,
      metadata: {
        relationshipId,
        parentName,
        childName,
      },
    });
  } catch (error) {
    console.error("Failed to send relationship deleted notification:", error);
  }
}

/**
 * Notify about a marriage being added
 */
export async function notifyMarriageAdded(
  familyTreeId: string,
  performerUserId: string,
  marriage: MarriageConnection,
  spouse1Name: string,
  spouse2Name: string
): Promise<void> {
  const entityName = `${spouse1Name} & ${spouse2Name}`;

  try {
    await notifyTreeChange(familyTreeId, performerUserId, {
      type: "MARRIAGE_ADDED",
      entityType: "MARRIAGE",
      entityId: marriage.id,
      entityName,
      description: `Added marriage connection: ${entityName}`,
      metadata: {
        marriageId: marriage.id,
        spouse1Id: marriage.spouse1Id,
        spouse2Id: marriage.spouse2Id,
        spouse1Name,
        spouse2Name,
        status: marriage.status,
      },
    });
  } catch (error) {
    console.error("Failed to send marriage added notification:", error);
  }
}

/**
 * Notify about a marriage being updated
 */
export async function notifyMarriageUpdated(
  familyTreeId: string,
  performerUserId: string,
  marriage: MarriageConnection,
  spouse1Name: string,
  spouse2Name: string
): Promise<void> {
  const entityName = `${spouse1Name} & ${spouse2Name}`;

  try {
    await notifyTreeChange(familyTreeId, performerUserId, {
      type: "MARRIAGE_UPDATED",
      entityType: "MARRIAGE",
      entityId: marriage.id,
      entityName,
      description: `Updated marriage connection: ${entityName}`,
      metadata: {
        marriageId: marriage.id,
        spouse1Id: marriage.spouse1Id,
        spouse2Id: marriage.spouse2Id,
        spouse1Name,
        spouse2Name,
        status: marriage.status,
      },
    });
  } catch (error) {
    console.error("Failed to send marriage updated notification:", error);
  }
}

/**
 * Notify about a marriage being deleted
 */
export async function notifyMarriageDeleted(
  familyTreeId: string,
  performerUserId: string,
  marriageId: string,
  spouse1Name: string,
  spouse2Name: string
): Promise<void> {
  const entityName = `${spouse1Name} & ${spouse2Name}`;

  try {
    await notifyTreeChange(familyTreeId, performerUserId, {
      type: "MARRIAGE_DELETED",
      entityType: "MARRIAGE",
      entityId: marriageId,
      entityName,
      description: `Removed marriage connection: ${entityName}`,
      metadata: {
        marriageId,
        spouse1Name,
        spouse2Name,
      },
    });
  } catch (error) {
    console.error("Failed to send marriage deleted notification:", error);
  }
}
