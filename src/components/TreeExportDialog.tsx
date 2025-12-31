"use client";

import { useState, useCallback } from "react";
import { Download, Loader2, Image, ImageIcon, FileText } from "lucide-react";
import { toPng, toJpeg } from "html-to-image";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";

type ExportFormat = "png" | "jpg" | "pdf";
type Resolution = "standard" | "high" | "ultra";

interface ResolutionConfig {
  label: string;
  scale: number;
  description: string;
}

const RESOLUTION_OPTIONS: Record<Resolution, ResolutionConfig> = {
  standard: {
    label: "Standard (1x)",
    scale: 1,
    description: "Good for web sharing",
  },
  high: {
    label: "High (2x)",
    scale: 2,
    description: "Good for documents",
  },
  ultra: {
    label: "Ultra (3x)",
    scale: 3,
    description: "Best for printing",
  },
};

// Dynamic jsPDF loader - loads from CDN when needed
let jsPDFPromise: Promise<any> | null = null;

const loadJsPDF = async (): Promise<any> => {
  if (jsPDFPromise) return jsPDFPromise;

  jsPDFPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).jspdf) {
      resolve((window as any).jspdf.jsPDF);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js";
    script.async = true;
    script.onload = () => {
      resolve((window as any).jspdf.jsPDF);
    };
    script.onerror = () => {
      jsPDFPromise = null;
      reject(new Error("Failed to load PDF library"));
    };
    document.head.appendChild(script);
  });

  return jsPDFPromise;
};

interface TreeExportDialogProps {
  treeName: string;
  trigger?: React.ReactNode;
  getViewportElement: () => HTMLElement | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TreeExportDialog({
  treeName,
  trigger,
  getViewportElement,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: TreeExportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;
  const [format, setFormat] = useState<ExportFormat>("png");
  const [resolution, setResolution] = useState<Resolution>("standard");
  const [isExporting, setIsExporting] = useState(false);

  const handleExportImage = useCallback(
    async (
      element: HTMLElement,
      scale: number,
      imageFormat: "png" | "jpg"
    ): Promise<string> => {
      const options = {
        quality: imageFormat === "jpg" ? 0.95 : undefined,
        pixelRatio: scale,
        backgroundColor: "#f8fafc", // Light slate background
        style: {
          // Hide controls and panels during export
          transform: "scale(1)",
        },
        filter: (node: HTMLElement) => {
          // Filter out React Flow controls, minimap, and panels during export
          const excludeClasses = [
            "react-flow__controls",
            "react-flow__minimap",
            "react-flow__panel",
          ];

          if (node.classList) {
            for (const className of excludeClasses) {
              if (node.classList.contains(className)) {
                return false;
              }
            }
          }
          return true;
        },
      };

      if (imageFormat === "png") {
        return await toPng(element, options);
      } else {
        return await toJpeg(element, options);
      }
    },
    []
  );

  const handleExportPDF = useCallback(
    async (element: HTMLElement, scale: number): Promise<void> => {
      // Load jsPDF dynamically
      const jsPDF = await loadJsPDF();

      // Generate high-quality PNG for the PDF
      const dataUrl = await handleExportImage(element, scale, "png");

      // Create an image to get dimensions
      const img = new window.Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = dataUrl;
      });

      // Calculate PDF dimensions (convert pixels to mm at 96 DPI)
      const pixelsPerMm = 96 / 25.4;
      const imgWidthMm = img.width / scale / pixelsPerMm;
      const imgHeightMm = img.height / scale / pixelsPerMm;

      // Determine orientation based on image dimensions
      const orientation = imgWidthMm > imgHeightMm ? "landscape" : "portrait";

      // Use A4 as base but scale to fit the image
      const a4Width = 297; // A4 landscape width in mm
      const a4Height = 210; // A4 landscape height in mm

      // Calculate scaling to fit within a reasonable page size
      // while maintaining aspect ratio
      let pdfWidth: number;
      let pdfHeight: number;

      if (orientation === "landscape") {
        if (imgWidthMm > a4Width || imgHeightMm > a4Height) {
          const scaleX = a4Width / imgWidthMm;
          const scaleY = a4Height / imgHeightMm;
          const fitScale = Math.min(scaleX, scaleY);
          pdfWidth = imgWidthMm * fitScale;
          pdfHeight = imgHeightMm * fitScale;
        } else {
          pdfWidth = imgWidthMm;
          pdfHeight = imgHeightMm;
        }
      } else {
        const a4PortraitWidth = 210;
        const a4PortraitHeight = 297;
        if (imgWidthMm > a4PortraitWidth || imgHeightMm > a4PortraitHeight) {
          const scaleX = a4PortraitWidth / imgWidthMm;
          const scaleY = a4PortraitHeight / imgHeightMm;
          const fitScale = Math.min(scaleX, scaleY);
          pdfWidth = imgWidthMm * fitScale;
          pdfHeight = imgHeightMm * fitScale;
        } else {
          pdfWidth = imgWidthMm;
          pdfHeight = imgHeightMm;
        }
      }

      // Add margins
      const margin = 10; // 10mm margin
      const pageWidth = pdfWidth + margin * 2;
      const pageHeight = pdfHeight + margin * 2 + 15; // Extra space for title

      // Create PDF with custom page size
      const pdf = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: [pageWidth, pageHeight],
      });

      // Add title
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      const title = `${treeName} - Family Tree`;
      const titleWidth = pdf.getTextWidth(title);
      pdf.text(title, (pageWidth - titleWidth) / 2, margin + 5);

      // Add date
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const date = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const dateWidth = pdf.getTextWidth(date);
      pdf.text(date, (pageWidth - dateWidth) / 2, margin + 11);

      // Add the family tree image
      pdf.addImage(dataUrl, "PNG", margin, margin + 15, pdfWidth, pdfHeight);

      // Save the PDF
      const sanitizedName = treeName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
      const fileName = `${sanitizedName}-family-tree-${resolution}.pdf`;
      pdf.save(fileName);

      return;
    },
    [treeName, resolution, handleExportImage]
  );

  const handleExport = useCallback(async () => {
    const element = getViewportElement();
    if (!element) {
      toast.error("Could not find the tree visualization to export");
      return;
    }

    setIsExporting(true);

    try {
      const scale = RESOLUTION_OPTIONS[resolution].scale;

      if (format === "pdf") {
        await handleExportPDF(element, scale);
        const sanitizedName = treeName
          .replace(/[^a-z0-9]/gi, "-")
          .toLowerCase();
        toast.success(
          `Family tree exported as ${sanitizedName}-family-tree-${resolution}.pdf`
        );
      } else {
        const dataUrl = await handleExportImage(element, scale, format);

        // Create download link
        const link = document.createElement("a");
        const sanitizedName = treeName
          .replace(/[^a-z0-9]/gi, "-")
          .toLowerCase();
        const fileName = `${sanitizedName}-family-tree-${resolution}.${format}`;
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Family tree exported as ${fileName}`);
      }

      setIsOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      if (format === "pdf") {
        toast.error(
          "Failed to export PDF. Please check your internet connection and try again."
        );
      } else {
        toast.error("Failed to export family tree. Please try again.");
      }
    } finally {
      setIsExporting(false);
    }
  }, [
    format,
    resolution,
    treeName,
    getViewportElement,
    handleExportImage,
    handleExportPDF,
  ]);

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : controlledOpen === undefined ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          data-testid="export-tree-trigger"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      ) : null}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md" data-testid="export-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Export Family Tree
            </DialogTitle>
            <DialogDescription>
              Export your family tree as an image or PDF for sharing and
              archival purposes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label htmlFor="format-select">Export Format</Label>
              <Select
                value={format}
                onValueChange={(value: ExportFormat) => setFormat(value)}
              >
                <SelectTrigger
                  id="format-select"
                  className="w-full"
                  data-testid="format-select"
                >
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf" data-testid="format-pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>PDF</span>
                      <span className="text-xs text-muted-foreground">
                        (Best for sharing & archiving)
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="png" data-testid="format-png">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      <span>PNG</span>
                      <span className="text-xs text-muted-foreground">
                        (Best quality, larger file)
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="jpg" data-testid="format-jpg">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      <span>JPG</span>
                      <span className="text-xs text-muted-foreground">
                        (Smaller file, good quality)
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resolution Selection */}
            <div className="space-y-2">
              <Label htmlFor="resolution-select">Resolution</Label>
              <Select
                value={resolution}
                onValueChange={(value: Resolution) => setResolution(value)}
              >
                <SelectTrigger
                  id="resolution-select"
                  className="w-full"
                  data-testid="resolution-select"
                >
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RESOLUTION_OPTIONS).map(([key, config]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      data-testid={`resolution-${key}`}
                    >
                      <div className="flex flex-col">
                        <span>{config.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {config.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info Box */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              {format === "pdf" ? (
                <p>
                  <strong>Tip:</strong> PDF format is ideal for sharing family
                  trees via email or printing. The tree will be automatically
                  sized to fit the page while maintaining quality.
                </p>
              ) : (
                <p>
                  <strong>Tip:</strong> Use{" "}
                  <span className="font-medium">PNG</span> for transparent
                  backgrounds and best quality. Use{" "}
                  <span className="font-medium">JPG</span> for smaller file
                  sizes.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              data-testid="export-confirm-button"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {format === "pdf" ? "PDF" : "Image"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
