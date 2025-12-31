import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  FileJson,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  Users,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import {
  useBulkImport,
  useValidateBulkImport,
  type ImportMember,
} from "~/hooks/useBulkImport";
import { toast } from "sonner";

interface BulkImportDialogProps {
  familyTreeId: string;
  treeName: string;
  trigger?: React.ReactNode;
  onImportComplete?: () => void;
}

type ImportStep = "upload" | "preview" | "importing" | "complete";
type FileFormat = "csv" | "json" | null;

interface ImportState {
  step: ImportStep;
  file: File | null;
  format: FileFormat;
  content: string;
  preview: {
    membersCount: number;
    relationshipsCount: number;
    marriagesCount: number;
    duplicatesCount: number;
    members: ImportMember[];
  } | null;
  errors: string[];
  warnings: string[];
  result: {
    membersCreated: number;
    relationshipsCreated: number;
    marriagesCreated: number;
  } | null;
}

const initialState: ImportState = {
  step: "upload",
  file: null,
  format: null,
  content: "",
  preview: null,
  errors: [],
  warnings: [],
  result: null,
};

// CSV Template
const csvTemplate = `firstName,lastName,middleName,nickname,gender,birthDate,birthPlace,deathDate,deathPlace,bio
John,Doe,Michael,,male,1950-01-15,New York,,
Jane,Doe,Ann,,female,1952-03-20,Boston,,
John Jr,Doe,,,male,1975-06-10,New York,,`;

// JSON Template
const jsonTemplate = {
  members: [
    {
      tempId: "person1",
      firstName: "John",
      lastName: "Doe",
      middleName: "Michael",
      gender: "male",
      birthDate: "1950-01-15",
      birthPlace: "New York",
    },
    {
      tempId: "person2",
      firstName: "Jane",
      lastName: "Doe",
      middleName: "Ann",
      gender: "female",
      birthDate: "1952-03-20",
      birthPlace: "Boston",
    },
    {
      tempId: "person3",
      firstName: "John Jr",
      lastName: "Doe",
      gender: "male",
      birthDate: "1975-06-10",
      birthPlace: "New York",
    },
  ],
  relationships: [
    {
      parentTempId: "person1",
      childTempId: "person3",
      relationshipType: "biological",
    },
    {
      parentTempId: "person2",
      childTempId: "person3",
      relationshipType: "biological",
    },
  ],
  marriages: [
    {
      spouse1TempId: "person1",
      spouse2TempId: "person2",
      marriageDate: "1970-05-20",
      status: "married",
    },
  ],
};

export function BulkImportDialog({
  familyTreeId,
  treeName,
  trigger,
  onImportComplete,
}: BulkImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ImportState>(initialState);

  const validateMutation = useValidateBulkImport(familyTreeId);
  const importMutation = useBulkImport(familyTreeId);

  const resetState = () => {
    setState(initialState);
    validateMutation.reset();
    importMutation.reset();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    setOpen(newOpen);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const format: FileFormat = ext === "json" ? "json" : ext === "csv" ? "csv" : null;

    if (!format) {
      setState((prev) => ({
        ...prev,
        errors: ["Please upload a CSV or JSON file"],
      }));
      return;
    }

    try {
      const content = await file.text();
      setState((prev) => ({
        ...prev,
        file,
        format,
        content,
        errors: [],
      }));

      // Validate the content
      const result = await validateMutation.mutateAsync({ content, format });

      if (result.valid && result.preview) {
        setState((prev) => ({
          ...prev,
          step: "preview",
          preview: result.preview,
          warnings: result.warnings,
          errors: [],
        }));
      } else {
        setState((prev) => ({
          ...prev,
          errors: result.errors,
          warnings: result.warnings,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        errors: [error instanceof Error ? error.message : "Failed to read file"],
      }));
    }
  }, [validateMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/json": [".json"],
    },
    maxFiles: 1,
    disabled: state.step !== "upload",
  });

  const handleImport = async () => {
    if (!state.preview) return;

    setState((prev) => ({ ...prev, step: "importing" }));

    try {
      // Parse the content to get full data including relationships and marriages
      let members: ImportMember[] = [];
      let relationships: Array<{
        parentTempId?: string;
        parentFirstName?: string;
        parentLastName?: string;
        childTempId?: string;
        childFirstName?: string;
        childLastName?: string;
        relationshipType?: "biological" | "adopted" | "step" | "foster";
      }> = [];
      let marriages: Array<{
        spouse1TempId?: string;
        spouse1FirstName?: string;
        spouse1LastName?: string;
        spouse2TempId?: string;
        spouse2FirstName?: string;
        spouse2LastName?: string;
        marriageDate?: string | null;
        marriagePlace?: string | null;
        divorceDate?: string | null;
        status?: "married" | "divorced" | "widowed" | "separated" | "annulled";
      }> = [];

      if (state.format === "json") {
        const parsed = JSON.parse(state.content);
        if (Array.isArray(parsed)) {
          members = parsed;
        } else {
          members = parsed.members || [];
          relationships = parsed.relationships || [];
          marriages = parsed.marriages || [];
        }
      } else {
        // CSV only supports members
        members = state.preview.members;
      }

      const result = await importMutation.mutateAsync({
        members,
        relationships,
        marriages,
      });

      if (result.success) {
        setState((prev) => ({
          ...prev,
          step: "complete",
          result: {
            membersCreated: result.membersCreated,
            relationshipsCreated: result.relationshipsCreated,
            marriagesCreated: result.marriagesCreated,
          },
          warnings: [...prev.warnings, ...result.warnings],
        }));
        toast.success(
          `Successfully imported ${result.membersCreated} member(s)`
        );
        onImportComplete?.();
      } else {
        setState((prev) => ({
          ...prev,
          step: "preview",
          errors: result.errors,
          warnings: [...prev.warnings, ...result.warnings],
        }));
        toast.error("Import failed");
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        step: "preview",
        errors: [error instanceof Error ? error.message : "Import failed"],
      }));
      toast.error("Import failed");
    }
  };

  const downloadTemplate = (format: "csv" | "json") => {
    const content = format === "csv" ? csvTemplate : JSON.stringify(jsonTemplate, null, 2);
    const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `family-import-template.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Import Members
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Members
          </DialogTitle>
          <DialogDescription>
            Import multiple family members from a CSV or JSON file into "{treeName}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step: Upload */}
          {state.step === "upload" && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                  validateMutation.isPending && "opacity-50 cursor-not-allowed"
                )}
              >
                <input {...getInputProps()} />
                {validateMutation.isPending ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                    <p className="text-sm text-muted-foreground">Validating file...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <FileText className="h-10 w-10" />
                      <FileJson className="h-10 w-10" />
                    </div>
                    <p className="text-sm font-medium">
                      {isDragActive
                        ? "Drop file here"
                        : "Drag and drop a CSV or JSON file"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                )}
              </div>

              {/* Errors */}
              {state.errors.length > 0 && (
                <div className="rounded-lg bg-destructive/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Errors</span>
                  </div>
                  <ul className="list-disc list-inside text-sm text-destructive">
                    {state.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Template Downloads */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <h4 className="text-sm font-medium">Download Templates</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate("csv")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate("json")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    JSON Template
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  CSV supports members only. JSON supports members, relationships, and marriages.
                </p>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {state.step === "preview" && state.preview && (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  {state.format === "csv" ? (
                    <FileText className="h-8 w-8 text-green-600" />
                  ) : (
                    <FileJson className="h-8 w-8 text-blue-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{state.file?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {state.format?.toUpperCase()} file
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetState}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Import Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {state.preview.membersCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Members</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {state.preview.relationshipsCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Relationships</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {state.preview.marriagesCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Marriages</p>
                </div>
              </div>

              {/* Duplicates Warning */}
              {state.preview.duplicatesCount > 0 && (
                <div className="rounded-lg bg-yellow-500/10 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium text-yellow-600">
                      {state.preview.duplicatesCount} duplicate(s)
                    </span>
                    <span className="text-muted-foreground">
                      {" "}will be skipped
                    </span>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {state.warnings.length > 0 && (
                <div className="rounded-lg bg-yellow-500/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Warnings</span>
                  </div>
                  <ul className="list-disc list-inside text-sm text-yellow-600">
                    {state.warnings.slice(0, 5).map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                    {state.warnings.length > 5 && (
                      <li>...and {state.warnings.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Errors */}
              {state.errors.length > 0 && (
                <div className="rounded-lg bg-destructive/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Errors</span>
                  </div>
                  <ul className="list-disc list-inside text-sm text-destructive">
                    {state.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview List */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Preview (first 10 members)</h4>
                <div className="max-h-40 overflow-y-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Gender</th>
                        <th className="px-3 py-2 text-left">Birth Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.preview.members.map((member, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">
                            {member.firstName} {member.lastName}
                          </td>
                          <td className="px-3 py-2 capitalize">
                            {member.gender || "-"}
                          </td>
                          <td className="px-3 py-2">
                            {member.birthDate || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {state.step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium">Importing members...</p>
              <p className="text-sm text-muted-foreground">
                Please wait while we add your family members
              </p>
            </div>
          )}

          {/* Step: Complete */}
          {state.step === "complete" && state.result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
                <p className="text-lg font-medium">Import Complete!</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center bg-green-500/10">
                  <p className="text-2xl font-bold text-green-600">
                    {state.result.membersCreated}
                  </p>
                  <p className="text-xs text-muted-foreground">Members Added</p>
                </div>
                <div className="rounded-lg border p-3 text-center bg-green-500/10">
                  <p className="text-2xl font-bold text-green-600">
                    {state.result.relationshipsCreated}
                  </p>
                  <p className="text-xs text-muted-foreground">Relationships</p>
                </div>
                <div className="rounded-lg border p-3 text-center bg-green-500/10">
                  <p className="text-2xl font-bold text-green-600">
                    {state.result.marriagesCreated}
                  </p>
                  <p className="text-xs text-muted-foreground">Marriages</p>
                </div>
              </div>

              {/* Warnings */}
              {state.warnings.length > 0 && (
                <div className="rounded-lg bg-yellow-500/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Notes ({state.warnings.length})
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-sm text-yellow-600 max-h-24 overflow-y-auto">
                    {state.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {state.step === "upload" && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}

          {state.step === "preview" && (
            <>
              <Button variant="outline" onClick={resetState}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  state.errors.length > 0 ||
                  !state.preview ||
                  state.preview.membersCount - state.preview.duplicatesCount <= 0
                }
              >
                <Users className="mr-2 h-4 w-4" />
                Import {state.preview ? state.preview.membersCount - state.preview.duplicatesCount : 0} Member(s)
              </Button>
            </>
          )}

          {state.step === "complete" && (
            <Button onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
