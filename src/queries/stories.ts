import { queryOptions } from "@tanstack/react-query";
import { getStoryByIdFn, getStoriesByMemberIdFn } from "~/fn/stories";

export const storyQueryOptions = (storyId: string) =>
  queryOptions({
    queryKey: ["story", storyId],
    queryFn: () => getStoryByIdFn({ data: { id: storyId } }),
    enabled: !!storyId,
  });

export const storiesByMemberQueryOptions = (familyMemberId: string) =>
  queryOptions({
    queryKey: ["stories", "member", familyMemberId],
    queryFn: () => getStoriesByMemberIdFn({ data: { familyMemberId } }),
    enabled: !!familyMemberId,
  });
