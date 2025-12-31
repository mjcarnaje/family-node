import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getTreeStatistics,
  getTreeMemberCountStats,
  getTreeAgeStatistics,
  getTreeGrowthTimeline,
  TreeStatisticsAccessError,
  TreeNotFoundError,
} from "~/use-cases/tree-member-statistics";

// ============================================
// Tree Statistics Server Functions
// ============================================

// Validation schema for tree ID
const treeIdSchema = z.object({
  familyTreeId: z.string().min(1, "Family tree ID is required"),
});

/**
 * Get comprehensive statistics for a family tree
 * Returns member counts, relationship stats, age stats, generations, and growth data
 */
export const getTreeStatisticsFn = createServerFn({
  method: "GET",
})
  .inputValidator(treeIdSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    try {
      const statistics = await getTreeStatistics(
        data.familyTreeId,
        context.userId
      );
      return statistics;
    } catch (error) {
      if (
        error instanceof TreeNotFoundError ||
        error instanceof TreeStatisticsAccessError
      ) {
        throw new Error(error.message);
      }
      throw error;
    }
  });

/**
 * Get lightweight member count statistics
 * Faster endpoint for just member counts
 */
export const getTreeMemberStatsFn = createServerFn({
  method: "GET",
})
  .inputValidator(treeIdSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    try {
      const stats = await getTreeMemberCountStats(
        data.familyTreeId,
        context.userId
      );
      return stats;
    } catch (error) {
      if (
        error instanceof TreeNotFoundError ||
        error instanceof TreeStatisticsAccessError
      ) {
        throw new Error(error.message);
      }
      throw error;
    }
  });

/**
 * Get age-related statistics including oldest/youngest members and generations
 */
export const getTreeAgeStatsFn = createServerFn({
  method: "GET",
})
  .inputValidator(treeIdSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    try {
      const stats = await getTreeAgeStatistics(
        data.familyTreeId,
        context.userId
      );
      return stats;
    } catch (error) {
      if (
        error instanceof TreeNotFoundError ||
        error instanceof TreeStatisticsAccessError
      ) {
        throw new Error(error.message);
      }
      throw error;
    }
  });

/**
 * Get family growth timeline data
 */
export const getTreeGrowthDataFn = createServerFn({
  method: "GET",
})
  .inputValidator(treeIdSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    try {
      const growthData = await getTreeGrowthTimeline(
        data.familyTreeId,
        context.userId
      );
      return growthData;
    } catch (error) {
      if (
        error instanceof TreeNotFoundError ||
        error instanceof TreeStatisticsAccessError
      ) {
        throw new Error(error.message);
      }
      throw error;
    }
  });
