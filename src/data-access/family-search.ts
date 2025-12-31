import { sql, and, eq, or, gte, lte } from "drizzle-orm";
import { database } from "~/db";
import {
  familyMember,
  familyMemberStory,
  familyMemberEvent,
  type FamilyMember,
  type FamilyMemberStory,
  type FamilyMemberEvent,
} from "~/db/schema";

/**
 * Search filter options for family tree search
 */
export interface SearchFilters {
  /** The search query string */
  query: string;
  /** Optional date range filter - start date */
  dateFrom?: string;
  /** Optional date range filter - end date */
  dateTo?: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Search result for a family member
 */
export interface MemberSearchResult extends FamilyMember {
  /** Search relevance rank (higher is more relevant) */
  rank: number;
  /** Type of result for UI display */
  resultType: "member";
  /** Headline with search term highlights */
  headline: string;
}

/**
 * Search result for a story
 */
export interface StorySearchResult extends FamilyMemberStory {
  /** Search relevance rank (higher is more relevant) */
  rank: number;
  /** Type of result for UI display */
  resultType: "story";
  /** Headline with search term highlights */
  headline: string;
}

/**
 * Search result for an event
 */
export interface EventSearchResult extends FamilyMemberEvent {
  /** Search relevance rank (higher is more relevant) */
  rank: number;
  /** Type of result for UI display */
  resultType: "event";
  /** Headline with search term highlights */
  headline: string;
}

/**
 * Combined search result type
 */
export type SearchResult = MemberSearchResult | StorySearchResult | EventSearchResult;

/**
 * Full-text search results with pagination info
 */
export interface SearchResults {
  members: MemberSearchResult[];
  stories: StorySearchResult[];
  events: EventSearchResult[];
  totalMembers: number;
  totalStories: number;
  totalEvents: number;
}

/**
 * Convert a search query to a tsquery-compatible format
 * Handles multi-word queries by converting to prefix search with AND operator
 */
function toSearchQuery(query: string): string {
  // Split by whitespace, filter empty strings, and join with & for AND operator
  // Add :* for prefix matching
  const words = query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => `${word}:*`)
    .join(" & ");

  return words || "";
}

/**
 * Search family members within a specific family tree using full-text search
 * Returns members ranked by relevance with highlighted matches
 */
export async function searchFamilyMembers(
  familyTreeId: string,
  filters: SearchFilters
): Promise<{ results: MemberSearchResult[]; total: number }> {
  const { query, dateFrom, dateTo, limit = 20, offset = 0 } = filters;
  const searchQuery = toSearchQuery(query);

  if (!searchQuery) {
    return { results: [], total: 0 };
  }

  // Build the where conditions
  const conditions = [eq(familyMember.familyTreeId, familyTreeId)];

  // Add date range filters if provided
  if (dateFrom) {
    conditions.push(
      or(
        gte(familyMember.birthDate, dateFrom),
        gte(familyMember.deathDate, dateFrom)
      )!
    );
  }
  if (dateTo) {
    conditions.push(
      or(
        lte(familyMember.birthDate, dateTo),
        lte(familyMember.deathDate, dateTo)
      )!
    );
  }

  // Execute the search query with ranking
  const results = await database
    .select({
      id: familyMember.id,
      familyTreeId: familyMember.familyTreeId,
      firstName: familyMember.firstName,
      middleName: familyMember.middleName,
      lastName: familyMember.lastName,
      nickname: familyMember.nickname,
      gender: familyMember.gender,
      birthDate: familyMember.birthDate,
      birthPlace: familyMember.birthPlace,
      deathDate: familyMember.deathDate,
      deathPlace: familyMember.deathPlace,
      bio: familyMember.bio,
      profileImageUrl: familyMember.profileImageUrl,
      linkedUserId: familyMember.linkedUserId,
      createdAt: familyMember.createdAt,
      updatedAt: familyMember.updatedAt,
      rank: sql<number>`ts_rank(search_vector, to_tsquery('english', ${searchQuery}))`,
      headline: sql<string>`ts_headline('english',
        COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(bio, ''),
        to_tsquery('english', ${searchQuery}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15'
      )`,
    })
    .from(familyMember)
    .where(
      and(
        ...conditions,
        sql`search_vector @@ to_tsquery('english', ${searchQuery})`
      )
    )
    .orderBy(sql`ts_rank(search_vector, to_tsquery('english', ${searchQuery})) DESC`)
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const [countResult] = await database
    .select({
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(familyMember)
    .where(
      and(
        ...conditions,
        sql`search_vector @@ to_tsquery('english', ${searchQuery})`
      )
    );

  const mappedResults: MemberSearchResult[] = results.map((result) => ({
    ...result,
    resultType: "member" as const,
  }));

  return {
    results: mappedResults,
    total: countResult?.count ?? 0,
  };
}

/**
 * Search family member stories within a specific family tree using full-text search
 */
export async function searchFamilyStories(
  familyTreeId: string,
  filters: SearchFilters
): Promise<{ results: StorySearchResult[]; total: number }> {
  const { query, dateFrom, dateTo, limit = 20, offset = 0 } = filters;
  const searchQuery = toSearchQuery(query);

  if (!searchQuery) {
    return { results: [], total: 0 };
  }

  // Build the where conditions
  const conditions = [eq(familyMemberStory.familyTreeId, familyTreeId)];

  // Add date range filters if provided
  if (dateFrom) {
    conditions.push(gte(familyMemberStory.eventDate, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(familyMemberStory.eventDate, dateTo));
  }

  // Execute the search query with ranking
  const results = await database
    .select({
      id: familyMemberStory.id,
      familyMemberId: familyMemberStory.familyMemberId,
      familyTreeId: familyMemberStory.familyTreeId,
      title: familyMemberStory.title,
      content: familyMemberStory.content,
      storyType: familyMemberStory.storyType,
      eventDate: familyMemberStory.eventDate,
      createdByUserId: familyMemberStory.createdByUserId,
      createdAt: familyMemberStory.createdAt,
      updatedAt: familyMemberStory.updatedAt,
      rank: sql<number>`ts_rank(search_vector, to_tsquery('english', ${searchQuery}))`,
      headline: sql<string>`ts_headline('english',
        COALESCE(title, '') || ' ' || COALESCE(content, ''),
        to_tsquery('english', ${searchQuery}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15'
      )`,
    })
    .from(familyMemberStory)
    .where(
      and(
        ...conditions,
        sql`search_vector @@ to_tsquery('english', ${searchQuery})`
      )
    )
    .orderBy(sql`ts_rank(search_vector, to_tsquery('english', ${searchQuery})) DESC`)
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const [countResult] = await database
    .select({
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(familyMemberStory)
    .where(
      and(
        ...conditions,
        sql`search_vector @@ to_tsquery('english', ${searchQuery})`
      )
    );

  const mappedResults: StorySearchResult[] = results.map((result) => ({
    ...result,
    resultType: "story" as const,
  }));

  return {
    results: mappedResults,
    total: countResult?.count ?? 0,
  };
}

/**
 * Search family member events within a specific family tree using full-text search
 */
export async function searchFamilyEvents(
  familyTreeId: string,
  filters: SearchFilters
): Promise<{ results: EventSearchResult[]; total: number }> {
  const { query, dateFrom, dateTo, limit = 20, offset = 0 } = filters;
  const searchQuery = toSearchQuery(query);

  if (!searchQuery) {
    return { results: [], total: 0 };
  }

  // Build the where conditions
  const conditions = [eq(familyMemberEvent.familyTreeId, familyTreeId)];

  // Add date range filters if provided
  if (dateFrom) {
    conditions.push(gte(familyMemberEvent.eventDate, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(familyMemberEvent.eventDate, dateTo));
  }

  // Execute the search query with ranking
  const results = await database
    .select({
      id: familyMemberEvent.id,
      familyTreeId: familyMemberEvent.familyTreeId,
      familyMemberId: familyMemberEvent.familyMemberId,
      eventType: familyMemberEvent.eventType,
      title: familyMemberEvent.title,
      description: familyMemberEvent.description,
      eventDate: familyMemberEvent.eventDate,
      eventYear: familyMemberEvent.eventYear,
      location: familyMemberEvent.location,
      relatedMemberId: familyMemberEvent.relatedMemberId,
      isAutoGenerated: familyMemberEvent.isAutoGenerated,
      createdAt: familyMemberEvent.createdAt,
      updatedAt: familyMemberEvent.updatedAt,
      rank: sql<number>`ts_rank(search_vector, to_tsquery('english', ${searchQuery}))`,
      headline: sql<string>`ts_headline('english',
        COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(location, ''),
        to_tsquery('english', ${searchQuery}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15'
      )`,
    })
    .from(familyMemberEvent)
    .where(
      and(
        ...conditions,
        sql`search_vector @@ to_tsquery('english', ${searchQuery})`
      )
    )
    .orderBy(sql`ts_rank(search_vector, to_tsquery('english', ${searchQuery})) DESC`)
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const [countResult] = await database
    .select({
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(familyMemberEvent)
    .where(
      and(
        ...conditions,
        sql`search_vector @@ to_tsquery('english', ${searchQuery})`
      )
    );

  const mappedResults: EventSearchResult[] = results.map((result) => ({
    ...result,
    resultType: "event" as const,
  }));

  return {
    results: mappedResults,
    total: countResult?.count ?? 0,
  };
}

/**
 * Perform a combined search across members, stories, and events
 * Returns results from all categories with relevance ranking
 */
export async function searchFamilyTree(
  familyTreeId: string,
  filters: SearchFilters
): Promise<SearchResults> {
  // Execute all searches in parallel for efficiency
  const [membersResult, storiesResult, eventsResult] = await Promise.all([
    searchFamilyMembers(familyTreeId, filters),
    searchFamilyStories(familyTreeId, filters),
    searchFamilyEvents(familyTreeId, filters),
  ]);

  return {
    members: membersResult.results,
    stories: storiesResult.results,
    events: eventsResult.results,
    totalMembers: membersResult.total,
    totalStories: storiesResult.total,
    totalEvents: eventsResult.total,
  };
}

/**
 * Quick search for family members by name only (for autocomplete)
 * Uses simpler matching without full-text search for speed
 */
export async function quickSearchFamilyMembers(
  familyTreeId: string,
  query: string,
  limit: number = 10
): Promise<FamilyMember[]> {
  if (!query.trim()) {
    return [];
  }

  const searchTerm = `%${query.trim().toLowerCase()}%`;

  return database
    .select()
    .from(familyMember)
    .where(
      and(
        eq(familyMember.familyTreeId, familyTreeId),
        or(
          sql`LOWER(first_name) LIKE ${searchTerm}`,
          sql`LOWER(last_name) LIKE ${searchTerm}`,
          sql`LOWER(nickname) LIKE ${searchTerm}`,
          sql`LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ${searchTerm}`
        )
      )
    )
    .limit(limit);
}
