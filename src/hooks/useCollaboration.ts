import { useEffect, useCallback, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  joinCollaborationSessionFn,
  updateCollaborationSessionFn,
  sendHeartbeatFn,
  leaveCollaborationSessionFn,
  getActiveCollaboratorsFn,
  getCollaborationStateFn,
  acquireEditLockFn,
  releaseEditLockFn,
  broadcastTreeActivityFn,
} from "~/fn/collaboration";
import { getErrorMessage } from "~/utils/error";
import type { TreeEntityType, TreeChangeType, CollaborationSessionStatus } from "~/db/schema";

// Types for collaboration state
export interface Collaborator {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  status: string; // CollaborationSessionStatus widened to string for API compatibility
  editingEntityId: string | null;
  editingEntityType: string | null; // TreeEntityType widened to string for API compatibility
}

export interface EntityLock {
  entityId: string;
  entityType: string; // TreeEntityType widened to string for API compatibility
  lockedBy: {
    id: string;
    name: string;
    image?: string | null;
  };
  expiresAt: Date;
}

export interface TreeActivityItem {
  activity: {
    id: string;
    activityType: string; // TreeChangeType widened to string for API compatibility
    entityType: string; // TreeEntityType widened to string for API compatibility
    entityId: string;
    entityName: string | null;
    description: string | null;
    createdAt: Date;
  };
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

// Heartbeat interval in milliseconds
const HEARTBEAT_INTERVAL = 10000; // 10 seconds
// Poll interval for collaboration state
const POLL_INTERVAL = 5000; // 5 seconds

/**
 * Hook for managing real-time collaboration on a family tree
 */
export function useCollaboration(familyTreeId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Query for collaboration state (collaborators, locks, activities)
  const {
    data: collaborationState,
    isLoading: isLoadingState,
    error: stateError,
  } = useQuery({
    queryKey: ["collaboration-state", familyTreeId],
    queryFn: () => getCollaborationStateFn({ data: { familyTreeId } }),
    enabled: enabled && isConnected,
    refetchInterval: POLL_INTERVAL,
    staleTime: POLL_INTERVAL / 2,
  });

  // Join session mutation
  const joinSessionMutation = useMutation({
    mutationFn: () => joinCollaborationSessionFn({ data: { familyTreeId } }),
    onSuccess: () => {
      setIsConnected(true);
      queryClient.invalidateQueries({
        queryKey: ["collaboration-state", familyTreeId],
      });
    },
    onError: (error) => {
      console.error("Failed to join collaboration session:", error);
    },
  });

  // Leave session mutation
  const leaveSessionMutation = useMutation({
    mutationFn: () => leaveCollaborationSessionFn({ data: { familyTreeId } }),
    onSuccess: () => {
      setIsConnected(false);
    },
  });

  // Heartbeat mutation
  const heartbeatMutation = useMutation({
    mutationFn: () => sendHeartbeatFn({ data: { familyTreeId } }),
  });

  // Update session status mutation
  const updateSessionMutation = useMutation({
    mutationFn: (data: {
      status?: CollaborationSessionStatus;
      editingEntityId?: string | null;
      editingEntityType?: TreeEntityType | null;
    }) =>
      updateCollaborationSessionFn({
        data: {
          familyTreeId,
          ...data,
        },
      }),
  });

  // Join collaboration session on mount
  useEffect(() => {
    if (enabled && !isConnected) {
      joinSessionMutation.mutate();
    }

    // Leave session on unmount
    return () => {
      if (isConnected) {
        leaveSessionMutation.mutate();
      }
    };
  }, [enabled, familyTreeId]);

  // Set up heartbeat interval
  useEffect(() => {
    if (isConnected) {
      heartbeatIntervalRef.current = setInterval(() => {
        heartbeatMutation.mutate();
      }, HEARTBEAT_INTERVAL);
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [isConnected, familyTreeId]);

  // Handle visibility change (pause/resume heartbeat)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isConnected) {
        // Send immediate heartbeat when tab becomes visible
        heartbeatMutation.mutate();
        // Refresh collaboration state
        queryClient.invalidateQueries({
          queryKey: ["collaboration-state", familyTreeId],
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isConnected, familyTreeId, queryClient]);

  // Set editing status
  const setEditingEntity = useCallback(
    (entityId: string | null, entityType: TreeEntityType | null) => {
      updateSessionMutation.mutate({
        status: entityId ? "editing" : "active",
        editingEntityId: entityId,
        editingEntityType: entityType,
      });
    },
    [updateSessionMutation]
  );

  return {
    // Connection state
    isConnected,
    isLoading: isLoadingState || joinSessionMutation.isPending,
    error: stateError,

    // Collaboration data
    collaborators: collaborationState?.collaborators || [],
    locks: collaborationState?.locks || [],
    recentActivities: collaborationState?.recentActivities || [],

    // Actions
    setEditingEntity,
    refreshState: () =>
      queryClient.invalidateQueries({
        queryKey: ["collaboration-state", familyTreeId],
      }),
  };
}

/**
 * Hook for managing edit locks on entities
 */
export function useEditLock(familyTreeId: string) {
  const queryClient = useQueryClient();
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Acquire lock mutation
  const acquireLockMutation = useMutation({
    mutationFn: (data: { entityId: string; entityType: TreeEntityType }) =>
      acquireEditLockFn({
        data: {
          familyTreeId,
          ...data,
        },
      }),
    onSuccess: (result) => {
      if (!result.success && result.lockedBy) {
        toast.error(result.message, {
          description: "Please wait until they finish editing.",
        });
      }
      // Refresh locks
      queryClient.invalidateQueries({
        queryKey: ["collaboration-state", familyTreeId],
      });
    },
    onError: (error) => {
      toast.error("Failed to acquire edit lock", {
        description: getErrorMessage(error),
      });
    },
  });

  // Release lock mutation
  const releaseLockMutation = useMutation({
    mutationFn: (data: { entityId: string; entityType: TreeEntityType }) =>
      releaseEditLockFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collaboration-state", familyTreeId],
      });
    },
  });

  // Acquire lock with auto-release timeout
  const acquireLock = useCallback(
    async (
      entityId: string,
      entityType: TreeEntityType,
      autoReleaseMs: number = 30000
    ) => {
      const result = await acquireLockMutation.mutateAsync({
        entityId,
        entityType,
      });

      if (result.success) {
        // Set up auto-release timeout
        if (lockTimeoutRef.current) {
          clearTimeout(lockTimeoutRef.current);
        }
        lockTimeoutRef.current = setTimeout(() => {
          releaseLockMutation.mutate({ entityId, entityType });
        }, autoReleaseMs);
      }

      return result;
    },
    [acquireLockMutation, releaseLockMutation]
  );

  // Release lock
  const releaseLock = useCallback(
    (entityId: string, entityType: TreeEntityType) => {
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }
      releaseLockMutation.mutate({ entityId, entityType });
    },
    [releaseLockMutation]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
    };
  }, []);

  return {
    acquireLock,
    releaseLock,
    isAcquiring: acquireLockMutation.isPending,
    isReleasing: releaseLockMutation.isPending,
  };
}

/**
 * Hook for broadcasting tree activities
 */
export function useTreeActivity(familyTreeId: string) {
  const queryClient = useQueryClient();

  const broadcastMutation = useMutation({
    mutationFn: (data: {
      activityType: TreeChangeType;
      entityType: TreeEntityType;
      entityId: string;
      entityName?: string;
      description?: string;
      metadata?: unknown;
    }) =>
      broadcastTreeActivityFn({
        data: {
          familyTreeId,
          ...data,
        },
      }),
    onSuccess: () => {
      // Refresh collaboration state to show new activity
      queryClient.invalidateQueries({
        queryKey: ["collaboration-state", familyTreeId],
      });
    },
  });

  const broadcast = useCallback(
    (
      activityType: TreeChangeType,
      entityType: TreeEntityType,
      entityId: string,
      options?: {
        entityName?: string;
        description?: string;
        metadata?: unknown;
      }
    ) => {
      broadcastMutation.mutate({
        activityType,
        entityType,
        entityId,
        ...options,
      });
    },
    [broadcastMutation]
  );

  return {
    broadcast,
    isBroadcasting: broadcastMutation.isPending,
  };
}

/**
 * Hook to check if a specific entity is being edited by someone else
 */
export function useEntityEditStatus(
  familyTreeId: string,
  entityId: string,
  entityType: TreeEntityType
) {
  const { collaborators, locks } = useCollaboration(familyTreeId);

  // Check if someone is editing this entity via session status
  const editingCollaborator = collaborators.find(
    (c: Collaborator) =>
      c.editingEntityId === entityId && c.editingEntityType === entityType
  );

  // Check if entity has an active lock
  const lock = locks.find(
    (l: EntityLock) => l.entityId === entityId && l.entityType === entityType
  );

  return {
    isBeingEdited: !!editingCollaborator || !!lock,
    editedBy: editingCollaborator?.user || lock?.lockedBy || null,
  };
}
