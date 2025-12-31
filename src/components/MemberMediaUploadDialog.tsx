import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { MediaDropzone } from "~/components/MediaDropzone";
import { useSaveMemberMedia } from "~/hooks/useMemberMedia";
import type { MediaUploadResult } from "~/utils/storage/media-helpers";

interface MemberMediaUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyMemberId: string;
  familyTreeId: string;
  memberName: string;
}

export function MemberMediaUploadDialog({
  open,
  onOpenChange,
  familyMemberId,
  familyTreeId,
  memberName,
}: MemberMediaUploadDialogProps) {
  const [pendingUploads, setPendingUploads] = useState<MediaUploadResult[]>([]);
  const saveMemberMedia = useSaveMemberMedia();

  const handleUploadsComplete = (results: MediaUploadResult[]) => {
    setPendingUploads((prev) => [...prev, ...results]);
  };

  const handleSave = async () => {
    if (pendingUploads.length === 0) return;

    // With Cloudinary, we pass publicId and url instead of fileKey
    const mediaData = pendingUploads.map((upload, index) => ({
      id: upload.id,
      publicId: upload.publicId,
      url: upload.url,
      fileName: upload.fileName,
      fileSize: upload.fileSize,
      mimeType: upload.mimeType,
      type: upload.type as "image" | "video",
      position: index,
    }));

    await saveMemberMedia.mutateAsync({
      familyMemberId,
      familyTreeId,
      media: mediaData,
    });

    setPendingUploads([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    setPendingUploads([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Add Photos & Videos
          </DialogTitle>
          <DialogDescription>
            Upload photos and videos for {memberName}. These will be visible in their profile gallery.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <MediaDropzone
            onUploadsComplete={handleUploadsComplete}
            maxFiles={10}
          />
        </div>

        {pendingUploads.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {pendingUploads.length} file(s) ready to save
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={pendingUploads.length === 0 || saveMemberMedia.isPending}
          >
            {saveMemberMedia.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save {pendingUploads.length > 0 ? `(${pendingUploads.length})` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
