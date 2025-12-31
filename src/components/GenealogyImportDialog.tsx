import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Users,
  Loader2,
  ExternalLink,
  Database,
  GitBranch,
  Heart,
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
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import {
  useGenealogyServices,
  useGenealogyImport,
  useParseGedcomFile,
  type GenealogyPerson,
  type GenealogyRelationship,
  type GenealogyMarriage,
} from "~/hooks/useGenealogyImport";
import type { GenealogyService } from "~/db/schema";
import { toast } from "sonner";

interface GenealogyImportDialogProps {
  familyTreeId: string;
  treeName: string;
  trigger?: React.ReactNode;
  onImportComplete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type ImportStep = "service" | "upload" | "preview" | "options" | "importing" | "complete";

interface ImportState {
  step: ImportStep;
  selectedService: GenealogyService | null;
  file: File | null;
  content: string;
  parsedData: {
    persons: GenealogyPerson[];
    relationships: GenealogyRelationship[];
    marriages: GenealogyMarriage[];
    sourceTreeName?: string;
  } | null;
  options: {
    importRelationships: boolean;
    importEvents: boolean;
    skipDuplicates: boolean;
  };
  errors: string[];
  warnings: string[];
  result: {
    membersCreated: number;
    relationshipsCreated: number;
    marriagesCreated: number;
    duplicatesSkipped: number;
  } | null;
}

const initialState: ImportState = {
  step: "service",
  selectedService: null,
  file: null,
  content: "",
  parsedData: null,
  options: {
    importRelationships: true,
    importEvents: true,
    skipDuplicates: true,
  },
  errors: [],
  warnings: [],
  result: null,
};

// Service icons and colors
const serviceConfig: Record<
  GenealogyService,
  { icon: string; color: string; bgColor: string }
> = {
  familysearch: { icon: "FS", color: "text-green-700", bgColor: "bg-green-100" },
  ancestry: { icon: "A", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  myheritage: { icon: "MH", color: "text-blue-700", bgColor: "bg-blue-100" },
  findmypast: { icon: "FP", color: "text-purple-700", bgColor: "bg-purple-100" },
  gedmatch: { icon: "G", color: "text-orange-700", bgColor: "bg-orange-100" },
};

export function GenealogyImportDialog({
  familyTreeId,
  treeName,
  trigger,
  onImportComplete,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: GenealogyImportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [state, setState] = useState<ImportState>(initialState);

  const { data: services, isLoading: servicesLoading } = useGenealogyServices();
  const parseGedcomMutation = useParseGedcomFile();
  const importMutation = useGenealogyImport(familyTreeId);

  const resetState = () => {
    setState(initialState);
    parseGedcomMutation.reset();
    importMutation.reset();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    setOpen(newOpen);
  };

  const handleServiceSelect = (service: GenealogyService) => {
    setState((prev) => ({
      ...prev,
      selectedService: service,
      step: "upload",
    }));
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const ext = file.name.split(".").pop()?.toLowerCase();

      // Check for GEDCOM file extension
      if (ext !== "ged" && ext !== "gedcom") {
        setState((prev) => ({
          ...prev,
          errors: ["Please upload a GEDCOM file (.ged or .gedcom)"],
        }));
        return;
      }

      try {
        const content = await file.text();
        setState((prev) => ({
          ...prev,
          file,
          content,
          errors: [],
        }));

        // Parse the GEDCOM content
        const result = await parseGedcomMutation.mutateAsync({
          content,
          service: state.selectedService || "familysearch",
        });

        if (result.success && result.data) {
          setState((prev) => ({
            ...prev,
            step: "preview",
            parsedData: {
              persons: result.data!.persons,
              relationships: result.data!.relationships,
              marriages: result.data!.marriages,
              sourceTreeName: result.data!.sourceTreeName,
            },
            errors: [],
          }));
        } else {
          setState((prev) => ({
            ...prev,
            errors: result.errors || ["Failed to parse GEDCOM file"],
          }));
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          errors: [error instanceof Error ? error.message : "Failed to read file"],
        }));
      }
    },
    [parseGedcomMutation, state.selectedService]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/x-gedcom": [".ged", ".gedcom"],
      "text/plain": [".ged", ".gedcom"],
    },
    maxFiles: 1,
    disabled: state.step !== "upload" || parseGedcomMutation.isPending,
  });

  const handleProceedToOptions = () => {
    setState((prev) => ({ ...prev, step: "options" }));
  };

  const handleImport = async () => {
    if (!state.parsedData || !state.selectedService) return;

    setState((prev) => ({ ...prev, step: "importing" }));

    try {
      const result = await importMutation.mutateAsync({
        service: state.selectedService,
        sourceTreeName: state.parsedData.sourceTreeName,
        persons: state.parsedData.persons,
        relationships: state.options.importRelationships
          ? state.parsedData.relationships
          : [],
        marriages: state.parsedData.marriages,
        options: state.options,
      });

      if (result.success) {
        setState((prev) => ({
          ...prev,
          step: "complete",
          result: {
            membersCreated: result.membersCreated,
            relationshipsCreated: result.relationshipsCreated,
            marriagesCreated: result.marriagesCreated,
            duplicatesSkipped: result.duplicatesSkipped,
          },
          warnings: [...prev.warnings, ...result.warnings],
        }));
        toast.success(
          `Successfully imported ${result.membersCreated} member(s) from genealogy database`
        );
        onImportComplete?.();
      } else {
        setState((prev) => ({
          ...prev,
          step: "options",
          errors: result.errors,
          warnings: [...prev.warnings, ...result.warnings],
        }));
        toast.error("Import failed");
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        step: "options",
        errors: [error instanceof Error ? error.message : "Import failed"],
      }));
      toast.error("Import failed");
    }
  };

  const goBack = () => {
    setState((prev) => {
      switch (prev.step) {
        case "upload":
          return { ...prev, step: "service", selectedService: null };
        case "preview":
          return {
            ...prev,
            step: "upload",
            parsedData: null,
            file: null,
            content: "",
          };
        case "options":
          return { ...prev, step: "preview" };
        default:
          return prev;
      }
    });
  };

  const isControlled = controlledOpen !== undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Database className="mr-2 h-4 w-4" />
              Import from Genealogy DB
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Import from Genealogy Database
          </DialogTitle>
          <DialogDescription>
            Import family members from genealogy services like FamilySearch or
            Ancestry into "{treeName}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step: Select Service */}
          {state.step === "service" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select the genealogy service you want to import from. You can
                upload a GEDCOM file exported from any of these services.
              </p>

              {servicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services?.map((service) => {
                    const config = serviceConfig[service.id];
                    return (
                      <button
                        key={service.id}
                        onClick={() => handleServiceSelect(service.id)}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                          "hover:border-primary hover:bg-muted/50"
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm",
                            config.bgColor,
                            config.color
                          )}
                        >
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{service.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {service.description}
                          </div>
                          <a
                            href={service.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
                          >
                            Visit website
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="rounded-lg bg-muted/50 p-4 mt-4">
                <h4 className="text-sm font-medium mb-2">
                  How to export GEDCOM from your genealogy service:
                </h4>
                <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Log in to your genealogy service account</li>
                  <li>Navigate to your family tree settings or export options</li>
                  <li>Select "Export" or "Download" and choose GEDCOM format</li>
                  <li>Save the .ged file to your computer</li>
                  <li>Upload the file in the next step</li>
                </ol>
              </div>
            </div>
          )}

          {/* Step: Upload */}
          {state.step === "upload" && (
            <div className="space-y-4">
              {/* Selected Service Header */}
              {state.selectedService && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded font-bold text-xs",
                      serviceConfig[state.selectedService].bgColor,
                      serviceConfig[state.selectedService].color
                    )}
                  >
                    {serviceConfig[state.selectedService].icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {services?.find((s) => s.id === state.selectedService)?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Upload a GEDCOM file exported from this service
                    </div>
                  </div>
                </div>
              )}

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                  parseGedcomMutation.isPending && "opacity-50 cursor-not-allowed"
                )}
              >
                <input {...getInputProps()} />
                {parseGedcomMutation.isPending ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Parsing GEDCOM file...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {isDragActive
                        ? "Drop GEDCOM file here"
                        : "Drag and drop a GEDCOM file"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or click to browse (.ged, .gedcom)
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
            </div>
          )}

          {/* Step: Preview */}
          {state.step === "preview" && state.parsedData && (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{state.file?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {state.parsedData.sourceTreeName || "GEDCOM file"}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={goBack}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Import Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold text-primary">
                    {state.parsedData.persons.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Persons</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <GitBranch className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold text-primary">
                    {state.parsedData.relationships.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Relationships</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <Heart className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold text-primary">
                    {state.parsedData.marriages.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Marriages</p>
                </div>
              </div>

              {/* Preview List */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  Preview (first 10 persons)
                </h4>
                <div className="max-h-48 overflow-y-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Gender</th>
                        <th className="px-3 py-2 text-left">Birth Date</th>
                        <th className="px-3 py-2 text-left">Birth Place</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.parsedData.persons.slice(0, 10).map((person, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">
                            {person.firstName}{" "}
                            {person.middleName ? person.middleName + " " : ""}
                            {person.lastName}
                          </td>
                          <td className="px-3 py-2 capitalize">
                            {person.gender || "-"}
                          </td>
                          <td className="px-3 py-2">{person.birthDate || "-"}</td>
                          <td className="px-3 py-2 truncate max-w-[150px]">
                            {person.birthPlace || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {state.parsedData.persons.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">
                    ...and {state.parsedData.persons.length - 10} more persons
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step: Options */}
          {state.step === "options" && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Import Options</h4>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="importRelationships"
                    checked={state.options.importRelationships}
                    onCheckedChange={(checked) =>
                      setState((prev) => ({
                        ...prev,
                        options: {
                          ...prev.options,
                          importRelationships: checked === true,
                        },
                      }))
                    }
                  />
                  <Label
                    htmlFor="importRelationships"
                    className="text-sm font-normal"
                  >
                    Import parent-child relationships
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skipDuplicates"
                    checked={state.options.skipDuplicates}
                    onCheckedChange={(checked) =>
                      setState((prev) => ({
                        ...prev,
                        options: {
                          ...prev.options,
                          skipDuplicates: checked === true,
                        },
                      }))
                    }
                  />
                  <Label htmlFor="skipDuplicates" className="text-sm font-normal">
                    Skip duplicate members (based on name matching)
                  </Label>
                </div>
              </div>

              {/* Summary */}
              {state.parsedData && (
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <h5 className="text-sm font-medium">Import Summary</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      <strong>{state.parsedData.persons.length}</strong> persons
                      will be imported
                    </li>
                    {state.options.importRelationships && (
                      <li>
                        <strong>{state.parsedData.relationships.length}</strong>{" "}
                        parent-child relationships
                      </li>
                    )}
                    <li>
                      <strong>{state.parsedData.marriages.length}</strong> marriages
                    </li>
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
            </div>
          )}

          {/* Step: Importing */}
          {state.step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium">Importing from genealogy database...</p>
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <div className="rounded-lg border p-3 text-center bg-yellow-500/10">
                  <p className="text-2xl font-bold text-yellow-600">
                    {state.result.duplicatesSkipped}
                  </p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
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
          {state.step === "service" && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}

          {state.step === "upload" && (
            <>
              <Button variant="outline" onClick={goBack}>
                Back
              </Button>
            </>
          )}

          {state.step === "preview" && (
            <>
              <Button variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button onClick={handleProceedToOptions}>
                Continue
              </Button>
            </>
          )}

          {state.step === "options" && (
            <>
              <Button variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  !state.parsedData ||
                  state.parsedData.persons.length === 0 ||
                  state.errors.length > 0
                }
              >
                <Upload className="mr-2 h-4 w-4" />
                Import {state.parsedData?.persons.length || 0} Persons
              </Button>
            </>
          )}

          {state.step === "complete" && (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
