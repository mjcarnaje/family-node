import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { authenticatedMiddleware } from "./middleware";
import { findFamilyTreeById } from "~/data-access/family-trees";
import { userHasTreeAccess } from "~/data-access/tree-sharing";

const CURRENT_TREE_COOKIE_NAME = "current-family-tree";
const COOKIE_EXPIRY_DAYS = 365;
const MILLISECONDS_PER_DAY = 86400000;

/**
 * Get the currently selected family tree ID from cookies
 * Returns null if no tree is selected
 */
export const getCurrentTreeIdFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    const treeId = getCookie(CURRENT_TREE_COOKIE_NAME);
    return treeId ?? null;
  });

/**
 * Set the current family tree selection
 * Validates that the tree exists and the user has access to it
 */
export const setCurrentTreeIdFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      treeId: z.string().min(1, "Tree ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { treeId } = data;

    // Verify the tree exists
    const tree = await findFamilyTreeById(treeId);
    if (!tree) {
      throw new Error("Family tree not found");
    }

    // Verify the user has access to this tree
    const hasAccess = await userHasTreeAccess(context.userId, treeId);
    if (!hasAccess) {
      throw new Error("You do not have access to this family tree");
    }

    // Set the cookie
    setCookie(CURRENT_TREE_COOKIE_NAME, treeId, {
      maxAge: COOKIE_EXPIRY_DAYS * MILLISECONDS_PER_DAY,
      path: "/",
      sameSite: "lax",
    });

    return treeId;
  });

/**
 * Clear the current tree selection
 */
export const clearCurrentTreeIdFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    setCookie(CURRENT_TREE_COOKIE_NAME, "", {
      maxAge: 0,
      path: "/",
    });
    return null;
  });
