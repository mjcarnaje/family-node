import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { findFamilyTreeById } from "~/data-access/family-trees";
import { findFamilyMembersByTreeId } from "~/data-access/family-members";
import { findParentChildRelationshipsByTreeId } from "~/data-access/parent-child-relationships";
import { findMarriageConnectionsByTreeId } from "~/data-access/marriage-connections";
import type {
  FamilyMember,
  FamilyTree,
  ParentChildRelationship,
  MarriageConnection,
} from "~/db/schema";

// Types for tree comparison data
export interface TreeComparisonData {
  tree1: {
    tree: FamilyTree;
    members: FamilyMember[];
    relationships: ParentChildRelationship[];
    marriages: MarriageConnection[];
  };
  tree2: {
    tree: FamilyTree;
    members: FamilyMember[];
    relationships: ParentChildRelationship[];
    marriages: MarriageConnection[];
  };
  comparison: {
    membersOnlyInTree1: FamilyMember[];
    membersOnlyInTree2: FamilyMember[];
    membersInBoth: Array<{
      member1: FamilyMember;
      member2: FamilyMember;
      differences: string[];
    }>;
    relationshipsOnlyInTree1: ParentChildRelationship[];
    relationshipsOnlyInTree2: ParentChildRelationship[];
    marriagesOnlyInTree1: MarriageConnection[];
    marriagesOnlyInTree2: MarriageConnection[];
  };
}

/**
 * Compare members between two trees based on name matching
 */
function compareMembers(
  members1: FamilyMember[],
  members2: FamilyMember[]
): {
  membersOnlyInTree1: FamilyMember[];
  membersOnlyInTree2: FamilyMember[];
  membersInBoth: Array<{
    member1: FamilyMember;
    member2: FamilyMember;
    differences: string[];
  }>;
} {
  const membersOnlyInTree1: FamilyMember[] = [];
  const membersOnlyInTree2: FamilyMember[] = [];
  const membersInBoth: Array<{
    member1: FamilyMember;
    member2: FamilyMember;
    differences: string[];
  }> = [];

  // Create a map of tree2 members by full name for matching
  const tree2MembersByName = new Map<string, FamilyMember>();
  const matchedTree2Ids = new Set<string>();

  members2.forEach((member) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase().trim();
    tree2MembersByName.set(fullName, member);
  });

  // Compare each member from tree1
  members1.forEach((member1) => {
    const fullName = `${member1.firstName} ${member1.lastName}`.toLowerCase().trim();
    const member2 = tree2MembersByName.get(fullName);

    if (member2) {
      matchedTree2Ids.add(member2.id);
      const differences = getMemberDifferences(member1, member2);
      membersInBoth.push({ member1, member2, differences });
    } else {
      membersOnlyInTree1.push(member1);
    }
  });

  // Find members only in tree2
  members2.forEach((member) => {
    if (!matchedTree2Ids.has(member.id)) {
      membersOnlyInTree2.push(member);
    }
  });

  return { membersOnlyInTree1, membersOnlyInTree2, membersInBoth };
}

/**
 * Get differences between two family members
 */
function getMemberDifferences(
  member1: FamilyMember,
  member2: FamilyMember
): string[] {
  const differences: string[] = [];
  const fieldsToCompare = [
    { key: "middleName", label: "middle name" },
    { key: "nickname", label: "nickname" },
    { key: "gender", label: "gender" },
    { key: "birthDate", label: "birth date" },
    { key: "birthPlace", label: "birth place" },
    { key: "deathDate", label: "death date" },
    { key: "deathPlace", label: "death place" },
    { key: "bio", label: "biography" },
  ] as const;

  fieldsToCompare.forEach(({ key, label }) => {
    const val1 = member1[key];
    const val2 = member2[key];

    // Handle date comparison
    if (key === "birthDate" || key === "deathDate") {
      const date1 = val1 ? new Date(val1 as string).toISOString().split("T")[0] : null;
      const date2 = val2 ? new Date(val2 as string).toISOString().split("T")[0] : null;
      if (date1 !== date2) {
        differences.push(label);
      }
    } else if (String(val1 || "") !== String(val2 || "")) {
      differences.push(label);
    }
  });

  return differences;
}

/**
 * Compare relationships between two trees
 */
function compareRelationships(
  relationships1: ParentChildRelationship[],
  relationships2: ParentChildRelationship[],
  memberMapping: Map<string, string> // tree1 member ID -> tree2 member ID
): {
  relationshipsOnlyInTree1: ParentChildRelationship[];
  relationshipsOnlyInTree2: ParentChildRelationship[];
} {
  const relationshipsOnlyInTree1: ParentChildRelationship[] = [];
  const matchedTree2Ids = new Set<string>();

  // For each relationship in tree1, find matching in tree2
  relationships1.forEach((rel1) => {
    const mappedParentId = memberMapping.get(rel1.parentId);
    const mappedChildId = memberMapping.get(rel1.childId);

    if (mappedParentId && mappedChildId) {
      const matchingRel = relationships2.find(
        (rel2) =>
          rel2.parentId === mappedParentId && rel2.childId === mappedChildId
      );

      if (matchingRel) {
        matchedTree2Ids.add(matchingRel.id);
      } else {
        relationshipsOnlyInTree1.push(rel1);
      }
    } else {
      relationshipsOnlyInTree1.push(rel1);
    }
  });

  const relationshipsOnlyInTree2 = relationships2.filter(
    (rel) => !matchedTree2Ids.has(rel.id)
  );

  return { relationshipsOnlyInTree1, relationshipsOnlyInTree2 };
}

/**
 * Compare marriages between two trees
 */
function compareMarriages(
  marriages1: MarriageConnection[],
  marriages2: MarriageConnection[],
  memberMapping: Map<string, string>
): {
  marriagesOnlyInTree1: MarriageConnection[];
  marriagesOnlyInTree2: MarriageConnection[];
} {
  const marriagesOnlyInTree1: MarriageConnection[] = [];
  const matchedTree2Ids = new Set<string>();

  marriages1.forEach((marriage1) => {
    const mappedSpouse1Id = memberMapping.get(marriage1.spouse1Id);
    const mappedSpouse2Id = memberMapping.get(marriage1.spouse2Id);

    if (mappedSpouse1Id && mappedSpouse2Id) {
      const matchingMarriage = marriages2.find(
        (marriage2) =>
          (marriage2.spouse1Id === mappedSpouse1Id &&
            marriage2.spouse2Id === mappedSpouse2Id) ||
          (marriage2.spouse1Id === mappedSpouse2Id &&
            marriage2.spouse2Id === mappedSpouse1Id)
      );

      if (matchingMarriage) {
        matchedTree2Ids.add(matchingMarriage.id);
      } else {
        marriagesOnlyInTree1.push(marriage1);
      }
    } else {
      marriagesOnlyInTree1.push(marriage1);
    }
  });

  const marriagesOnlyInTree2 = marriages2.filter(
    (marriage) => !matchedTree2Ids.has(marriage.id)
  );

  return { marriagesOnlyInTree1, marriagesOnlyInTree2 };
}

/**
 * Get all data needed for comparing two family trees
 * Requires authentication and access to both trees
 */
export const getTreeComparisonDataFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      treeId1: z.string().min(1, "First tree ID is required"),
      treeId2: z.string().min(1, "Second tree ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<TreeComparisonData> => {
    // Verify access to both family trees
    const [tree1, tree2] = await Promise.all([
      findFamilyTreeById(data.treeId1),
      findFamilyTreeById(data.treeId2),
    ]);

    if (!tree1) {
      throw new Error("First family tree not found");
    }
    if (!tree2) {
      throw new Error("Second family tree not found");
    }

    // Check access to tree1
    const isOwner1 = tree1.ownerId === context.userId;
    const isPublic1 = tree1.isPublic;
    if (!isOwner1 && !isPublic1) {
      throw new Error(
        "Unauthorized: You don't have permission to view the first family tree"
      );
    }

    // Check access to tree2
    const isOwner2 = tree2.ownerId === context.userId;
    const isPublic2 = tree2.isPublic;
    if (!isOwner2 && !isPublic2) {
      throw new Error(
        "Unauthorized: You don't have permission to view the second family tree"
      );
    }

    // Fetch all data for both trees in parallel
    const [members1, relationships1, marriages1, members2, relationships2, marriages2] =
      await Promise.all([
        findFamilyMembersByTreeId(data.treeId1),
        findParentChildRelationshipsByTreeId(data.treeId1),
        findMarriageConnectionsByTreeId(data.treeId1),
        findFamilyMembersByTreeId(data.treeId2),
        findParentChildRelationshipsByTreeId(data.treeId2),
        findMarriageConnectionsByTreeId(data.treeId2),
      ]);

    // Compare members
    const { membersOnlyInTree1, membersOnlyInTree2, membersInBoth } = compareMembers(
      members1,
      members2
    );

    // Build member mapping for relationship/marriage comparison
    const memberMapping = new Map<string, string>();
    membersInBoth.forEach(({ member1, member2 }) => {
      memberMapping.set(member1.id, member2.id);
    });

    // Compare relationships
    const { relationshipsOnlyInTree1, relationshipsOnlyInTree2 } = compareRelationships(
      relationships1,
      relationships2,
      memberMapping
    );

    // Compare marriages
    const { marriagesOnlyInTree1, marriagesOnlyInTree2 } = compareMarriages(
      marriages1,
      marriages2,
      memberMapping
    );

    return {
      tree1: {
        tree: tree1,
        members: members1,
        relationships: relationships1,
        marriages: marriages1,
      },
      tree2: {
        tree: tree2,
        members: members2,
        relationships: relationships2,
        marriages: marriages2,
      },
      comparison: {
        membersOnlyInTree1,
        membersOnlyInTree2,
        membersInBoth,
        relationshipsOnlyInTree1,
        relationshipsOnlyInTree2,
        marriagesOnlyInTree1,
        marriagesOnlyInTree2,
      },
    };
  });
