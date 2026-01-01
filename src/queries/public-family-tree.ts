import { queryOptions } from "@tanstack/react-query";
import {
  getPublicFamilyTreeFn,
  isTreePublicFn,
  getPublicTreeInfoBySlugFn,
  getPublicAccessSettingsFn,
} from "~/fn/public-family-tree";

/**
 * Query options for getting public family tree visualization data
 * This query does not require authentication
 */
export const publicFamilyTreeQueryOptions = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["public-family-tree", familyTreeId],
    queryFn: () => getPublicFamilyTreeFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes (longer since public data changes less frequently)
  });

/**
 * Query options for checking if a tree is public
 * Lightweight check before loading full data
 */
export const isTreePublicQueryOptions = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["is-tree-public", familyTreeId],
    queryFn: () => isTreePublicFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

/**
 * Query options for getting public tree info by slug
 * Returns basic info and whether PIN is required
 */
export const publicTreeInfoBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["public-tree-info", slug],
    queryFn: () => getPublicTreeInfoBySlugFn({ data: { slug } }),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

/**
 * Query options for getting public access settings (owner only)
 */
export const publicAccessSettingsQueryOptions = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["public-access-settings", familyTreeId],
    queryFn: () => getPublicAccessSettingsFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
