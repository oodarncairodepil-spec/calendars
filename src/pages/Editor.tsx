import { useEffect, useState } from "react";
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
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Maximize,
  Lock,
  Unlock,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CalendarType, FORMAT_PRESETS, MONTH_NAMES, DEFAULT_IMAGE_TRANSFORM } from "@/lib/types";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { ImagePanel } from "@/components/editor/ImagePanel";
import { PageFlipBook } from "@/components/preview/PageFlipBook";

const Editor = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const {
    projects,
    activeProjectId,
    activePageIndex,
    setActiveProject,
    setActivePage,
    createProject,
    updateProject,
    getActiveProject,
    getActivePage,
    isPreviewMode,
    setPreviewMode,
  } = useAppStore();

  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("My Calendar 2025");
  const [newProjectType, setNewProjectType] = useState<CalendarType>("wall");
  const [newProjectFormat, setNewProjectFormat] = useState(FORMAT_PRESETS[0]);
  const [newProjectOrientation, setNewProjectOrientation] = useState<"portrait" | "landscape">("portrait");

  // Set active project on mount
  useEffect(() => {
    if (projectId) {
      const exists = projects.find((p) => p.id === projectId);
      if (exists) {
        setActiveProject(projectId);
      } else {
        navigate("/editor");
      }
    } else if (projects.length === 0) {
      setShowNewProjectDialog(true);
    } else if (!activeProjectId) {
      setActiveProject(projects[0].id);
    }
  }, [projectId, projects, activeProjectId, setActiveProject, navigate]);

  const project = getActiveProject();
  const currentPage = getActivePage();

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
          <Select
            value={activeProjectId || ""}
            onValueChange={(id) => navigate(`/editor/${id}`)}
          >
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => setShowNewProjectDialog(true)}>
            New
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
            <div className="h-12 border-b bg-muted/30 flex items-center justify-center gap-4 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePageChange("prev")}
                disabled={activePageIndex === 0}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="flex items-center gap-2">
                <span className="font-medium">{getPageTitle()}</span>
                <span className="text-sm text-muted-foreground">
                  ({activePageIndex + 1} / {project.months.length})
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePageChange("next")}
                disabled={activePageIndex === project.months.length - 1}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>

              {/* Quick page selector */}
              <div className="ml-4 flex gap-1 overflow-x-auto scrollbar-thin max-w-[300px]">
                {project.months.map((page, index) => (
                  <button
                    key={index}
                    onClick={() => setActivePage(index)}
                    className={cn(
                      "px-2 py-1 text-xs rounded transition-colors shrink-0",
                      index === activePageIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    {page.month === "cover" ? "C" : page.month}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-hidden p-4 bg-canvas">
              <EditorCanvas project={project} pageIndex={activePageIndex} />
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

// Properties Panel Component
const PropertiesPanel = () => {
  const {
    getActiveProject,
    getActivePage,
    activePageIndex,
    updatePageLayout,
    updateImageTransform,
    toggleGrid,
    getAssetById,
    selectedFrameType,
    setSelectedFrame,
    imageFit,
    setImageFit,
  } = useAppStore();

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

  const resetTransform = () => {
    updateImageTransform(activePageIndex, DEFAULT_IMAGE_TRANSFORM);
  };

  return (
    <div className="p-4 space-y-6">
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
        </div>
      </div>

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
              <label className="text-sm text-muted-foreground mb-2 flex items-center justify-between">
                <span>Rotation</span>
                <span className="font-mono">{transform.rotation}°</span>
              </label>
              <Slider
                value={[transform.rotation]}
                onValueChange={([value]) => handleTransformChange({ rotation: value })}
                min={-180}
                max={180}
                step={1}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleTransformChange({ rotation: transform.rotation - 90 })}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                -90°
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleTransformChange({ rotation: transform.rotation + 90 })}
              >
                +90°
              </Button>
              <Button variant="outline" size="sm" onClick={resetTransform}>
                Reset
              </Button>
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
