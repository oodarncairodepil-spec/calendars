import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, Trash2, Edit2, Download, Upload, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { useAppStore } from "@/store/useAppStore";
import { MONTH_NAMES, CalendarType, FORMAT_PRESETS } from "@/lib/types";
import { exportProjectJSON, importProjectJSON } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const { projects, assets, deleteProject, seedSampleData, loadSnapshot, getSnapshot, createProject, getAssetById } = useAppStore();
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("My Calendar 2025");
  const [newProjectType, setNewProjectType] = useState<CalendarType>("wall");
  const [newProjectFormat, setNewProjectFormat] = useState(FORMAT_PRESETS[0]);
  const [newProjectOrientation, setNewProjectOrientation] = useState<"portrait" | "landscape">("portrait");

  const handleExport = () => {
    const json = exportProjectJSON(getSnapshot());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calendar-projects-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported successfully!" });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const snapshot = importProjectJSON(text);
    if (snapshot) {
      loadSnapshot(snapshot);
      toast({ title: "Imported successfully!" });
    } else {
      toast({ title: "Import failed", description: "Invalid file format", variant: "destructive" });
    }
    e.target.value = "";
  };

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

  return (
    <Layout>
      <div className="container py-8 px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your calendar projects and image library
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="glass-panel rounded-xl p-4">
            <div className="text-2xl font-bold">{projects.length}</div>
            <div className="text-sm text-muted-foreground">Projects</div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="text-2xl font-bold">{assets.length}</div>
            <div className="text-sm text-muted-foreground">Images</div>
          </div>
          <div className="glass-panel rounded-xl p-4 col-span-2 flex items-center gap-4">
            <div className="flex-1">
              <Button variant="outline" size="sm" onClick={handleExport} className="mr-2">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <label>
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </span>
                </Button>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
            {projects.length === 0 && assets.length === 0 && (
              <Button variant="secondary" size="sm" onClick={seedSampleData}>
                <Sparkles className="w-4 h-4 mr-2" />
                Load Demo
              </Button>
            )}
          </div>
        </motion.div>

        {/* Projects Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold">Projects</h2>
            <Button onClick={() => setShowNewProjectDialog(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>

          {projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel rounded-xl p-12 text-center"
            >
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first calendar project to get started
              </p>
              <Button onClick={() => setShowNewProjectDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {projects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-panel rounded-xl overflow-hidden group hover:shadow-medium transition-shadow"
                  >
                    <Link to={`/editor/${project.id}`}>
                      <div className="aspect-[4/3] bg-canvas relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className="bg-card shadow-page rounded"
                            style={{
                              width: project.orientation === "portrait" ? "60%" : "80%",
                              aspectRatio:
                                project.orientation === "portrait"
                                  ? `${project.format.width}/${project.format.height}`
                                  : `${project.format.height}/${project.format.width}`,
                            }}
                          >
                            <div className="p-2 h-full flex flex-col">
                              {(() => {
                                const coverPage = project.months.find(p => p.month === "cover");
                                const coverImageId = coverPage?.assignedImageId;
                                const coverImage = coverImageId ? getAssetById(coverImageId) : null;
                                
                                return coverImage ? (
                                  <div className="flex-1 rounded-sm overflow-hidden">
                                    <img 
                                      src={coverImage.url} 
                                      alt={project.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex-1 bg-muted rounded-sm" />
                                );
                              })()}
                              <div className="mt-1 h-4 bg-muted/50 rounded-sm" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold truncate">{project.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {project.calendarType === "wall" ? "Wall Calendar" : "Desk Calendar"} •{" "}
                            {project.format.width}×{project.format.height}
                            {project.format.unit}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/editor/${project.id}`);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              deleteProject(project.id);
                              toast({ title: "Project deleted" });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

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
    </Layout>
  );
};

export default Dashboard;
