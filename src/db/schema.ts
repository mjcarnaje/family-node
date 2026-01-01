import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  date,
  pgEnum,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// User table - Core user information for authentication
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  isAdmin: boolean("is_admin")
    .$default(() => false)
    .notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Session table - Better Auth session management
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

// Account table - Better Auth OAuth provider accounts
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Verification table - Better Auth email verification
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

// User Profile - Extended profile information
export const userProfile = pgTable(
  "user_profile",
  {
    id: text("id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    bio: text("bio"),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("idx_user_profile_id").on(table.id)]
);

// Relations
export const userRelations = relations(user, ({ one }) => ({
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.id],
  }),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.id],
    references: [user.id],
  }),
}));

// ============================================
// Family Tree Schema
// ============================================

// Enums for family tree
export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const relationshipTypeEnum = pgEnum("relationship_type", [
  "biological",
  "adopted",
  "step",
  "foster",
]);
export const marriageStatusEnum = pgEnum("marriage_status", [
  "married",
  "divorced",
  "widowed",
  "separated",
  "annulled",
]);

// Privacy level enum for family trees
export const treePrivacyLevelEnum = pgEnum("tree_privacy_level", [
  "private", // Only owner can view
  "family", // Owner and invited family members can view
  "public", // Anyone can view (read-only for non-family)
]);

// Collaborator role enum for family tree access
export const treeCollaboratorRoleEnum = pgEnum("tree_collaborator_role", [
  "viewer", // Can only view the tree
  "editor", // Can view and edit members
  "admin", // Can view, edit, and manage collaborators (but not delete tree)
]);

// Family Tree table - Container for a family tree
export const familyTree = pgTable(
  "family_tree",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    coverImageUrl: text("cover_image_url"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isPublic: boolean("is_public")
      .$default(() => false)
      .notNull(),
    // Privacy level: private (owner only), family (invited members), public (everyone can view)
    privacyLevel: treePrivacyLevelEnum("privacy_level")
      .$default(() => "private")
      .notNull(),
    // Public viewing: unique slug for public URL (e.g., /tree/public/abc123)
    publicSlug: text("public_slug").unique(),
    // Optional PIN code protection for public trees (stored as hash)
    publicPin: text("public_pin"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_family_tree_owner_id").on(table.ownerId),
    index("idx_family_tree_is_public").on(table.isPublic),
    index("idx_family_tree_privacy_level").on(table.privacyLevel),
    index("idx_family_tree_public_slug").on(table.publicSlug),
  ]
);

// Family Member table - Individual family members
export const familyMember = pgTable(
  "family_member",
  {
    id: text("id").primaryKey(),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    nickname: text("nickname"),
    gender: genderEnum("gender"),
    birthDate: date("birth_date"),
    birthPlace: text("birth_place"),
    deathDate: date("death_date"),
    deathPlace: text("death_place"),
    bio: text("bio"),
    profileImageUrl: text("profile_image_url"),
    // Optional link to actual user account
    linkedUserId: text("linked_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_family_member_family_tree_id").on(table.familyTreeId),
    index("idx_family_member_linked_user_id").on(table.linkedUserId),
    index("idx_family_member_last_name").on(table.lastName),
  ]
);

// Parent-Child Relationship table - Parent-child connections
export const parentChildRelationship = pgTable(
  "parent_child_relationship",
  {
    id: text("id").primaryKey(),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    parentId: text("parent_id")
      .notNull()
      .references(() => familyMember.id, { onDelete: "cascade" }),
    childId: text("child_id")
      .notNull()
      .references(() => familyMember.id, { onDelete: "cascade" }),
    relationshipType: relationshipTypeEnum("relationship_type")
      .$default(() => "biological")
      .notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_parent_child_family_tree_id").on(table.familyTreeId),
    index("idx_parent_child_parent_id").on(table.parentId),
    index("idx_parent_child_child_id").on(table.childId),
  ]
);

// Marriage Connection table - Marriage/spousal relationships
export const marriageConnection = pgTable(
  "marriage_connection",
  {
    id: text("id").primaryKey(),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    spouse1Id: text("spouse1_id")
      .notNull()
      .references(() => familyMember.id, { onDelete: "cascade" }),
    spouse2Id: text("spouse2_id")
      .notNull()
      .references(() => familyMember.id, { onDelete: "cascade" }),
    marriageDate: date("marriage_date"),
    marriagePlace: text("marriage_place"),
    divorceDate: date("divorce_date"),
    status: marriageStatusEnum("status")
      .$default(() => "married")
      .notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_marriage_family_tree_id").on(table.familyTreeId),
    index("idx_marriage_spouse1_id").on(table.spouse1Id),
    index("idx_marriage_spouse2_id").on(table.spouse2Id),
  ]
);

// ============================================
// Tree Version History Schema
// ============================================

// Enum for tree change types
export const treeChangeTypeEnum = pgEnum("tree_change_type", [
  "MEMBER_ADDED",
  "MEMBER_UPDATED",
  "MEMBER_DELETED",
  "RELATIONSHIP_ADDED",
  "RELATIONSHIP_UPDATED",
  "RELATIONSHIP_DELETED",
  "MARRIAGE_ADDED",
  "MARRIAGE_UPDATED",
  "MARRIAGE_DELETED",
  "TREE_UPDATED",
  "BULK_IMPORT",
  "REVERT",
]);

// Enum for entity types in change log
export const treeEntityTypeEnum = pgEnum("tree_entity_type", [
  "MEMBER",
  "RELATIONSHIP",
  "MARRIAGE",
  "TREE",
]);

// Tree Version table - Snapshots of tree state at each version
export const treeVersion = pgTable(
  "tree_version",
  {
    id: text("id").primaryKey(),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    changeDescription: text("change_description"), // Human-readable description of what changed
    // Snapshots of the tree data at this version point
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    membersSnapshot: jsonb("members_snapshot").$type<any[]>().notNull(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    relationshipsSnapshot: jsonb("relationships_snapshot").$type<any[]>().notNull(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marriagesSnapshot: jsonb("marriages_snapshot").$type<any[]>().notNull(),
    // Who created this version
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_tree_version_family_tree_id").on(table.familyTreeId),
    index("idx_tree_version_created_at").on(table.createdAt),
    index("idx_tree_version_version_number").on(table.versionNumber),
  ]
);

// Tree Change Log table - Detailed audit trail of individual changes
export const treeChangeLog = pgTable(
  "tree_change_log",
  {
    id: text("id").primaryKey(),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    versionId: text("version_id")
      .notNull()
      .references(() => treeVersion.id, { onDelete: "cascade" }),
    changeType: treeChangeTypeEnum("change_type").notNull(),
    entityType: treeEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(), // ID of the affected entity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    oldData: jsonb("old_data").$type<any>(), // Previous state (null for additions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newData: jsonb("new_data").$type<any>(), // New state (null for deletions)
    description: text("description"), // Human-readable summary of the change
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_tree_change_log_family_tree_id").on(table.familyTreeId),
    index("idx_tree_change_log_version_id").on(table.versionId),
    index("idx_tree_change_log_created_at").on(table.createdAt),
    index("idx_tree_change_log_entity_type").on(table.entityType),
  ]
);

// Tree Collaborator table - Manages access for family members to trees
export const treeCollaborator = pgTable(
  "tree_collaborator",
  {
    id: text("id").primaryKey(),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: treeCollaboratorRoleEnum("role")
      .$default(() => "viewer")
      .notNull(),
    // Granular visibility settings for this collaborator
    canViewSensitiveInfo: boolean("can_view_sensitive_info")
      .$default(() => true)
      .notNull(), // e.g., death dates, birth places
    canViewContactInfo: boolean("can_view_contact_info")
      .$default(() => false)
      .notNull(), // e.g., email, phone (if stored)
    invitedAt: timestamp("invited_at")
      .$defaultFn(() => new Date())
      .notNull(),
    acceptedAt: timestamp("accepted_at"), // null until user accepts invitation
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_tree_collaborator_family_tree_id").on(table.familyTreeId),
    index("idx_tree_collaborator_user_id").on(table.userId),
  ]
);

// Tree Access Invitation table - Pending invitations for email-based sharing
export const treeAccessInvitation = pgTable(
  "tree_access_invitation",
  {
    id: text("id").primaryKey(),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    inviteeEmail: text("invitee_email").notNull(),
    role: treeCollaboratorRoleEnum("role")
      .$default(() => "viewer")
      .notNull(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_tree_access_invitation_family_tree_id").on(table.familyTreeId),
    index("idx_tree_access_invitation_invitee_email").on(table.inviteeEmail),
    index("idx_tree_access_invitation_token").on(table.token),
    index("idx_tree_access_invitation_invited_by_user_id").on(table.invitedByUserId),
  ]
);

// Family Tree Relations
export const familyTreeRelations = relations(familyTree, ({ one, many }) => ({
  owner: one(user, {
    fields: [familyTree.ownerId],
    references: [user.id],
  }),
  members: many(familyMember),
  parentChildRelationships: many(parentChildRelationship),
  marriages: many(marriageConnection),
  collaborators: many(treeCollaborator),
  invitations: many(treeAccessInvitation),
  versions: many(treeVersion),
  changeLogs: many(treeChangeLog),
}));

// Tree Version Relations
export const treeVersionRelations = relations(treeVersion, ({ one, many }) => ({
  familyTree: one(familyTree, {
    fields: [treeVersion.familyTreeId],
    references: [familyTree.id],
  }),
  createdBy: one(user, {
    fields: [treeVersion.createdByUserId],
    references: [user.id],
  }),
  changeLogs: many(treeChangeLog),
}));

// Tree Change Log Relations
export const treeChangeLogRelations = relations(treeChangeLog, ({ one }) => ({
  familyTree: one(familyTree, {
    fields: [treeChangeLog.familyTreeId],
    references: [familyTree.id],
  }),
  version: one(treeVersion, {
    fields: [treeChangeLog.versionId],
    references: [treeVersion.id],
  }),
  createdBy: one(user, {
    fields: [treeChangeLog.createdByUserId],
    references: [user.id],
  }),
}));

// Tree Collaborator Relations
export const treeCollaboratorRelations = relations(treeCollaborator, ({ one }) => ({
  familyTree: one(familyTree, {
    fields: [treeCollaborator.familyTreeId],
    references: [familyTree.id],
  }),
  user: one(user, {
    fields: [treeCollaborator.userId],
    references: [user.id],
  }),
}));

// Tree Access Invitation Relations
export const treeAccessInvitationRelations = relations(treeAccessInvitation, ({ one }) => ({
  familyTree: one(familyTree, {
    fields: [treeAccessInvitation.familyTreeId],
    references: [familyTree.id],
  }),
  invitedBy: one(user, {
    fields: [treeAccessInvitation.invitedByUserId],
    references: [user.id],
  }),
}));

export const familyMemberRelations = relations(familyMember, ({ one, many }) => ({
  familyTree: one(familyTree, {
    fields: [familyMember.familyTreeId],
    references: [familyTree.id],
  }),
  linkedUser: one(user, {
    fields: [familyMember.linkedUserId],
    references: [user.id],
  }),
  // Parent relationships where this member is the parent
  childrenRelationships: many(parentChildRelationship, {
    relationName: "parentRelations",
  }),
  // Parent relationships where this member is the child
  parentRelationships: many(parentChildRelationship, {
    relationName: "childRelations",
  }),
  // Marriage relationships where this member is spouse1
  marriagesAsSpouse1: many(marriageConnection, {
    relationName: "spouse1Marriages",
  }),
  // Marriage relationships where this member is spouse2
  marriagesAsSpouse2: many(marriageConnection, {
    relationName: "spouse2Marriages",
  }),
  // Stories associated with this member
  stories: many(familyMemberStory),
}));

export const parentChildRelationshipRelations = relations(
  parentChildRelationship,
  ({ one }) => ({
    familyTree: one(familyTree, {
      fields: [parentChildRelationship.familyTreeId],
      references: [familyTree.id],
    }),
    parent: one(familyMember, {
      fields: [parentChildRelationship.parentId],
      references: [familyMember.id],
      relationName: "parentRelations",
    }),
    child: one(familyMember, {
      fields: [parentChildRelationship.childId],
      references: [familyMember.id],
      relationName: "childRelations",
    }),
  })
);

export const marriageConnectionRelations = relations(
  marriageConnection,
  ({ one }) => ({
    familyTree: one(familyTree, {
      fields: [marriageConnection.familyTreeId],
      references: [familyTree.id],
    }),
    spouse1: one(familyMember, {
      fields: [marriageConnection.spouse1Id],
      references: [familyMember.id],
      relationName: "spouse1Marriages",
    }),
    spouse2: one(familyMember, {
      fields: [marriageConnection.spouse2Id],
      references: [familyMember.id],
      relationName: "spouse2Marriages",
    }),
  })
);

// ============================================
// Member Media Schema
// ============================================

// Enum for media types
export const memberMediaTypeEnum = pgEnum("member_media_type", ["image", "video"]);

// Member Media table - Photos and videos associated with family members
export const memberMedia = pgTable(
  "member_media",
  {
    id: text("id").primaryKey(),
    familyMemberId: text("family_member_id")
      .notNull()
      .references(() => familyMember.id, { onDelete: "cascade" }),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    type: memberMediaTypeEnum("type").notNull(),
    publicId: text("public_id").notNull(), // Cloudinary public_id
    url: text("url").notNull(), // Cloudinary secure_url
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type").notNull(),
    caption: text("caption"),
    position: integer("position").$default(() => 0).notNull(),
    uploadedByUserId: text("uploaded_by_user_id")
      .references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_member_media_family_member_id").on(table.familyMemberId),
    index("idx_member_media_family_tree_id").on(table.familyTreeId),
    index("idx_member_media_uploaded_by").on(table.uploadedByUserId),
  ]
);

// Member Media Relations
export const memberMediaRelations = relations(memberMedia, ({ one }) => ({
  familyMember: one(familyMember, {
    fields: [memberMedia.familyMemberId],
    references: [familyMember.id],
  }),
  familyTree: one(familyTree, {
    fields: [memberMedia.familyTreeId],
    references: [familyTree.id],
  }),
  uploadedBy: one(user, {
    fields: [memberMedia.uploadedByUserId],
    references: [user.id],
  }),
}));

// Type exports
export type User = typeof user.$inferSelect;
export type CreateUserData = typeof user.$inferInsert;
export type UpdateUserData = Partial<Omit<CreateUserData, "id" | "createdAt">>;

export type UserProfile = typeof userProfile.$inferSelect;
export type CreateUserProfileData = typeof userProfile.$inferInsert;
export type UpdateUserProfileData = Partial<Omit<CreateUserProfileData, "id">>;

// Family Tree types
export type FamilyTree = typeof familyTree.$inferSelect;
export type CreateFamilyTreeData = typeof familyTree.$inferInsert;
export type UpdateFamilyTreeData = Partial<
  Omit<CreateFamilyTreeData, "id" | "createdAt" | "ownerId">
>;

export type FamilyMember = typeof familyMember.$inferSelect;
export type CreateFamilyMemberData = typeof familyMember.$inferInsert;
export type UpdateFamilyMemberData = Partial<
  Omit<CreateFamilyMemberData, "id" | "createdAt" | "familyTreeId">
>;

export type ParentChildRelationship = typeof parentChildRelationship.$inferSelect;
export type CreateParentChildRelationshipData =
  typeof parentChildRelationship.$inferInsert;
export type UpdateParentChildRelationshipData = Partial<
  Omit<CreateParentChildRelationshipData, "id" | "createdAt" | "familyTreeId">
>;

export type MarriageConnection = typeof marriageConnection.$inferSelect;
export type CreateMarriageConnectionData = typeof marriageConnection.$inferInsert;
export type UpdateMarriageConnectionData = Partial<
  Omit<CreateMarriageConnectionData, "id" | "createdAt" | "familyTreeId">
>;

// Tree Collaborator types
export type TreeCollaborator = typeof treeCollaborator.$inferSelect;
export type CreateTreeCollaboratorData = typeof treeCollaborator.$inferInsert;
export type UpdateTreeCollaboratorData = Partial<
  Omit<CreateTreeCollaboratorData, "id" | "createdAt" | "familyTreeId" | "userId">
>;

// Tree Access Invitation types
export type TreeAccessInvitation = typeof treeAccessInvitation.$inferSelect;
export type CreateTreeAccessInvitationData = typeof treeAccessInvitation.$inferInsert;

// Enum value types
export type Gender = (typeof genderEnum.enumValues)[number];
export type RelationshipType = (typeof relationshipTypeEnum.enumValues)[number];
export type MarriageStatus = (typeof marriageStatusEnum.enumValues)[number];
export type TreePrivacyLevel = (typeof treePrivacyLevelEnum.enumValues)[number];
export type TreeCollaboratorRole = (typeof treeCollaboratorRoleEnum.enumValues)[number];

// Tree Version types
export type TreeVersion = typeof treeVersion.$inferSelect;
export type CreateTreeVersionData = typeof treeVersion.$inferInsert;

export type TreeChangeLog = typeof treeChangeLog.$inferSelect;
export type CreateTreeChangeLogData = typeof treeChangeLog.$inferInsert;

// Tree version enum types
export type TreeChangeType = (typeof treeChangeTypeEnum.enumValues)[number];
export type TreeEntityType = (typeof treeEntityTypeEnum.enumValues)[number];

// Member Media types
export type MemberMedia = typeof memberMedia.$inferSelect;
export type CreateMemberMediaData = typeof memberMedia.$inferInsert;
export type UpdateMemberMediaData = Partial<
  Omit<CreateMemberMediaData, "id" | "createdAt" | "familyMemberId" | "familyTreeId">
>;
export type MemberMediaType = (typeof memberMediaTypeEnum.enumValues)[number];

// ============================================
// Post Attachment Schema
// ============================================

// Enum for attachment types
export const attachmentTypeEnum = pgEnum("attachment_type", ["image", "video"]);

// Post Attachment table - Media attachments for posts and comments
export const postAttachment = pgTable(
  "post_attachment",
  {
    id: text("id").primaryKey(),
    postId: text("post_id"), // Nullable - attachment can be for post or comment
    commentId: text("comment_id"), // Nullable - attachment can be for post or comment
    type: attachmentTypeEnum("type").notNull(),
    publicId: text("public_id").notNull(), // Cloudinary public_id
    url: text("url").notNull(), // Cloudinary secure_url
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type").notNull(),
    position: integer("position").$default(() => 0).notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_post_attachment_post_id").on(table.postId),
    index("idx_post_attachment_comment_id").on(table.commentId),
  ]
);

// Post Attachment types
export type PostAttachment = typeof postAttachment.$inferSelect;
export type CreatePostAttachmentData = typeof postAttachment.$inferInsert;
export type UpdatePostAttachmentData = Partial<
  Omit<CreatePostAttachmentData, "id" | "createdAt">
>;
export type AttachmentType = (typeof attachmentTypeEnum.enumValues)[number];

// ============================================
// Member Stories/Documents Schema
// ============================================

// Enum for story types
export const storyTypeEnum = pgEnum("story_type", [
  "biography",
  "memory",
  "story",
  "document",
  "milestone",
]);

// Family Member Story table - Stories, documents, and biographical information
export const familyMemberStory = pgTable(
  "family_member_story",
  {
    id: text("id").primaryKey(),
    familyMemberId: text("family_member_id")
      .notNull()
      .references(() => familyMember.id, { onDelete: "cascade" }),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    storyType: storyTypeEnum("story_type")
      .$default(() => "story")
      .notNull(),
    eventDate: date("event_date"), // Optional date associated with the story
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_story_family_member_id").on(table.familyMemberId),
    index("idx_story_family_tree_id").on(table.familyTreeId),
    index("idx_story_created_at").on(table.createdAt),
    index("idx_story_story_type").on(table.storyType),
  ]
);

// Family Member Story Relations
export const familyMemberStoryRelations = relations(familyMemberStory, ({ one }) => ({
  familyMember: one(familyMember, {
    fields: [familyMemberStory.familyMemberId],
    references: [familyMember.id],
  }),
  familyTree: one(familyTree, {
    fields: [familyMemberStory.familyTreeId],
    references: [familyTree.id],
  }),
  createdBy: one(user, {
    fields: [familyMemberStory.createdByUserId],
    references: [user.id],
  }),
}));

// Member Story types
export type FamilyMemberStory = typeof familyMemberStory.$inferSelect;
export type CreateFamilyMemberStoryData = typeof familyMemberStory.$inferInsert;
export type UpdateFamilyMemberStoryData = Partial<
  Omit<CreateFamilyMemberStoryData, "id" | "createdAt" | "familyMemberId" | "familyTreeId" | "createdByUserId">
>;
export type StoryType = (typeof storyTypeEnum.enumValues)[number];

// ============================================
// Family Member Timeline Events Schema
// ============================================

// Enum for timeline event types
export const familyMemberEventTypeEnum = pgEnum("family_member_event_type", [
  "birth",
  "death",
  "marriage",
  "divorce",
  "child_born",
  "graduation",
  "career",
  "achievement",
  "residence",
  "medical",
  "military",
  "religious",
  "other",
]);

// Family Member Event table - Timeline events for family members
export const familyMemberEvent = pgTable(
  "family_member_event",
  {
    id: text("id").primaryKey(),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    familyMemberId: text("family_member_id")
      .notNull()
      .references(() => familyMember.id, { onDelete: "cascade" }),
    eventType: familyMemberEventTypeEnum("event_type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    eventDate: date("event_date"),
    eventYear: integer("event_year"), // For partial dates (year only)
    location: text("location"),
    // Optional reference to related family member (e.g., spouse for marriage, child for child_born)
    relatedMemberId: text("related_member_id").references(
      () => familyMember.id,
      { onDelete: "set null" }
    ),
    // Indicates if this event was auto-generated from existing data or manually added
    isAutoGenerated: boolean("is_auto_generated")
      .$default(() => false)
      .notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_family_member_event_family_tree_id").on(table.familyTreeId),
    index("idx_family_member_event_family_member_id").on(table.familyMemberId),
    index("idx_family_member_event_event_date").on(table.eventDate),
    index("idx_family_member_event_event_type").on(table.eventType),
  ]
);

// Family Member Event Relations
export const familyMemberEventRelations = relations(familyMemberEvent, ({ one }) => ({
  familyTree: one(familyTree, {
    fields: [familyMemberEvent.familyTreeId],
    references: [familyTree.id],
  }),
  familyMember: one(familyMember, {
    fields: [familyMemberEvent.familyMemberId],
    references: [familyMember.id],
  }),
  relatedMember: one(familyMember, {
    fields: [familyMemberEvent.relatedMemberId],
    references: [familyMember.id],
  }),
}));

// Family Member Event types
export type FamilyMemberEvent = typeof familyMemberEvent.$inferSelect;
export type CreateFamilyMemberEventData = typeof familyMemberEvent.$inferInsert;
export type UpdateFamilyMemberEventData = Partial<
  Omit<CreateFamilyMemberEventData, "id" | "createdAt" | "familyMemberId" | "familyTreeId">
>;
export type FamilyMemberEventType = (typeof familyMemberEventTypeEnum.enumValues)[number];

// ============================================
// Real-time Collaboration Schema
// ============================================

// Enum for collaboration session status
export const collaborationSessionStatusEnum = pgEnum("collaboration_session_status", [
  "active",
  "idle",
  "editing",
  "disconnected",
]);

// Collaboration Session table - Tracks active users on a tree
export const collaborationSession = pgTable(
  "collaboration_session",
  {
    id: text("id").primaryKey(),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: collaborationSessionStatusEnum("status")
      .$default(() => "active")
      .notNull(),
    // Current cursor/viewport position (optional)
    cursorX: integer("cursor_x"),
    cursorY: integer("cursor_y"),
    viewportZoom: integer("viewport_zoom"),
    // Entity being edited (for lock indicators)
    editingEntityId: text("editing_entity_id"),
    editingEntityType: treeEntityTypeEnum("editing_entity_type"),
    // Timestamps
    lastHeartbeat: timestamp("last_heartbeat")
      .$defaultFn(() => new Date())
      .notNull(),
    connectedAt: timestamp("connected_at")
      .$defaultFn(() => new Date())
      .notNull(),
    disconnectedAt: timestamp("disconnected_at"),
  },
  (table) => [
    index("idx_collaboration_session_family_tree_id").on(table.familyTreeId),
    index("idx_collaboration_session_user_id").on(table.userId),
    index("idx_collaboration_session_status").on(table.status),
    index("idx_collaboration_session_last_heartbeat").on(table.lastHeartbeat),
  ]
);

// Collaboration Session Relations
export const collaborationSessionRelations = relations(collaborationSession, ({ one }) => ({
  familyTree: one(familyTree, {
    fields: [collaborationSession.familyTreeId],
    references: [familyTree.id],
  }),
  user: one(user, {
    fields: [collaborationSession.userId],
    references: [user.id],
  }),
}));

// Real-time Tree Activity table - Broadcasts changes to all connected users
export const treeActivity = pgTable(
  "tree_activity",
  {
    id: text("id").primaryKey(),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Activity type matches tree change type for consistency
    activityType: treeChangeTypeEnum("activity_type").notNull(),
    entityType: treeEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    // Activity details
    entityName: text("entity_name"), // Human-readable name for UI display
    description: text("description"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: jsonb("metadata").$type<any>(), // Additional data for the activity
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_tree_activity_family_tree_id").on(table.familyTreeId),
    index("idx_tree_activity_user_id").on(table.userId),
    index("idx_tree_activity_created_at").on(table.createdAt),
  ]
);

// Tree Activity Relations
export const treeActivityRelations = relations(treeActivity, ({ one }) => ({
  familyTree: one(familyTree, {
    fields: [treeActivity.familyTreeId],
    references: [familyTree.id],
  }),
  user: one(user, {
    fields: [treeActivity.userId],
    references: [user.id],
  }),
}));

// Edit Lock table - Prevents concurrent edits with optimistic locking
export const editLock = pgTable(
  "edit_lock",
  {
    id: text("id").primaryKey(),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    entityId: text("entity_id").notNull(),
    entityType: treeEntityTypeEnum("entity_type").notNull(),
    lockedByUserId: text("locked_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lockedAt: timestamp("locked_at")
      .$defaultFn(() => new Date())
      .notNull(),
    expiresAt: timestamp("expires_at").notNull(), // Lock auto-expires
    // Version number for optimistic concurrency control
    version: integer("version").$default(() => 1).notNull(),
  },
  (table) => [
    index("idx_edit_lock_family_tree_id").on(table.familyTreeId),
    index("idx_edit_lock_entity").on(table.entityId, table.entityType),
    index("idx_edit_lock_locked_by").on(table.lockedByUserId),
    index("idx_edit_lock_expires_at").on(table.expiresAt),
  ]
);

// Edit Lock Relations
export const editLockRelations = relations(editLock, ({ one }) => ({
  familyTree: one(familyTree, {
    fields: [editLock.familyTreeId],
    references: [familyTree.id],
  }),
  lockedBy: one(user, {
    fields: [editLock.lockedByUserId],
    references: [user.id],
  }),
}));

// Collaboration Session types
export type CollaborationSession = typeof collaborationSession.$inferSelect;
export type CreateCollaborationSessionData = typeof collaborationSession.$inferInsert;
export type UpdateCollaborationSessionData = Partial<
  Omit<CreateCollaborationSessionData, "id" | "connectedAt" | "familyTreeId" | "userId">
>;
export type CollaborationSessionStatus = (typeof collaborationSessionStatusEnum.enumValues)[number];

// Tree Activity types
export type TreeActivity = typeof treeActivity.$inferSelect;
export type CreateTreeActivityData = typeof treeActivity.$inferInsert;

// Edit Lock types
export type EditLock = typeof editLock.$inferSelect;
export type CreateEditLockData = typeof editLock.$inferInsert;
export type UpdateEditLockData = Partial<
  Omit<CreateEditLockData, "id" | "lockedAt" | "familyTreeId" | "entityId" | "entityType">
>;

// ============================================
// Genealogy Database Integration Schema
// ============================================

// Enum for genealogy service providers
export const genealogyServiceEnum = pgEnum("genealogy_service", [
  "familysearch",
  "ancestry",
  "myheritage",
  "findmypast",
  "gedmatch",
]);

// Enum for import status
export const genealogyImportStatusEnum = pgEnum("genealogy_import_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
]);

// Genealogy Service Connection table - Stores user's connected genealogy accounts
export const genealogyServiceConnection = pgTable(
  "genealogy_service_connection",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    service: genealogyServiceEnum("service").notNull(),
    // Encrypted credentials/tokens
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at"),
    // Service-specific user identifier
    externalUserId: text("external_user_id"),
    externalUsername: text("external_username"),
    // Connection status
    isActive: boolean("is_active")
      .$default(() => true)
      .notNull(),
    lastSyncAt: timestamp("last_sync_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_genealogy_connection_user_id").on(table.userId),
    index("idx_genealogy_connection_service").on(table.service),
  ]
);

// Genealogy Import Session table - Tracks import operations from genealogy services
export const genealogyImportSession = pgTable(
  "genealogy_import_session",
  {
    id: text("id").primaryKey(),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    service: genealogyServiceEnum("service").notNull(),
    status: genealogyImportStatusEnum("status")
      .$default(() => "pending")
      .notNull(),
    // Import source details
    sourceTreeId: text("source_tree_id"), // External tree ID from the service
    sourceTreeName: text("source_tree_name"),
    // Import configuration
    importRelationships: boolean("import_relationships")
      .$default(() => true)
      .notNull(),
    importEvents: boolean("import_events")
      .$default(() => true)
      .notNull(),
    skipDuplicates: boolean("skip_duplicates")
      .$default(() => true)
      .notNull(),
    // Import results
    membersImported: integer("members_imported").$default(() => 0).notNull(),
    relationshipsImported: integer("relationships_imported").$default(() => 0).notNull(),
    eventsImported: integer("events_imported").$default(() => 0).notNull(),
    duplicatesSkipped: integer("duplicates_skipped").$default(() => 0).notNull(),
    errorsCount: integer("errors_count").$default(() => 0).notNull(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errorDetails: jsonb("error_details").$type<any[]>(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    importLog: jsonb("import_log").$type<any[]>(),
    // Timestamps
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_genealogy_import_family_tree_id").on(table.familyTreeId),
    index("idx_genealogy_import_user_id").on(table.userId),
    index("idx_genealogy_import_status").on(table.status),
    index("idx_genealogy_import_service").on(table.service),
  ]
);

// External Member Reference table - Maps local members to external genealogy records
export const externalMemberReference = pgTable(
  "external_member_reference",
  {
    id: text("id").primaryKey(),
    familyMemberId: text("family_member_id")
      .notNull()
      .references(() => familyMember.id, { onDelete: "cascade" }),
    familyTreeId: text("family_tree_id")
      .notNull()
      .references(() => familyTree.id, { onDelete: "cascade" }),
    service: genealogyServiceEnum("service").notNull(),
    externalId: text("external_id").notNull(), // ID in the external service
    externalUrl: text("external_url"), // Link to the record in the external service
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    externalData: jsonb("external_data").$type<any>(), // Cached data from the external service
    lastSyncAt: timestamp("last_sync_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_external_member_family_member_id").on(table.familyMemberId),
    index("idx_external_member_family_tree_id").on(table.familyTreeId),
    index("idx_external_member_service").on(table.service),
    index("idx_external_member_external_id").on(table.externalId),
  ]
);

// Genealogy Service Connection Relations
export const genealogyServiceConnectionRelations = relations(genealogyServiceConnection, ({ one }) => ({
  user: one(user, {
    fields: [genealogyServiceConnection.userId],
    references: [user.id],
  }),
}));

// Genealogy Import Session Relations
export const genealogyImportSessionRelations = relations(genealogyImportSession, ({ one }) => ({
  familyTree: one(familyTree, {
    fields: [genealogyImportSession.familyTreeId],
    references: [familyTree.id],
  }),
  user: one(user, {
    fields: [genealogyImportSession.userId],
    references: [user.id],
  }),
}));

// External Member Reference Relations
export const externalMemberReferenceRelations = relations(externalMemberReference, ({ one }) => ({
  familyMember: one(familyMember, {
    fields: [externalMemberReference.familyMemberId],
    references: [familyMember.id],
  }),
  familyTree: one(familyTree, {
    fields: [externalMemberReference.familyTreeId],
    references: [familyTree.id],
  }),
}));

// Genealogy Service Connection types
export type GenealogyServiceConnection = typeof genealogyServiceConnection.$inferSelect;
export type CreateGenealogyServiceConnectionData = typeof genealogyServiceConnection.$inferInsert;
export type UpdateGenealogyServiceConnectionData = Partial<
  Omit<CreateGenealogyServiceConnectionData, "id" | "createdAt" | "userId">
>;
export type GenealogyService = (typeof genealogyServiceEnum.enumValues)[number];

// Genealogy Import Session types
export type GenealogyImportSession = typeof genealogyImportSession.$inferSelect;
export type CreateGenealogyImportSessionData = typeof genealogyImportSession.$inferInsert;
export type UpdateGenealogyImportSessionData = Partial<
  Omit<CreateGenealogyImportSessionData, "id" | "createdAt" | "familyTreeId" | "userId">
>;
export type GenealogyImportStatus = (typeof genealogyImportStatusEnum.enumValues)[number];

// External Member Reference types
export type ExternalMemberReference = typeof externalMemberReference.$inferSelect;
export type CreateExternalMemberReferenceData = typeof externalMemberReference.$inferInsert;
export type UpdateExternalMemberReferenceData = Partial<
  Omit<CreateExternalMemberReferenceData, "id" | "createdAt" | "familyMemberId" | "familyTreeId">
>;

// ============================================
// Notification Schema
// ============================================

// Enum for notification types
export const notificationTypeEnum = pgEnum("notification_type", [
  "TREE_MEMBER_ADDED",
  "TREE_MEMBER_UPDATED",
  "TREE_MEMBER_DELETED",
  "TREE_RELATIONSHIP_ADDED",
  "TREE_RELATIONSHIP_UPDATED",
  "TREE_RELATIONSHIP_DELETED",
  "TREE_MARRIAGE_ADDED",
  "TREE_MARRIAGE_UPDATED",
  "TREE_MARRIAGE_DELETED",
  "TREE_INVITATION",
  "TREE_ACCESS_GRANTED",
  "GENERAL",
]);

// Enum for related entity types
export const notificationRelatedTypeEnum = pgEnum("notification_related_type", [
  "FAMILY_TREE",
  "FAMILY_MEMBER",
  "RELATIONSHIP",
  "MARRIAGE",
  "USER",
]);

// Notification table - Stores user notifications
export const notification = pgTable(
  "notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    // Related entity for deep linking
    relatedId: text("related_id"),
    relatedType: notificationRelatedTypeEnum("related_type"),
    // Additional metadata for the notification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: jsonb("metadata").$type<any>(),
    // Read status
    isRead: boolean("is_read")
      .$default(() => false)
      .notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_notification_user_id").on(table.userId),
    index("idx_notification_type").on(table.type),
    index("idx_notification_is_read").on(table.isRead),
    index("idx_notification_created_at").on(table.createdAt),
  ]
);

// Notification Relations
export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
}));

// Notification types
export type Notification = typeof notification.$inferSelect;
export type CreateNotificationData = typeof notification.$inferInsert;
export type UpdateNotificationData = Partial<
  Omit<CreateNotificationData, "id" | "createdAt" | "userId">
>;
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
export type NotificationRelatedType = (typeof notificationRelatedTypeEnum.enumValues)[number];
