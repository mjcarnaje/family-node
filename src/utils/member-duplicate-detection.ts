/**
 * Member Duplicate Detection Utility
 *
 * This module provides fuzzy matching algorithms to detect potential duplicate
 * family members based on similar names and dates.
 */

import { differenceInDays, parseISO, isValid } from "date-fns";

/**
 * Configuration for duplicate detection thresholds
 */
export const DUPLICATE_DETECTION_CONFIG = {
  /** Minimum name similarity score (0-1) to consider as potential duplicate */
  NAME_SIMILARITY_THRESHOLD: 0.75,
  /** Maximum days apart for birth dates to be considered similar */
  DATE_PROXIMITY_THRESHOLD_DAYS: 365,
  /** Weight for name similarity in overall score (0-1) */
  NAME_WEIGHT: 0.7,
  /** Weight for date proximity in overall score (0-1) */
  DATE_WEIGHT: 0.3,
  /** Overall score threshold for low confidence match */
  LOW_CONFIDENCE_THRESHOLD: 0.6,
  /** Overall score threshold for medium confidence match */
  MEDIUM_CONFIDENCE_THRESHOLD: 0.75,
  /** Overall score threshold for high confidence match */
  HIGH_CONFIDENCE_THRESHOLD: 0.85,
} as const;

/**
 * Severity levels for duplicate warnings
 */
export type DuplicateSeverity = "low" | "medium" | "high";

/**
 * Represents a potential duplicate candidate
 */
export interface DuplicateCandidate {
  /** ID of the existing member that may be a duplicate */
  memberId: string;
  /** First name of the candidate */
  firstName: string;
  /** Last name of the candidate */
  lastName: string;
  /** Full name of the candidate */
  fullName: string;
  /** Birth date of the candidate (if available) */
  birthDate?: string | null;
  /** Overall similarity score (0-1) */
  score: number;
  /** Which fields matched */
  matchedOn: ("firstName" | "lastName" | "fullName" | "birthDate")[];
  /** Severity level based on score */
  severity: DuplicateSeverity;
  /** Detailed similarity metrics */
  details: {
    /** Name similarity score (0-1) */
    nameSimilarity: number;
    /** First name similarity score (0-1) */
    firstNameSimilarity: number;
    /** Last name similarity score (0-1) */
    lastNameSimilarity: number;
    /** Days between birth dates (if both available) */
    dateProximityDays?: number;
    /** Date proximity score (0-1, higher is more similar) */
    dateProximityScore?: number;
  };
}

/**
 * Result of duplicate detection
 */
export interface DuplicateDetectionResult {
  /** List of potential duplicate candidates, sorted by score (highest first) */
  candidates: DuplicateCandidate[];
  /** Whether any potential duplicates were found */
  hasPotentialDuplicates: boolean;
  /** The highest severity level among all candidates */
  highestSeverity?: DuplicateSeverity;
}

/**
 * Options for duplicate detection
 */
export interface DuplicateDetectionOptions {
  /** Custom name similarity threshold (0-1) */
  nameSimilarityThreshold?: number;
  /** Custom date proximity threshold in days */
  dateProximityThresholdDays?: number;
  /** Maximum number of candidates to return */
  maxCandidates?: number;
  /** Exclude specific member IDs from results */
  excludeMemberIds?: string[];
}

/**
 * Member data structure for duplicate detection
 */
export interface MemberForDuplicateCheck {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  birthDate?: string | null;
}

/**
 * New member data for checking against existing members
 */
export interface NewMemberData {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  birthDate?: string | null;
}

/**
 * Calculate Jaro similarity between two strings
 * This is a string similarity measure giving a value between 0 and 1
 *
 * @param s1 First string
 * @param s2 Second string
 * @returns Similarity score between 0 and 1
 */
export function jaroSimilarity(s1: string, s2: string): number {
  // Normalize strings
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();

  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const matchDistance = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
  const str1Matches = new Array(str1.length).fill(false);
  const str2Matches = new Array(str2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matching characters
  for (let i = 0; i < str1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, str2.length);

    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  return (
    (matches / str1.length +
      matches / str2.length +
      (matches - transpositions / 2) / matches) /
    3
  );
}

/**
 * Calculate Jaro-Winkler similarity between two strings
 * This gives more weight to strings that match from the beginning
 *
 * @param s1 First string
 * @param s2 Second string
 * @param scalingFactor Scaling factor for common prefix bonus (default 0.1)
 * @returns Similarity score between 0 and 1
 */
export function jaroWinklerSimilarity(
  s1: string,
  s2: string,
  scalingFactor: number = 0.1
): number {
  const jaroScore = jaroSimilarity(s1, s2);

  // Find common prefix (up to 4 characters)
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  const maxPrefixLength = Math.min(4, str1.length, str2.length);

  let prefixLength = 0;
  for (let i = 0; i < maxPrefixLength; i++) {
    if (str1[i] === str2[i]) {
      prefixLength++;
    } else {
      break;
    }
  }

  return jaroScore + prefixLength * scalingFactor * (1 - jaroScore);
}

/**
 * Calculate Levenshtein distance between two strings
 *
 * @param s1 First string
 * @param s2 Second string
 * @returns Number of edits required to transform s1 to s2
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();

  if (str1 === str2) return 0;
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[str1.length][str2.length];
}

/**
 * Calculate normalized Levenshtein similarity (0-1 scale)
 *
 * @param s1 First string
 * @param s2 Second string
 * @returns Similarity score between 0 and 1
 */
export function levenshteinSimilarity(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(s1, s2) / maxLen;
}

/**
 * Calculate name similarity using a combination of algorithms
 * Combines Jaro-Winkler (better for names) with Levenshtein as a fallback
 *
 * @param name1 First name string
 * @param name2 Second name string
 * @returns Similarity score between 0 and 1
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  // Use the maximum of Jaro-Winkler and Levenshtein similarity
  // This provides robustness against different types of name variations
  const jwSimilarity = jaroWinklerSimilarity(name1, name2);
  const levSimilarity = levenshteinSimilarity(name1, name2);

  return Math.max(jwSimilarity, levSimilarity);
}

/**
 * Parse a date string to a Date object
 *
 * @param dateString Date string to parse
 * @returns Parsed Date or null if invalid
 */
function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Calculate date proximity score (0-1)
 * Higher score means dates are closer together
 *
 * @param date1 First date string
 * @param date2 Second date string
 * @param thresholdDays Maximum days apart to consider (default from config)
 * @returns Object with days apart and proximity score (0-1)
 */
export function calculateDateProximity(
  date1: string | null | undefined,
  date2: string | null | undefined,
  thresholdDays: number = DUPLICATE_DETECTION_CONFIG.DATE_PROXIMITY_THRESHOLD_DAYS
): { daysApart: number | null; score: number | null } {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);

  if (!d1 || !d2) {
    return { daysApart: null, score: null };
  }

  const daysApart = Math.abs(differenceInDays(d1, d2));

  // Calculate score: 1 for same day, approaching 0 as days apart approaches threshold
  if (daysApart > thresholdDays) {
    return { daysApart, score: 0 };
  }

  const score = 1 - daysApart / thresholdDays;
  return { daysApart, score };
}

/**
 * Get full name combining first, middle, and last names
 */
function getFullName(
  firstName: string,
  lastName: string,
  middleName?: string | null
): string {
  const parts = [firstName, middleName, lastName].filter(Boolean);
  return parts.join(" ").trim();
}

/**
 * Determine severity level based on overall score
 */
function getSeverity(score: number): DuplicateSeverity {
  if (score >= DUPLICATE_DETECTION_CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
    return "high";
  }
  if (score >= DUPLICATE_DETECTION_CONFIG.MEDIUM_CONFIDENCE_THRESHOLD) {
    return "medium";
  }
  return "low";
}

/**
 * Detect potential duplicate members in a family tree
 *
 * @param newMember New member data to check
 * @param existingMembers Existing members in the family tree
 * @param options Detection options
 * @returns Detection result with candidates
 */
export function detectMemberDuplicates(
  newMember: NewMemberData,
  existingMembers: MemberForDuplicateCheck[],
  options: DuplicateDetectionOptions = {}
): DuplicateDetectionResult {
  const {
    nameSimilarityThreshold = DUPLICATE_DETECTION_CONFIG.NAME_SIMILARITY_THRESHOLD,
    dateProximityThresholdDays = DUPLICATE_DETECTION_CONFIG.DATE_PROXIMITY_THRESHOLD_DAYS,
    maxCandidates = 5,
    excludeMemberIds = [],
  } = options;

  const candidates: DuplicateCandidate[] = [];
  const newFullName = getFullName(
    newMember.firstName,
    newMember.lastName,
    newMember.middleName
  );

  for (const existing of existingMembers) {
    // Skip excluded members
    if (excludeMemberIds.includes(existing.id)) {
      continue;
    }

    const existingFullName = getFullName(
      existing.firstName,
      existing.lastName,
      existing.middleName
    );

    // Calculate individual name similarities
    const firstNameSimilarity = calculateNameSimilarity(
      newMember.firstName,
      existing.firstName
    );
    const lastNameSimilarity = calculateNameSimilarity(
      newMember.lastName,
      existing.lastName
    );
    const fullNameSimilarity = calculateNameSimilarity(
      newFullName,
      existingFullName
    );

    // Use the best of full name or individual names
    const nameSimilarity = Math.max(
      fullNameSimilarity,
      (firstNameSimilarity + lastNameSimilarity) / 2
    );

    // Calculate date proximity
    const dateProximity = calculateDateProximity(
      newMember.birthDate,
      existing.birthDate,
      dateProximityThresholdDays
    );

    // Calculate overall score
    let overallScore: number;
    const matchedOn: ("firstName" | "lastName" | "fullName" | "birthDate")[] = [];

    if (dateProximity.score !== null) {
      // Both have birth dates - use weighted average
      overallScore =
        DUPLICATE_DETECTION_CONFIG.NAME_WEIGHT * nameSimilarity +
        DUPLICATE_DETECTION_CONFIG.DATE_WEIGHT * dateProximity.score;

      if (dateProximity.score > 0.5) {
        matchedOn.push("birthDate");
      }
    } else {
      // No birth date comparison - use only name similarity
      overallScore = nameSimilarity;
    }

    // Track which name fields matched
    if (firstNameSimilarity >= nameSimilarityThreshold) {
      matchedOn.push("firstName");
    }
    if (lastNameSimilarity >= nameSimilarityThreshold) {
      matchedOn.push("lastName");
    }
    if (fullNameSimilarity >= nameSimilarityThreshold) {
      matchedOn.push("fullName");
    }

    // Only include if meets threshold
    if (overallScore >= DUPLICATE_DETECTION_CONFIG.LOW_CONFIDENCE_THRESHOLD) {
      candidates.push({
        memberId: existing.id,
        firstName: existing.firstName,
        lastName: existing.lastName,
        fullName: existingFullName,
        birthDate: existing.birthDate,
        score: overallScore,
        matchedOn,
        severity: getSeverity(overallScore),
        details: {
          nameSimilarity,
          firstNameSimilarity,
          lastNameSimilarity,
          dateProximityDays: dateProximity.daysApart ?? undefined,
          dateProximityScore: dateProximity.score ?? undefined,
        },
      });
    }
  }

  // Sort by score (highest first) and limit results
  candidates.sort((a, b) => b.score - a.score);
  const limitedCandidates = candidates.slice(0, maxCandidates);

  // Determine highest severity
  let highestSeverity: DuplicateSeverity | undefined;
  if (limitedCandidates.length > 0) {
    highestSeverity = limitedCandidates[0].severity;
  }

  return {
    candidates: limitedCandidates,
    hasPotentialDuplicates: limitedCandidates.length > 0,
    highestSeverity,
  };
}

/**
 * Format a duplicate warning message for user display
 */
export function formatDuplicateWarningMessage(
  candidate: DuplicateCandidate
): string {
  const matchParts: string[] = [];

  if (candidate.matchedOn.includes("fullName") ||
      (candidate.matchedOn.includes("firstName") && candidate.matchedOn.includes("lastName"))) {
    matchParts.push("similar name");
  } else if (candidate.matchedOn.includes("firstName")) {
    matchParts.push("similar first name");
  } else if (candidate.matchedOn.includes("lastName")) {
    matchParts.push("similar last name");
  }

  if (candidate.matchedOn.includes("birthDate") && candidate.details.dateProximityDays !== undefined) {
    if (candidate.details.dateProximityDays === 0) {
      matchParts.push("same birth date");
    } else {
      matchParts.push(`birth date within ${candidate.details.dateProximityDays} days`);
    }
  }

  const matchText = matchParts.length > 0
    ? ` (${matchParts.join(", ")})`
    : "";

  return `${candidate.fullName}${matchText}`;
}

/**
 * Get a human-readable description of the match confidence
 */
export function getConfidenceDescription(severity: DuplicateSeverity): string {
  switch (severity) {
    case "high":
      return "Very likely the same person";
    case "medium":
      return "Possibly the same person";
    case "low":
      return "Might be related";
    default:
      return "Potential match";
  }
}
