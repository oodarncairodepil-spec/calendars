import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, FolderPlus, Image as ImageIcon, Search, X, Grid3X3, Upload, Link as LinkIcon, CheckSquare, Square, Eye, Tag } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ImageLightbox } from "@/components/ImageLightbox";
import { uploadImageToStorage, deleteImageFromStorage } from "@/lib/storage-upload";
import { deleteAssetFromSupabase } from "@/lib/supabase-service";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { ImageAsset } from "@/lib/types";

// Component for image with error handling
const AssetImage = ({ asset }: { asset: ImageAsset }) => {
  const [imageError, setImageError] = useState(false);
  
  // Check if blob URL is from different origin
  const isBlobUrl = asset.url.startsWith('blob:');
  const isInvalidBlob = isBlobUrl && !asset.url.includes(window.location.origin);
  
  if (isInvalidBlob || imageError) {
    return (
      <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-4 pointer-events-none">
        <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-xs text-muted-foreground text-center">Image unavailable</p>
        <p className="text-[10px] text-muted-foreground/70 text-center mt-1">
          {isInvalidBlob ? 'Blob URL expired' : 'Failed to load'}
        </p>
      </div>
    );
  }
  
  return (
    <img
      src={asset.url}
      alt={asset.name}
      className="w-full h-full object-cover pointer-events-none"
      loading="lazy"
      onError={(e) => {
        setImageError(true);
        const errorTarget = e.target as HTMLImageElement;
        console.error('Failed to load image:', {
          assetId: asset.id,
          assetName: asset.name,
          url: asset.url,
        });
      }}
      onLoad={() => {
        setImageError(false);
      }}
    />
  );
};

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
    getGroupById,
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
    let matchesGroup = true;
    if (filterGroup === 'unassigned') {
      // Show only images with no groups
      matchesGroup = !asset.groupIds || asset.groupIds.length === 0;
    } else if (filterGroup) {
      // Show only images in the selected group
      matchesGroup = asset.groupIds && asset.groupIds.includes(filterGroup);
    }
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
          let finalUrl: string | null = null;
          try {
            finalUrl = await uploadImageToStorage(file, assetId);
            // Clean up blob URL if upload succeeds
            URL.revokeObjectURL(tempUrl);
          } catch (uploadError) {
            console.error('Failed to upload to Supabase Storage:', uploadError);
            URL.revokeObjectURL(tempUrl);
            toast({ 
              title: `Failed to upload ${file.name}`, 
              description: "Storage bucket not configured. Please configure Supabase Storage bucket.",
              variant: "destructive"
            });
            return; // Don't add asset if upload fails - blob URLs won't work in production
          }
          
          if (!finalUrl) {
            return; // Don't add asset without valid URL
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

  const handleAddToGroup = (groupId: string) => {
    if (selectedAssetIds.length > 0) {
      addImagesToGroup(groupId, selectedAssetIds);
      clearSelection();
      const group = groups.find(g => g.id === groupId);
      toast({ 
        title: "Images added to group",
        description: `${selectedAssetIds.length} image(s) added to "${group?.name || 'group'}"`
      });
    }
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

            {groups.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={selectedAssetIds.length === 0}
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Add to Group
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {(() => {
                    // Remove duplicates by ID first, then by name (keep first occurrence)
                    const uniqueById = groups.filter((group, index, self) => 
                      index === self.findIndex(g => g.id === group.id)
                    );
                    const uniqueByName = uniqueById.filter((group, index, self) =>
                      index === self.findIndex(g => g.name === group.name)
                    );
                    return uniqueByName;
                  })().map((group) => (
                    <DropdownMenuItem
                      key={group.id}
                      onClick={() => handleAddToGroup(group.id)}
                      className="gap-2"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: group.color || "hsl(var(--primary))" }}
                      />
                      {group.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

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
            <Button
              variant={filterGroup === 'unassigned' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterGroup('unassigned')}
              className="gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              Unassigned
            </Button>
            {(() => {
              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/060299a5-b9d1-49ae-9e54-31d3e944dc91',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Library.tsx:groups:filter',message:'Groups before deduplication',data:{totalGroups:groups.length,groups:groups.map(g=>({id:g.id,name:g.name}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'F'})}).catch(()=>{});
              // #endregion
              // Remove duplicates by ID first, then by name (keep first occurrence)
              const uniqueById = groups.filter((group, index, self) => 
                index === self.findIndex(g => g.id === group.id)
              );
              const uniqueByName = uniqueById.filter((group, index, self) =>
                index === self.findIndex(g => g.name === group.name)
              );
              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/060299a5-b9d1-49ae-9e54-31d3e944dc91',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Library.tsx:groups:filter',message:'Groups after deduplication',data:{uniqueById:uniqueById.length,uniqueByName:uniqueByName.length,uniqueGroups:uniqueByName.map(g=>({id:g.id,name:g.name}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'F'})}).catch(()=>{});
              // #endregion
              return uniqueByName;
            })().map((group) => (
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
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGroup(group.id);
                      if (filterGroup === group.id) setFilterGroup(null);
                    }}
                    className="ml-1 opacity-50 hover:opacity-100 cursor-pointer inline-flex items-center"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteGroup(group.id);
                        if (filterGroup === group.id) setFilterGroup(null);
                      }
                    }}
                  >
                    <X className="w-3 h-3" />
                  </div>
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
                    // Delete from Supabase (storage + database + relationships), then from store
                    for (const assetId of selectedAssetIds) {
                      const asset = assets.find(a => a.id === assetId);
                      if (asset) {
                        try {
                          // Delete from Supabase (storage + database + relationships)
                          await deleteAssetFromSupabase(asset);
                        } catch (error) {
                          console.error('Failed to delete from Supabase:', error);
                          toast({
                            title: `Failed to delete ${asset.name}`,
                            description: error instanceof Error ? error.message : 'Unknown error',
                            variant: "destructive"
                          });
                          // Still delete from local store even if Supabase deletion fails
                        }
                        // Delete from local store
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
                    <AssetImage asset={asset} />
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent transition-opacity pointer-events-none",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    />
                    <div
                      className={cn(
                        "absolute bottom-0 left-0 right-0 p-2 transition-opacity pointer-events-none",
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
                    {/* Checkbox overlay - Always visible when selected, hover-visible when not */}
                    <div
                      className={cn(
                        "absolute top-2 left-2 transition-opacity z-30 cursor-pointer",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssetClick(asset.id, index, e);
                      }}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded border-2 flex items-center justify-center transition-all shadow-lg",
                        isSelected
                          ? "bg-primary border-primary ring-2 ring-primary/50"
                          : "bg-background/90 border-border backdrop-blur-sm hover:bg-background"
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
                    
                    {/* Group badges - Always visible */}
                    {asset.groupIds && asset.groupIds.length > 0 && (
                      <div
                        className="absolute top-2 left-10 flex flex-wrap gap-1 max-w-[calc(100%-3rem)] z-20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {asset.groupIds.map((groupId) => {
                          const group = getGroupById(groupId);
                          if (!group) return null;
                          return (
                            <Badge
                              key={groupId}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0.5 h-auto bg-background/95 backdrop-blur-sm border border-border/50 shadow-sm"
                              style={{
                                backgroundColor: group.color 
                                  ? `${group.color}E6` 
                                  : undefined,
                                borderColor: group.color || undefined,
                                color: group.color ? '#fff' : undefined,
                              }}
                              title={group.name}
                            >
                              <Tag className="w-2.5 h-2.5 mr-0.5" />
                              <span className="truncate max-w-[60px]">{group.name}</span>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Selection indicator - More visible for broken images */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 pointer-events-none z-0 ring-2 ring-primary/30" />
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
