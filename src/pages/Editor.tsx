import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Save,
  Settings,
  Image as ImageIcon,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Move,
  Maximize,
  Lock,
  Unlock,
  Download,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CalendarType, FORMAT_PRESETS, FONT_PRESETS, MONTH_NAMES, DEFAULT_IMAGE_TRANSFORM } from "@/lib/types";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { ImagePanel } from "@/components/editor/ImagePanel";
import { PageFlipBook } from "@/components/preview/PageFlipBook";
import { saveState } from "@/lib/storage";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

const Editor = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Subscribe to projects and activeProjectId FIRST to ensure re-render on update
  const projects = useAppStore((state) => state.projects);
  const activeProjectId = useAppStore((state) => state.activeProjectId);
  
  const {
    activePageIndex,
    setActiveProject,
    setActivePage,
    createProject,
    updateProject,
    isPreviewMode,
    setPreviewMode,
    getSnapshot,
  } = useAppStore();

  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("My Calendar 2025");
  const [newProjectType, setNewProjectType] = useState<CalendarType>("wall");
  const [newProjectFormat, setNewProjectFormat] = useState(FORMAT_PRESETS[0]);
  const [newProjectOrientation, setNewProjectOrientation] = useState<"portrait" | "landscape">("portrait");

  // Track previous projectId to detect actual changes
  const prevProjectIdRef = useRef<string | undefined>(projectId);
  const projectsInitializedRef = useRef(false);

  // Set active project on mount or when projectId changes (not when project properties are updated)
  useEffect(() => {
    const projectIdChanged = prevProjectIdRef.current !== projectId;
    prevProjectIdRef.current = projectId;

    if (projectId) {
      // Check if project exists in current projects array (from subscription)
      const exists = projects.find((p) => p.id === projectId);
      
      if (exists) {
        // Set active project if:
        // 1. projectId changed (URL changed), OR
        // 2. project is not currently active (projects just loaded from Supabase)
        // This prevents resetting activePageIndex when project properties are updated
        if (projectIdChanged || activeProjectId !== projectId) {
          setActiveProject(projectId);
        }
      } else if (projectIdChanged && projects.length > 0) {
        // Only navigate if projectId changed, projects are loaded, but project doesn't exist
        // If projects.length is 0, projects might still be loading, so don't navigate yet
        navigate("/");
      }
    } else if (!activeProjectId && !projectsInitializedRef.current) {
      // Only set first project on initial mount, not on every projects array change
      if (projects.length > 0) {
        setActiveProject(projects[0].id);
        projectsInitializedRef.current = true;
      }
    }
    // Don't auto-show dialog on reload - user should navigate to dashboard to create new project
    // Note: 'projects' is in dependencies to handle case when projects are loaded from Supabase
  }, [projectId, activeProjectId, setActiveProject, navigate, projects]); // Added 'projects' back to handle async loading

  // Get current project - defined early so it can be used throughout the component
  const project = projects.find(p => p.id === activeProjectId);
  const currentPage = project ? project.months[activePageIndex] : null;

  const handleCreateProject = () => {
    const id = createProject(
      newProjectTitle,
      newProjectType,
      { width: newProjectFormat.width, height: newProjectFormat.height, unit: newProjectFormat.unit },
      newProjectOrientation
    );
    setShowNewProjectDialog(false);
    navigate(`/editor/${id}`);
    toast({ title: "Project created!" });
  };

  const handlePageChange = (direction: "prev" | "next") => {
    if (!project) return;
    const newIndex =
      direction === "prev"
        ? Math.max(0, activePageIndex - 1)
        : Math.min(project.months.length - 1, activePageIndex + 1);
    setActivePage(newIndex);
  };

  const getPageTitle = () => {
    if (!currentPage) return "";
    if (currentPage.month === "cover") return "Cover";
    return MONTH_NAMES[(currentPage.month as number) - 1];
  };

  const handleDownloadPDF = async () => {
    if (!project) return;

    try {
      toast({
        title: "Generating PDF...",
        description: "Please wait while we prepare your calendar.",
      });

      // Get the format dimensions in mm
      const width = project.format.unit === "mm" 
        ? project.format.width 
        : project.format.width * 0.264583; // Convert px to mm (1px = 0.264583mm)
      const height = project.format.unit === "mm"
        ? project.format.height
        : project.format.height * 0.264583;

      // Create PDF with correct orientation
      const pdf = new jsPDF({
        orientation: project.orientation === "landscape" ? "landscape" : "portrait",
        unit: "mm",
        format: [width, height],
      });

      // Store original page index to restore later
      const originalPageIndex = activePageIndex;

      // Process each page
      for (let i = 0; i < project.months.length; i++) {
        // Set active page to render it
        setActivePage(i);

        // Wait for DOM to update and React to re-render
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Find the canvas element using data attribute
        let canvasContainer = document.querySelector(
          `[data-page-index="${i}"]`
        ) as HTMLElement;

        // If not found by data attribute, try to find visible canvas
        if (!canvasContainer || canvasContainer.offsetParent === null) {
          const allContainers = document.querySelectorAll(
            ".relative.bg-card.shadow-page.rounded-sm.overflow-hidden"
          );
          canvasContainer = Array.from(allContainers).find((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
          }) as HTMLElement;
        }

        if (canvasContainer) {
          try {
            // Capture the canvas
            const dataUrl = await toPng(canvasContainer, {
              backgroundColor: "#ffffff",
              quality: 1.0,
              pixelRatio: 2, // Higher quality
              cacheBust: true,
            });

            // Add page to PDF (except first page, which is already created)
            if (i > 0) {
              pdf.addPage([width, height], project.orientation === "landscape" ? "landscape" : "portrait");
            }

            // Add image to PDF
            pdf.addImage(dataUrl, "PNG", 0, 0, width, height, undefined, "FAST");
          } catch (imgError) {
            console.error(`Failed to capture page ${i + 1}:`, imgError);
          }
        }
      }

      // Restore original page index
      setActivePage(originalPageIndex);

      // Wait a bit before saving to ensure UI is restored
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Generate filename (sanitize for filename)
      const sanitizedTitle = (project.title || "Calendar").replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const filename = `${sanitizedTitle}.pdf`;

      // Save PDF
      pdf.save(filename);

      toast({
        title: "PDF Downloaded",
        description: `Your calendar has been saved as ${filename}`,
      });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isPreviewMode && project) {
    return <PageFlipBook project={project} onClose={() => setPreviewMode(false)} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 border-b bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {project ? (
            <div className="flex items-center gap-3">
              <Input
                value={project.title}
                onChange={(e) => updateProject(project.id, { title: e.target.value })}
                className="font-semibold bg-transparent border-none h-8 w-48"
              />
              <span className="text-xs text-muted-foreground">
                {project.calendarType === "wall" ? "Wall" : "Desk"} •{" "}
                {project.format.width}×{project.format.height}
                {project.format.unit}
              </span>
            </div>
          ) : (
            <span className="font-semibold">Calendar Editor</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const snapshot = getSnapshot();
                await saveState(snapshot);
                toast({
                  title: "Saved",
                  description: "Project has been saved successfully.",
                });
              } catch (error) {
                console.error("Failed to save:", error);
                toast({
                  title: "Error",
                  description: "Failed to save project. Please try again.",
                  variant: "destructive",
                });
              }
            }}
            disabled={!project}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setPreviewMode(true)}
            disabled={!project}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={!project}
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </header>

      {/* Main Editor Area */}
      {project && currentPage ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Image Library */}
          <div className="w-64 border-r bg-card/50 overflow-hidden flex flex-col shrink-0 hidden md:flex">
            <ImagePanel />
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Page Navigation */}
            <div className="min-h-12 border-b bg-muted/30 flex items-center justify-center gap-2 px-2 shrink-0 flex-wrap py-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange("prev")}
                disabled={activePageIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-medium text-sm">{getPageTitle()}</span>
                <span className="text-xs text-muted-foreground">
                  ({activePageIndex + 1} / {project.months.length})
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange("next")}
                disabled={activePageIndex === project.months.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              {/* Quick page selector */}
              <div className="flex gap-1 flex-wrap justify-center flex-1 min-w-0">
                {project.months.map((page, index) => (
                  <button
                    key={index}
                    onClick={() => setActivePage(index)}
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] rounded transition-colors shrink-0 min-w-[24px]",
                      index === activePageIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    {page.month === "cover" ? "C" : index}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-hidden p-6 bg-canvas flex items-center justify-center">
              <div className="w-full h-full max-w-5xl max-h-[calc(100vh-10rem)] flex items-center justify-center">
                <EditorCanvas project={project} pageIndex={activePageIndex} />
              </div>
            </div>
          </div>

          {/* Right Panel - Properties */}
          <div className="w-72 border-l bg-card/50 overflow-y-auto scrollbar-thin shrink-0 hidden lg:block">
            <PropertiesPanel />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">No project selected</h2>
            <p className="text-muted-foreground mb-4">Create a new project to get started</p>
            <Button onClick={() => setShowNewProjectDialog(true)}>Create Project</Button>
          </div>
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Calendar</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Project Name</label>
              <Input
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="My Calendar 2025"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Calendar Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["wall", "desk"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewProjectType(type)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-center transition-all",
                      newProjectType === type
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="font-medium capitalize">{type}</div>
                    <div className="text-xs text-muted-foreground">
                      {type === "wall" ? "Hanging calendar" : "Desktop stand"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Format</label>
              <Select
                value={newProjectFormat.name}
                onValueChange={(name) => {
                  const preset = FORMAT_PRESETS.find((p) => p.name === name);
                  if (preset) setNewProjectFormat(preset);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_PRESETS.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.name} ({preset.width}×{preset.height}
                      {preset.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Orientation</label>
              <div className="grid grid-cols-2 gap-2">
                {(["portrait", "landscape"] as const).map((orientation) => (
                  <button
                    key={orientation}
                    onClick={() => setNewProjectOrientation(orientation)}
                    className={cn(
                      "p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all",
                      newProjectOrientation === orientation
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div
                      className={cn(
                        "bg-muted rounded",
                        orientation === "portrait" ? "w-4 h-6" : "w-6 h-4"
                      )}
                    />
                    <span className="text-sm capitalize">{orientation}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleCreateProject} className="w-full">
              Create Calendar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Margin Inputs Component with local state
const MarginInputs = ({ page, activePageIndex, updatePageMargins }: { page: any; activePageIndex: number; updatePageMargins: any }) => {
  const currentMargins = page.margins || { top: 10, right: 10, bottom: 10, left: 10 };
  
  const [marginValues, setMarginValues] = useState({
    top: String(currentMargins.top),
    right: String(currentMargins.right),
    bottom: String(currentMargins.bottom),
    left: String(currentMargins.left),
  });
  
  // Sync with page margins when page changes
  useEffect(() => {
    const margins = page.margins || { top: 10, right: 10, bottom: 10, left: 10 };
    setMarginValues({
      top: String(margins.top),
      right: String(margins.right),
      bottom: String(margins.bottom),
      left: String(margins.left),
    });
  }, [page.margins]);
  
  const handleMarginChange = (side: 'top' | 'right' | 'bottom' | 'left', value: string) => {
    // Update local state immediately for responsive UI
    setMarginValues(prev => ({ ...prev, [side]: value }));
    
    // Parse and update actual margins
    if (value === '' || value === '-') {
      // Allow empty or negative sign while typing
      return;
    }
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      // Reset to 0 if invalid
      const newMargins = {
        ...currentMargins,
        [side]: 0,
      };
      updatePageMargins(activePageIndex, newMargins, page.month !== 'cover');
      return;
    }
    
    const newMargins = {
      ...currentMargins,
      [side]: numValue,
    };
    updatePageMargins(activePageIndex, newMargins, page.month !== 'cover');
  };
  
  const handleBlur = (side: 'top' | 'right' | 'bottom' | 'left') => {
    // When user leaves input, ensure value is valid
    const value = marginValues[side];
    if (value === '' || value === '-') {
      // Reset to 0 if empty
      setMarginValues(prev => ({ ...prev, [side]: '0' }));
      const newMargins = {
        ...currentMargins,
        [side]: 0,
      };
      updatePageMargins(activePageIndex, newMargins, page.month !== 'cover');
    } else {
      // Ensure it's a valid number
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        setMarginValues(prev => ({ ...prev, [side]: '0' }));
        const newMargins = {
          ...currentMargins,
          [side]: 0,
        };
        updatePageMargins(activePageIndex, newMargins, page.month !== 'cover');
      }
    }
  };
  
  return (
    <div className="space-y-3 pt-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Top</label>
          <Input
            type="number"
            min="0"
            step="1"
            value={marginValues.top}
            onChange={(e) => handleMarginChange('top', e.target.value)}
            onBlur={() => handleBlur('top')}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Right</label>
          <Input
            type="number"
            min="0"
            step="1"
            value={marginValues.right}
            onChange={(e) => handleMarginChange('right', e.target.value)}
            onBlur={() => handleBlur('right')}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Bottom</label>
          <Input
            type="number"
            min="0"
            step="1"
            value={marginValues.bottom}
            onChange={(e) => handleMarginChange('bottom', e.target.value)}
            onBlur={() => handleBlur('bottom')}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Left</label>
          <Input
            type="number"
            min="0"
            step="1"
            value={marginValues.left}
            onChange={(e) => handleMarginChange('left', e.target.value)}
            onBlur={() => handleBlur('left')}
            className="h-8 text-sm"
          />
        </div>
      </div>
      {page.month !== 'cover' && (
        <p className="text-xs text-muted-foreground mt-2">
          Changes will apply to all month pages
        </p>
      )}
    </div>
  );
};

// Properties Panel Component
const PropertiesPanel = () => {
  const {
    getActiveProject,
    getActivePage,
    activePageIndex,
    updatePageLayout,
    updateImageTransform,
    toggleGrid,
    updateCoverText,
    updatePageMargins,
    getAssetById,
    selectedFrameType,
    setSelectedFrame,
    imageFit,
    setImageFit,
    updateProject,
  } = useAppStore();

  // Get current project and page
  const project = getActiveProject();
  const page = getActivePage();
  
  if (!project || !page) return null;

  const assignedImage = page.assignedImageId ? getAssetById(page.assignedImageId) : null;
  const imageFrame = page.layout.imageFrame;
  const gridFrame = page.layout.calendarGridFrame;
  const transform = page.imageTransform;

  const handleTransformChange = (updates: Partial<typeof transform>) => {
    updateImageTransform(activePageIndex, { ...transform, ...updates });
  };

  return (
    <div className="p-4 space-y-6">
      {/* Project Settings */}
      <Accordion type="single" collapsible defaultValue="" className="w-full">
        <AccordionItem value="project-settings" className="border-none">
          <AccordionTrigger className="py-0 hover:no-underline">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Project Settings
            </h3>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-3">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Calendar Type</label>
            <Select
              value={project.calendarType}
              onValueChange={(value) => {
                updateProject(project.id, { calendarType: value as 'wall' | 'desk' });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wall">Wall</SelectItem>
                <SelectItem value="desk">Desk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Format</label>
            <Select
              value={(() => {
                const matchingPreset = FORMAT_PRESETS.find(
                  (p) => p.width === project.format.width && p.height === project.format.height && p.unit === project.format.unit
                );
                return matchingPreset ? matchingPreset.name : 'Custom';
              })()}
              onValueChange={(value) => {
                if (value === 'Custom') {
                  // Keep current format if Custom is selected
                  return;
                }
                const preset = FORMAT_PRESETS.find((p) => p.name === value);
                if (preset) {
                  updateProject(project.id, { format: { width: preset.width, height: preset.height, unit: preset.unit } });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue>
                  {(() => {
                    const matchingPreset = FORMAT_PRESETS.find(
                      (p) => p.width === project.format.width && p.height === project.format.height && p.unit === project.format.unit
                    );
                    if (matchingPreset) {
                      return `${matchingPreset.name} (${matchingPreset.width}×${matchingPreset.height} ${matchingPreset.unit})`;
                    }
                    return `Custom (${project.format.width}×${project.format.height} ${project.format.unit})`;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FORMAT_PRESETS.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.name} ({preset.width}×{preset.height} {preset.unit})
                  </SelectItem>
                ))}
                <SelectItem value="Custom">
                  Custom ({project.format.width}×{project.format.height} {project.format.unit})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Orientation</label>
            <Select
              value={project.orientation}
              onValueChange={(value) => {
                updateProject(project.id, { orientation: value as 'portrait' | 'landscape' });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Font Family</label>
            <Select
              value={project.fontFamily || 'Inter'}
              onValueChange={(value) => {
                updateProject(project.id, { fontFamily: value });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_PRESETS.map((font) => (
                  <SelectItem key={font.name} value={font.name}>
                    <span style={{ fontFamily: font.family }}>{font.displayName}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

      {/* Cover Page Properties - Only show for cover page */}
      {page.month === 'cover' && (
        <Accordion type="single" collapsible defaultValue="" className="w-full">
          <AccordionItem value="cover-text" className="border-none">
            <AccordionTrigger className="py-0 hover:no-underline">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Cover Page Text
              </h3>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Top Text</label>
                  <Textarea
                    placeholder="Enter text for top section..."
                    value={page.coverTextTop || ""}
                    onChange={(e) => updateCoverText(activePageIndex, 'top', e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Bottom Text</label>
                  <Textarea
                    placeholder="Enter text for bottom section..."
                    value={page.coverTextBottom || ""}
                    onChange={(e) => updateCoverText(activePageIndex, 'bottom', e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Page Margins */}
      <Accordion type="single" collapsible defaultValue="" className="w-full">
        <AccordionItem value="page-margins" className="border-none">
          <AccordionTrigger className="py-0 hover:no-underline">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Page Margins
              {page.month === 'cover' ? ' (Cover)' : ' (Month Pages)'}
            </h3>
          </AccordionTrigger>
          <AccordionContent>
            <MarginInputs page={page} activePageIndex={activePageIndex} updatePageMargins={updatePageMargins} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Page Properties - Only show for non-cover pages */}
      {page.month !== 'cover' && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Page Properties
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Show Calendar Grid</span>
              <Switch
                checked={page.showGrid}
                onCheckedChange={() => toggleGrid(activePageIndex)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm">Months per Page</span>
                <span className="text-xs text-muted-foreground">Number of months to display</span>
              </div>
              <Select
                key={`select-${project.id}-${project.monthsPerPage}`}
                value={String(project.monthsPerPage ?? 1)}
                onValueChange={(value) => {
                  const currentValue = String(project.monthsPerPage ?? 1);
                  // Prevent multiple rapid calls
                  if (value === currentValue) {
                    return;
                  }
                  const numValue = parseInt(value, 10) as 1 | 2;
                  if (numValue === 1 || numValue === 2) {
                    updateProject(project.id, { monthsPerPage: numValue });
                  }
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Month</SelectItem>
                  <SelectItem value="2">2 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Frame Selection */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Grid3X3 className="w-4 h-4" />
          Frame Selection
        </h3>

        <Tabs value={selectedFrameType || "none"} onValueChange={(v) => setSelectedFrame(v === "none" ? null : (v as "image" | "grid"))}>
          <TabsList className="w-full">
            <TabsTrigger value="image" className="flex-1 gap-1">
              <ImageIcon className="w-3 h-3" />
              Image
            </TabsTrigger>
            <TabsTrigger value="grid" className="flex-1 gap-1">
              <Grid3X3 className="w-3 h-3" />
              Grid
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {selectedFrameType && (
          <div className="mt-3 p-3 bg-secondary/30 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-muted-foreground">X</label>
                <div className="font-mono">
                  {((selectedFrameType === "image" ? imageFrame.x : gridFrame.x) * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <label className="text-muted-foreground">Y</label>
                <div className="font-mono">
                  {((selectedFrameType === "image" ? imageFrame.y : gridFrame.y) * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <label className="text-muted-foreground">Width</label>
                <div className="font-mono">
                  {((selectedFrameType === "image" ? imageFrame.w : gridFrame.w) * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <label className="text-muted-foreground">Height</label>
                <div className="font-mono">
                  {((selectedFrameType === "image" ? imageFrame.h : gridFrame.h) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Drag the frame handles on canvas to resize
            </p>
          </div>
        )}
      </div>

      {/* Image Transform */}
      {assignedImage && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Image Transform
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg">
              <img
                src={assignedImage.url}
                alt={assignedImage.name}
                className="w-10 h-10 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{assignedImage.name}</p>
                <p className="text-xs text-muted-foreground">
                  {assignedImage.originalWidth}×{assignedImage.originalHeight}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 flex items-center justify-between">
                <span>Scale</span>
                <span className="font-mono">{(transform.scale * 100).toFixed(0)}%</span>
              </label>
              <Slider
                value={[transform.scale]}
                onValueChange={([value]) => handleTransformChange({ scale: value })}
                min={0.5}
                max={3}
                step={0.05}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Fit Mode</label>
              <Select value={imageFit} onValueChange={(v) => setImageFit(v as "cover" | "contain" | "stretch")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover (fill frame)</SelectItem>
                  <SelectItem value="contain">Contain (fit inside)</SelectItem>
                  <SelectItem value="stretch">Stretch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
