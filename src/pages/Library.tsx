import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, FolderPlus, Image as ImageIcon, Search, X, Grid3X3, Upload, Link as LinkIcon, CheckSquare, Square, Eye } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageLightbox } from "@/components/ImageLightbox";
import { uploadImageToStorage, deleteImageFromStorage } from "@/lib/storage-upload";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

const Library = () => {
  const {
    assets,
    groups,
    selectedAssetIds,
    addAsset,
    deleteAsset,
    selectAsset,
    selectAssetRange,
    selectAllAssets,
    clearSelection,
    createGroup,
    addImagesToGroup,
    deleteGroup,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const lastSelectedIndexRef = useRef<number | null>(null);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = !filterGroup || asset.groupIds.includes(filterGroup);
    return matchesSearch && matchesGroup;
  });

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;

    try {
      // Try to load the image to get dimensions
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = urlInput;
      });

      addAsset({
        name: urlInput.split("/").pop()?.split("?")[0] || "Image",
        sourceType: "url",
        url: urlInput,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
      });

      setUrlInput("");
      setShowAddDialog(false);
      toast({ title: "Image added!" });
    } catch {
      toast({ title: "Failed to load image", variant: "destructive" });
    }
  };

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      const filesArray = Array.from(files).filter(file => file.type.startsWith("image/"));
      
      if (filesArray.length === 0) return;

      setShowAddDialog(false);
      
      // Process files sequentially to avoid overwhelming the storage
      for (const file of filesArray) {
        try {
          // Generate asset ID first
          const assetId = uuidv4();
          
          // Create temporary blob URL for preview
          const tempUrl = URL.createObjectURL(file);
          const img = new window.Image();
          
          // Wait for image to load to get dimensions
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = tempUrl;
          });

          // Upload to Supabase Storage
          let finalUrl = tempUrl; // Fallback to blob URL if upload fails
          try {
            finalUrl = await uploadImageToStorage(file, assetId);
            // Clean up blob URL if upload succeeds
            URL.revokeObjectURL(tempUrl);
          } catch (uploadError) {
            console.error('Failed to upload to Supabase Storage, using blob URL:', uploadError);
            toast({ 
              title: `Uploaded ${file.name} (local only)`, 
              description: "Storage bucket not configured. Image will be lost on refresh.",
              variant: "default"
            });
            // Keep blob URL as fallback
          }

          // Add asset to store with the same ID used for upload
          addAsset({
            name: file.name,
            sourceType: "upload",
            url: finalUrl,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
          }, assetId);
          
          toast({ title: `Added ${file.name}` });
        } catch (error) {
          console.error('Error processing file:', error);
          toast({ 
            title: `Failed to add ${file.name}`, 
            variant: "destructive" 
          });
        }
      }
    },
    [addAsset]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload]
  );

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const groupId = createGroup(newGroupName);
    if (selectedAssetIds.length > 0) {
      addImagesToGroup(groupId, selectedAssetIds);
    }
    setNewGroupName("");
    setShowGroupDialog(false);
    clearSelection();
    toast({ title: "Group created!" });
  };

  const handleAssetClick = (assetId: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.shiftKey && lastSelectedIndexRef.current !== null) {
      // Range selection
      const startIndex = Math.min(lastSelectedIndexRef.current, index);
      const endIndex = Math.max(lastSelectedIndexRef.current, index);
      const startId = filteredAssets[startIndex].id;
      const endId = filteredAssets[endIndex].id;
      const assetIds = filteredAssets.map(a => a.id);
      selectAssetRange(startId, endId, assetIds);
      lastSelectedIndexRef.current = index;
    } else if (e.metaKey || e.ctrlKey) {
      // Toggle selection
      selectAsset(assetId, true);
      lastSelectedIndexRef.current = index;
    } else {
      // Toggle selection (default behavior is now multi-select)
      selectAsset(assetId, true);
      lastSelectedIndexRef.current = index;
    }
  };

  const handleSelectAll = () => {
    if (selectedAssetIds.length === filteredAssets.length) {
      clearSelection();
    } else {
      selectAllAssets(filteredAssets.map(a => a.id));
    }
  };

  const handleOpenPreview = (assetId: string) => {
    const index = filteredAssets.findIndex(a => a.id === assetId);
    if (index !== -1) {
      setPreviewIndex(index);
    }
  };

  const handleClosePreview = () => {
    setPreviewIndex(null);
  };

  const handleNavigatePreview = (index: number) => {
    if (index >= 0 && index < filteredAssets.length) {
      setPreviewIndex(index);
    }
  };

  const allSelected = filteredAssets.length > 0 && selectedAssetIds.length === filteredAssets.length;
  const someSelected = selectedAssetIds.length > 0 && selectedAssetIds.length < filteredAssets.length;

  return (
    <Layout>
      <div
        className={cn(
          "container py-8 px-4 min-h-screen transition-colors",
          isDragging && "bg-primary/5"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-3xl font-display font-bold mb-1">Image Library</h1>
            <p className="text-muted-foreground">
              {assets.length} images • {groups.length} groups
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={selectedAssetIds.length === 0}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Group name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                  />
                  <p className="text-sm text-muted-foreground">
                    {selectedAssetIds.length} images will be added to this group
                  </p>
                  <Button onClick={handleCreateGroup} className="w-full">
                    Create Group
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Images
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Images</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* URL Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      From URL
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://example.com/image.jpg"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                      />
                      <Button onClick={handleAddUrl}>Add</Button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">or</span>
                    </div>
                  </div>

                  {/* File Upload */}
                  <label className="block">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Drop images here or click to browse
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-3 mb-6"
        >
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterGroup === null ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterGroup(null)}
            >
              All
            </Button>
            {groups.map((group) => (
              <Button
                key={group.id}
                variant={filterGroup === group.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterGroup(group.id)}
                className="gap-2"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: group.color || "hsl(var(--primary))" }}
                />
                {group.name}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteGroup(group.id);
                    if (filterGroup === group.id) setFilterGroup(null);
                  }}
                  className="ml-1 opacity-50 hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {filteredAssets.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="gap-2"
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4" />
                ) : someSelected ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
            )}
            {selectedAssetIds.length > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedAssetIds.length} selected
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    // Delete from storage first, then from store
                    for (const assetId of selectedAssetIds) {
                      const asset = assets.find(a => a.id === assetId);
                      if (asset) {
                        await deleteImageFromStorage(asset);
                        deleteAsset(assetId);
                      }
                    }
                    clearSelection();
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Image Grid */}
        {filteredAssets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-xl p-12 text-center"
          >
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No images yet</h3>
            <p className="text-muted-foreground mb-4">
              Add images from URLs or upload files to get started
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Images
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredAssets.map((asset, index) => {
                const isSelected = selectedAssetIds.includes(asset.id);
                return (
                  <motion.div
                    key={asset.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={(e) => handleAssetClick(asset.id, index, e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleOpenPreview(asset.id);
                    }}
                    className={cn(
                      "group relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    />
                    <div
                      className={cn(
                        "absolute bottom-0 left-0 right-0 p-2 transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <p className="text-xs text-primary-foreground truncate font-medium">
                        {asset.name}
                      </p>
                      <p className="text-xs text-primary-foreground/70">
                        {asset.originalWidth}×{asset.originalHeight}
                      </p>
                    </div>
                    {/* Checkbox overlay */}
                    <div
                      className={cn(
                        "absolute top-2 left-2 transition-opacity z-10",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssetClick(asset.id, index, e);
                      }}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded border-2 flex items-center justify-center transition-all",
                        isSelected
                          ? "bg-primary border-primary"
                          : "bg-background/80 border-border backdrop-blur-sm"
                      )}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    
                    {/* Preview button */}
                    <div
                      className={cn(
                        "absolute top-2 right-2 transition-opacity z-10",
                        "opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPreview(asset.id);
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Drop overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none"
            >
              <div className="bg-card rounded-xl p-8 shadow-heavy text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="text-lg font-semibold">Drop images here</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Lightbox */}
        {previewIndex !== null && (
          <ImageLightbox
            assets={filteredAssets}
            currentIndex={previewIndex}
            isOpen={previewIndex !== null}
            onClose={handleClosePreview}
            onNavigate={handleNavigatePreview}
          />
        )}
      </div>
    </Layout>
  );
};

export default Library;
