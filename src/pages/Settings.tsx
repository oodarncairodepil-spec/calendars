import { motion } from "framer-motion";
import { Settings as SettingsIcon, Trash2, HardDrive, Download, Upload } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { clearLocalStorage, exportProjectJSON, importProjectJSON } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const { projects, assets, groups, getSnapshot, loadSnapshot } = useAppStore();

  const handleClearData = () => {
    if (window.confirm("Are you sure you want to delete all data? This cannot be undone.")) {
      clearLocalStorage();
      window.location.reload();
    }
  };

  const handleExport = () => {
    const json = exportProjectJSON(getSnapshot());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calendar-maker-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Data exported!" });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const snapshot = importProjectJSON(text);
    if (snapshot) {
      loadSnapshot(snapshot);
      toast({ title: "Data imported!" });
    } else {
      toast({ title: "Import failed", description: "Invalid file format", variant: "destructive" });
    }
    e.target.value = "";
  };

  const estimatedSize = new Blob([JSON.stringify({ projects, assets, groups })]).size;
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Layout>
      <div className="container py-8 px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your app preferences and data</p>
        </motion.div>

        <div className="space-y-6">
          {/* Storage Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold">Storage</h2>
                <p className="text-sm text-muted-foreground">
                  Data stored locally in your browser
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{projects.length}</div>
                <div className="text-xs text-muted-foreground">Projects</div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{assets.length}</div>
                <div className="text-xs text-muted-foreground">Images</div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{formatBytes(estimatedSize)}</div>
                <div className="text-xs text-muted-foreground">Size</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Note: Uploaded images are stored as temporary URLs and may be lost if browser data is cleared.
              Use URL-based images for permanence, or export your data regularly.
            </p>
          </motion.div>

          {/* Data Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-xl p-6"
          >
            <h2 className="font-semibold mb-4">Data Management</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export Data
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Download all projects and settings as JSON
                  </p>
                </div>
                <Button variant="outline" onClick={handleExport}>
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Import Data
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Restore from a previously exported file
                  </p>
                </div>
                <label>
                  <Button variant="outline" asChild>
                    <span>Import</span>
                  </Button>
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <div>
                  <div className="font-medium flex items-center gap-2 text-destructive">
                    <Trash2 className="w-4 h-4" />
                    Clear All Data
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete all projects and images
                  </p>
                </div>
                <Button variant="destructive" onClick={handleClearData}>
                  Clear
                </Button>
              </div>
            </div>
          </motion.div>

          {/* About */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel rounded-xl p-6"
          >
            <h2 className="font-semibold mb-4">About</h2>
            <p className="text-sm text-muted-foreground mb-2">
              Calendar Design Maker is a tool for creating commercial calendar designs.
              Organize your images, assign them to months, and preview with realistic page-flip animations.
            </p>
            <p className="text-xs text-muted-foreground">
              Version 1.0.0 • Made with ♥
            </p>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
