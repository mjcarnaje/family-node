import { useState } from "react";
import {
  Globe,
  Lock,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  usePublicAccessSettings,
  useEnablePublicAccess,
  useDisablePublicAccess,
  useUpdatePublicPin,
  useRegeneratePublicSlug,
} from "~/hooks/usePublicFamilyTree";

interface PublicAccessSectionProps {
  familyTreeId: string;
  canManage: boolean;
}

export function PublicAccessSection({
  familyTreeId,
  canManage,
}: PublicAccessSectionProps) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: settings, isLoading } = usePublicAccessSettings(familyTreeId);
  const enablePublicAccess = useEnablePublicAccess(familyTreeId);
  const disablePublicAccess = useDisablePublicAccess(familyTreeId);
  const updatePin = useUpdatePublicPin(familyTreeId);
  const regenerateSlug = useRegeneratePublicSlug(familyTreeId);

  if (!canManage) return null;

  if (isLoading) {
    return (
      <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-8 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const handleCopyLink = async () => {
    if (!settings?.publicUrl) return;

    try {
      await navigator.clipboard.writeText(settings.publicUrl);
      setCopied(true);
      toast.success("Public link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleTogglePublic = async (enabled: boolean) => {
    if (enabled) {
      await enablePublicAccess.mutateAsync(pin || undefined);
      setPin("");
    } else {
      await disablePublicAccess.mutateAsync();
    }
  };

  const handleSetPin = async () => {
    if (!pin.trim() || pin.length < 4) {
      toast.error("PIN must be at least 4 characters");
      return;
    }
    await updatePin.mutateAsync(pin);
    setPin("");
  };

  const handleRemovePin = async () => {
    await updatePin.mutateAsync(null);
  };

  const handleRegenerateLink = async () => {
    await regenerateSlug.mutateAsync();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Public Access</h4>
        </div>
        <Switch
          checked={settings?.isPublic ?? false}
          onCheckedChange={handleTogglePublic}
          disabled={enablePublicAccess.isPending || disablePublicAccess.isPending}
        />
      </div>

      {settings?.isPublic && settings.publicUrl && (
        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
          {/* Public URL */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Public Link</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 text-sm bg-background rounded-md border truncate">
                {settings.publicUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                asChild
                className="shrink-0"
              >
                <a href={settings.publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* PIN Protection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <KeyRound className="h-3 w-3" />
                PIN Protection
              </Label>
              {settings.hasPin && (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Enabled
                </span>
              )}
            </div>

            {settings.hasPin ? (
              <div className="flex items-center gap-2">
                <Input
                  type={showPin ? "text" : "password"}
                  placeholder="Enter new PIN to change"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={8}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowPin(!showPin)}
                  type="button"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSetPin}
                  disabled={!pin.trim() || pin.length < 4 || updatePin.isPending}
                >
                  Update
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove PIN Protection?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Anyone with the public link will be able to view this family tree without entering a PIN.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRemovePin}>
                        Remove PIN
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type={showPin ? "text" : "password"}
                  placeholder="Set a PIN (4-8 characters)"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={8}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowPin(!showPin)}
                  type="button"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSetPin}
                  disabled={!pin.trim() || pin.length < 4 || updatePin.isPending}
                >
                  Set PIN
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {settings.hasPin
                ? "Viewers must enter the PIN to see the tree"
                : "Add a PIN to require verification before viewing"}
            </p>
          </div>

          {/* Regenerate Link */}
          <div className="pt-2 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={regenerateSlug.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Public Link
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Regenerate Public Link?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will create a new public link and invalidate the current one. Anyone with the old link will no longer be able to access the tree.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRegenerateLink}>
                    Regenerate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {!settings?.isPublic && (
        <div className="p-4 rounded-lg border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Enable public access to create a shareable link that anyone can use to view this family tree.
          </p>

          {/* Option to set PIN when enabling */}
          <div className="mt-4 space-y-2">
            <Label className="text-xs text-muted-foreground">
              Optional: Set a PIN when enabling
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type={showPin ? "text" : "password"}
                placeholder="PIN (4-8 characters)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={8}
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowPin(!showPin)}
                type="button"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
