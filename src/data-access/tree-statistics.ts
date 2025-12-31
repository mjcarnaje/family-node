import { eq, count, sql, isNull, isNotNull, min, max } from "drizzle-orm";
import { database } from "~/db";
import {
  familyMember,
  parentChildRelationship,
  marriageConnection,
  type Gender,
} from "~/db/schema";

// ============================================
// Tree Statistics Data Access Layer
// ============================================

export interface TreeMemberStats {
  totalMembers: number;
  livingMembers: number;
  deceasedMembers: number;
  genderBreakdown: {
    male: number;
    female: number;
    other: number;
    unknown: number;
  };
}

export interface TreeRelationshipStats {
  totalParentChildRelationships: number;
  totalMarriages: number;
  relationshipTypeBreakdown: {
    biological: number;
    adopted: number;
    step: number;
    foster: number;
  };
}

export interface TreeAgeStats {
  oldestMember: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    age: number;
  } | null;
  youngestMember: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    age: number;
  } | null;
  averageAge: number | null;
}

export interface TreeGrowthData {
  year: number;
  month: number;
  membersAdded: number;
  cumulativeTotal: number;
}

// Get basic member statistics for a tree
export async function getTreeMemberStats(
  familyTreeId: string
): Promise<TreeMemberStats> {
  // Total members
  const [totalResult] = await database
    .select({ count: count() })
    .from(familyMember)
    .where(eq(familyMember.familyTreeId, familyTreeId));

  // Living members (no death date)
  const [livingResult] = await database
    .select({ count: count() })
    .from(familyMember)
    .where(
      sql`${familyMember.familyTreeId} = ${familyTreeId} AND ${familyMember.deathDate} IS NULL`
    );

  // Deceased members
  const [deceasedResult] = await database
    .select({ count: count() })
    .from(familyMember)
    .where(
      sql`${familyMember.familyTreeId} = ${familyTreeId} AND ${familyMember.deathDate} IS NOT NULL`
    );

  // Gender breakdown
  const genderResults = await database
    .select({
      gender: familyMember.gender,
      count: count(),
    })
    .from(familyMember)
    .where(eq(familyMember.familyTreeId, familyTreeId))
    .groupBy(familyMember.gender);

  const genderBreakdown = {
    male: 0,
    female: 0,
    other: 0,
    unknown: 0,
  };

  for (const row of genderResults) {
    if (row.gender === "male") {
      genderBreakdown.male = row.count;
    } else if (row.gender === "female") {
      genderBreakdown.female = row.count;
    } else if (row.gender === "other") {
      genderBreakdown.other = row.count;
    } else {
      genderBreakdown.unknown = row.count;
    }
  }

  return {
    totalMembers: totalResult?.count ?? 0,
    livingMembers: livingResult?.count ?? 0,
    deceasedMembers: deceasedResult?.count ?? 0,
    genderBreakdown,
  };
}

// Get relationship statistics for a tree
export async function getTreeRelationshipStats(
  familyTreeId: string
): Promise<TreeRelationshipStats> {
  // Total parent-child relationships
  const [parentChildResult] = await database
    .select({ count: count() })
    .from(parentChildRelationship)
    .where(eq(parentChildRelationship.familyTreeId, familyTreeId));

  // Total marriages
  const [marriageResult] = await database
    .select({ count: count() })
    .from(marriageConnection)
    .where(eq(marriageConnection.familyTreeId, familyTreeId));

  // Relationship type breakdown
  const relationshipTypeResults = await database
    .select({
      relationshipType: parentChildRelationship.relationshipType,
      count: count(),
    })
    .from(parentChildRelationship)
    .where(eq(parentChildRelationship.familyTreeId, familyTreeId))
    .groupBy(parentChildRelationship.relationshipType);

  const relationshipTypeBreakdown = {
    biological: 0,
    adopted: 0,
    step: 0,
    foster: 0,
  };

  for (const row of relationshipTypeResults) {
    if (row.relationshipType in relationshipTypeBreakdown) {
      relationshipTypeBreakdown[
        row.relationshipType as keyof typeof relationshipTypeBreakdown
      ] = row.count;
    }
  }

  return {
    totalParentChildRelationships: parentChildResult?.count ?? 0,
    totalMarriages: marriageResult?.count ?? 0,
    relationshipTypeBreakdown,
  };
}

// Calculate age from birth date
function calculateAge(birthDate: string, deathDate?: string | null): number {
  const birth = new Date(birthDate);
  const end = deathDate ? new Date(deathDate) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Get age statistics for a tree
export async function getTreeAgeStats(
  familyTreeId: string
): Promise<TreeAgeStats> {
  // Get all members with birth dates
  const members = await database
    .select({
      id: familyMember.id,
      firstName: familyMember.firstName,
      lastName: familyMember.lastName,
      birthDate: familyMember.birthDate,
      deathDate: familyMember.deathDate,
    })
    .from(familyMember)
    .where(
      sql`${familyMember.familyTreeId} = ${familyTreeId} AND ${familyMember.birthDate} IS NOT NULL`
    );

  if (members.length === 0) {
    return {
      oldestMember: null,
      youngestMember: null,
      averageAge: null,
    };
  }

  // Calculate ages and find oldest/youngest
  const membersWithAge = members
    .filter((m) => m.birthDate !== null)
    .map((m) => ({
      ...m,
      age: calculateAge(m.birthDate!, m.deathDate),
    }));

  if (membersWithAge.length === 0) {
    return {
      oldestMember: null,
      youngestMember: null,
      averageAge: null,
    };
  }

  // Sort by age to find oldest and youngest
  const sortedByAge = [...membersWithAge].sort((a, b) => b.age - a.age);
  const oldest = sortedByAge[0];
  const youngest = sortedByAge[sortedByAge.length - 1];

  // Calculate average age
  const totalAge = membersWithAge.reduce((sum, m) => sum + m.age, 0);
  const averageAge = Math.round(totalAge / membersWithAge.length);

  return {
    oldestMember: {
      id: oldest.id,
      firstName: oldest.firstName,
      lastName: oldest.lastName,
      birthDate: oldest.birthDate!,
      age: oldest.age,
    },
    youngestMember: {
      id: youngest.id,
      firstName: youngest.firstName,
      lastName: youngest.lastName,
      birthDate: youngest.birthDate!,
      age: youngest.age,
    },
    averageAge,
  };
}

// Get family growth over time
export async function getTreeGrowthData(
  familyTreeId: string
): Promise<TreeGrowthData[]> {
  // Get members grouped by creation month/year
  const growthResults = await database
    .select({
      year: sql<number>`EXTRACT(YEAR FROM ${familyMember.createdAt})::integer`,
      month: sql<number>`EXTRACT(MONTH FROM ${familyMember.createdAt})::integer`,
      membersAdded: count(),
    })
    .from(familyMember)
    .where(eq(familyMember.familyTreeId, familyTreeId))
    .groupBy(
      sql`EXTRACT(YEAR FROM ${familyMember.createdAt})`,
      sql`EXTRACT(MONTH FROM ${familyMember.createdAt})`
    )
    .orderBy(
      sql`EXTRACT(YEAR FROM ${familyMember.createdAt})`,
      sql`EXTRACT(MONTH FROM ${familyMember.createdAt})`
    );

  // Calculate cumulative totals
  let cumulative = 0;
  const growthData: TreeGrowthData[] = growthResults.map((row) => {
    cumulative += row.membersAdded;
    return {
      year: row.year,
      month: row.month,
      membersAdded: row.membersAdded,
      cumulativeTotal: cumulative,
    };
  });

  return growthData;
}

// Calculate generation count based on parent-child relationships
export async function getGenerationCount(
  familyTreeId: string
): Promise<number> {
  // Get all parent-child relationships
  const relationships = await database
    .select({
      parentId: parentChildRelationship.parentId,
      childId: parentChildRelationship.childId,
    })
    .from(parentChildRelationship)
    .where(eq(parentChildRelationship.familyTreeId, familyTreeId));

  if (relationships.length === 0) {
    // If no relationships, check if there are any members
    const [memberCount] = await database
      .select({ count: count() })
      .from(familyMember)
      .where(eq(familyMember.familyTreeId, familyTreeId));

    return memberCount?.count > 0 ? 1 : 0;
  }

  // Build a map of child -> parents
  const childToParents = new Map<string, Set<string>>();
  const allMembers = new Set<string>();

  for (const rel of relationships) {
    allMembers.add(rel.parentId);
    allMembers.add(rel.childId);

    if (!childToParents.has(rel.childId)) {
      childToParents.set(rel.childId, new Set());
    }
    childToParents.get(rel.childId)!.add(rel.parentId);
  }

  // Find root members (those who are not children of anyone)
  const rootMembers: string[] = [];
  for (const memberId of allMembers) {
    if (!childToParents.has(memberId)) {
      rootMembers.push(memberId);
    }
  }

  // BFS to calculate max depth (generations)
  const generations = new Map<string, number>();
  for (const root of rootMembers) {
    generations.set(root, 1);
  }

  // Process all members
  let changed = true;
  while (changed) {
    changed = false;
    for (const [childId, parents] of childToParents.entries()) {
      let maxParentGen = 0;
      for (const parentId of parents) {
        const parentGen = generations.get(parentId);
        if (parentGen !== undefined && parentGen > maxParentGen) {
          maxParentGen = parentGen;
        }
      }
      if (maxParentGen > 0) {
        const newGen = maxParentGen + 1;
        const currentGen = generations.get(childId) ?? 0;
        if (newGen > currentGen) {
          generations.set(childId, newGen);
          changed = true;
        }
      }
    }
  }

  // Return the maximum generation
  let maxGeneration = 0;
  for (const gen of generations.values()) {
    if (gen > maxGeneration) {
      maxGeneration = gen;
    }
  }

  return maxGeneration > 0 ? maxGeneration : 1;
}
