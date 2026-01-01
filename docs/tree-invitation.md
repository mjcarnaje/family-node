# Tree Invitation System

This document describes the invitation system for sharing family trees with collaborators.

## Overview

The tree invitation system allows tree owners and admins to invite others to collaborate on a family tree. Invitations are link-based, allowing users to copy and share an invite link through any communication channel.

## How It Works

### Invitation Flow

1. **Owner/Admin creates invitation** - Selects a role (viewer, editor, admin) and generates an invite link
2. **Link is shared** - User copies the link and shares it via email, messaging app, etc.
3. **Recipient clicks link** - Opens `/invitation/:token` page showing invitation details
4. **Recipient accepts** - If logged in, accepts directly. If not, signs in/up first, then accepts.
5. **Collaborator access granted** - Recipient is added as a collaborator with the specified role

### Key Concepts

#### Invitation Token
- Each invitation has a unique, secure token
- Token is used to identify the invitation in the URL
- Tokens are 24-character random strings for security

#### Expiration
- Invitations expire after **7 days**
- Expired invitations cannot be accepted
- Pending invitations can be cancelled before acceptance

#### Role Assignment
- **Viewer**: Can view the tree and its members
- **Editor**: Can view and edit tree content
- **Admin**: Can manage collaborators and tree settings (but not delete)

## Database Schema

### `treeAccessInvitation` Table

| Column | Type | Description |
|--------|------|-------------|
| id | string | Primary key |
| familyTreeId | string | Reference to the family tree |
| inviteeEmail | string | Email of the invited user (optional, used for matching) |
| role | enum | viewer, editor, or admin |
| invitedByUserId | string | User who created the invitation |
| token | string | Unique invitation token |
| expiresAt | timestamp | When the invitation expires |
| acceptedAt | timestamp | When the invitation was accepted (null if pending) |
| createdAt | timestamp | When the invitation was created |

### `treeCollaborator` Table

Created when an invitation is accepted:

| Column | Type | Description |
|--------|------|-------------|
| id | string | Primary key |
| familyTreeId | string | Reference to the family tree |
| userId | string | The collaborator's user ID |
| role | enum | viewer, editor, or admin |
| invitedAt | timestamp | When they were invited |
| acceptedAt | timestamp | When they accepted |

## API Functions

### Creating an Invitation

```typescript
// src/fn/tree-sharing.ts
createInviteLinkFn({
  familyTreeId: string,
  role: "viewer" | "editor" | "admin"
})
// Returns: { invitationLink: string, invitation: Invitation }
```

### Accepting an Invitation

```typescript
// By token (unauthenticated page)
acceptInvitationFn({ token: string })

// By ID (authenticated user)
acceptInvitationByIdFn({ invitationId: string })
```

### Cancelling an Invitation

```typescript
cancelInvitationFn({ token: string })
```

### Querying Invitations

```typescript
// Get invitation details by token (public)
getInvitationByTokenFn({ token: string })

// Get pending invitations for a tree (admin only)
getPendingInvitationsFn({ familyTreeId: string })

// Get user's pending invitations
getMyPendingInvitationsFn()
```

## UI Components

### TreeSharingDialog

Main dialog for managing tree sharing:
- Shows invite link generation with role selector
- Lists pending invitations with cancel option
- Lists current collaborators with role management

Location: `src/components/TreeSharingDialog.tsx`

### Invitation Landing Page

Handles invitation acceptance:
- Shows invitation details (tree name, inviter, role)
- Handles authentication flow if not logged in
- Validates invitation status (expired, already accepted)

Location: `src/routes/invitation/$token.tsx`

### PendingInvitations

Dashboard widget showing user's pending invitations:
- Quick accept/view options
- Shows expiration time

Location: `src/components/PendingInvitations.tsx`

## Permissions

| Action | Viewer | Editor | Admin | Owner |
|--------|--------|--------|-------|-------|
| View collaborators | Yes | Yes | Yes | Yes |
| Invite collaborators | No | No | Yes | Yes |
| Cancel invitations | No | No | Yes | Yes |
| Remove collaborators | No | No | Yes | Yes |
| Change collaborator roles | No | No | Yes | Yes |

## Security Considerations

1. **Token Security**: Tokens are cryptographically random and sufficiently long
2. **Expiration**: Invitations expire after 7 days to limit exposure
3. **Email Matching**: Optional email field helps verify intended recipient
4. **Permission Checks**: Only owners/admins can create invitations
5. **Duplicate Prevention**: System prevents duplicate invitations to same tree

## Error Handling

| Scenario | Error Message |
|----------|---------------|
| No permission to invite | "You do not have permission to invite collaborators to this tree" |
| Pending invitation exists | "An invitation has already been sent to this email" |
| Already a collaborator | "This user is already a collaborator on this tree" |
| Inviting owner | "This email belongs to the tree owner" |
| Invalid/expired token | "Invalid or expired invitation" |
| Already accepted | "This invitation has already been accepted" |

## Implementation Files

| File | Purpose |
|------|---------|
| `src/db/schema.ts` | Database schema definitions |
| `src/data-access/tree-sharing.ts` | Database operations |
| `src/fn/tree-sharing.ts` | Server functions |
| `src/queries/tree-sharing.ts` | TanStack Query definitions |
| `src/hooks/useTreeSharing.ts` | React hooks |
| `src/components/TreeSharingDialog.tsx` | Sharing dialog UI |
| `src/routes/invitation/$token.tsx` | Invitation landing page |
| `src/lib/role-permissions.ts` | Role definitions |
