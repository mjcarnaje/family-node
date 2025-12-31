import { useState } from "react";
import { Play, Loader2, ImageIcon, Trash2, Plus, Images } from "lucide-react";
import { cn } from "~/lib/utils";
import type { MemberMedia } from "~/db/schema";
import { useMemberMedia, useDeleteMemberMedia } from "~/hooks/useMemberMedia";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

interface MemberMediaGalleryProps {
  familyMemberId: string;
  familyTreeId: string;
  className?: string;
  onAddMedia?: () => void;
  canEdit?: boolean;
}

interface MediaThumbnailProps {
  media: MemberMedia;
  onClick: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  className?: string;
}

function MediaThumbnail({
  media,
  onClick,
  onDelete,
  canEdit,
  className,
}: MediaThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // With Cloudinary, URL is stored directly on the media record
  const url = media.url;

  if (media.type === "video") {
    return (
      <>
        <div className={cn("relative group", className)}>
          <button
            className="relative w-full h-full bg-muted overflow-hidden rounded-lg cursor-pointer"
            onClick={onClick}
          >
            <video
              src={url}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="h-5 w-5 text-black ml-0.5" />
              </div>
            </div>
          </button>
          {canEdit && onDelete && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Video</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this video? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete?.();
                  setShowDeleteConfirm(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  if (imageError) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center rounded-lg",
          className
        )}
      >
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className={cn("relative group", className)}>
        <button
          className="relative w-full h-full bg-muted overflow-hidden rounded-lg cursor-pointer"
          onClick={onClick}
        >
          <img
            src={url}
            alt={media.fileName || ""}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={() => setImageError(true)}
          />
        </button>
        {canEdit && onDelete && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {media.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-xs text-white truncate">{media.caption}</p>
          </div>
        )}
      </div>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.();
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Lightbox component for full-screen viewing
interface MediaLightboxProps {
  media: MemberMedia[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

function MemberMediaLightbox({
  media,
  initialIndex,
  open,
  onClose,
}: MediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!open || media.length === 0) return null;

  const currentMedia = media[currentIndex];
  // With Cloudinary, URL is stored directly
  const url = currentMedia.url;
  const showNavigation = media.length > 1;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/10 p-2 rounded-full"
        onClick={onClose}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Previous button */}
      {showNavigation && (
        <button
          className="absolute left-4 z-10 text-white hover:bg-white/10 p-2 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            handlePrevious();
          }}
        >
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Main content */}
      <div
        className="flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {currentMedia.type === "video" ? (
          <video
            src={url}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            controls
            autoPlay
          />
        ) : (
          <img
            src={url}
            alt={currentMedia.fileName || ""}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        )}
      </div>

      {/* Next button */}
      {showNavigation && (
        <button
          className="absolute right-4 z-10 text-white hover:bg-white/10 p-2 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
        >
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Counter */}
      {showNavigation && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
          {currentIndex + 1} / {media.length}
        </div>
      )}

      {/* Caption */}
      {currentMedia.caption && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-lg max-w-md text-center">
          {currentMedia.caption}
        </div>
      )}
    </div>
  );
}

export function MemberMediaGallery({
  familyMemberId,
  familyTreeId,
  className,
  onAddMedia,
  canEdit = false,
}: MemberMediaGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data: media, isLoading } = useMemberMedia(familyMemberId);
  const deleteMedia = useDeleteMemberMedia();

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleDeleteMedia = (mediaId: string) => {
    deleteMedia.mutate(mediaId);
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!media || media.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <Images className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-4">
          No photos or videos yet
        </p>
        {canEdit && onAddMedia && (
          <Button onClick={onAddMedia} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Photos
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-4", className)}>
        {/* Header with count and add button */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {media.length} {media.length === 1 ? "photo" : "photos"} & videos
          </h3>
          {canEdit && onAddMedia && (
            <Button onClick={onAddMedia} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          )}
        </div>

        {/* Gallery grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {media.map((item, index) => (
            <MediaThumbnail
              key={item.id}
              media={item}
              onClick={() => handleOpenLightbox(index)}
              onDelete={() => handleDeleteMedia(item.id)}
              canEdit={canEdit}
              className="aspect-square"
            />
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <MemberMediaLightbox
        media={media}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
