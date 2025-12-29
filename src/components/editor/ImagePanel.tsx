import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Image as ImageIcon } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MONTH_NAMES, ImageAsset } from "@/lib/types";

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

export const ImagePanel = () => {
  const { assets, groups, activePageIndex, assignImageToPage, getActivePage, getActiveProject, updateProject } = useAppStore();
  const [groupSearch, setGroupSearch] = useState("");
  const [imageSearch, setImageSearch] = useState("");

  const page = getActivePage();
  const project = getActiveProject();
  
  // Get selected group from project settings, or null if not set
  const selectedGroupId = project?.selectedGroupId || null;
  
  // Filter groups based on search
  const filteredGroups = groupSearch.trim()
    ? groups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
    : [];
  
  // Only show images if a group is selected - STRICT filtering by group
  const filteredAssets = selectedGroupId 
    ? assets.filter((a) => {
        // Ensure groupIds exists and is an array
        const assetGroupIds = Array.isArray(a.groupIds) ? a.groupIds : [];
        // Must be in the selected group
        const matchesGroup = assetGroupIds.includes(selectedGroupId);
        // And match search if provided
        const matchesSearch = imageSearch.trim() === "" || a.name.toLowerCase().includes(imageSearch.toLowerCase());
        return matchesGroup && matchesSearch;
      })
    : [];
  
  const handleSelectGroup = (groupId: string | null) => {
    if (project) {
      updateProject(project.id, { selectedGroupId: groupId });
    }
  };

  const handleAssign = (imageId: string) => {
    assignImageToPage(activePageIndex, imageId);
  };

  // Get pages that use this image
  const getPagesForImage = (imageId: string) => {
    if (!project) return [];
    const pages: Array<{ index: number; label: string }> = [];
    project.months.forEach((p, index) => {
      if (p.assignedImageId === imageId) {
        const label = p.month === "cover" ? "Cover" : `Page ${index}`;
        pages.push({ index, label });
      }
    });
    return pages;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-3">
        {/* Group Search */}
        <div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
              placeholder="Search group name..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
          {groupSearch.trim() && filteredGroups.length > 0 && (
            <div className="mt-2 flex gap-1 flex-wrap">
              {filteredGroups.map((g) => (
            <button
              key={g.id}
                  onClick={() => {
                    handleSelectGroup(g.id);
                    setGroupSearch("");
                  }}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded transition-colors",
                    selectedGroupId === g.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary hover:bg-secondary/80"
                  )}
            >
              {g.name}
            </button>
          ))}
        </div>
          )}
          {groupSearch.trim() && filteredGroups.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">No groups found</p>
          )}
        </div>
        
        {/* Selected Group Display */}
        {selectedGroupId && (
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">
                {groups.find(g => g.id === selectedGroupId)?.name || "Selected Group"}
              </span>
            </div>
            <button
              onClick={() => handleSelectGroup(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}
        
        {/* Image Search - only show if group is selected */}
        {selectedGroupId && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={imageSearch}
              onChange={(e) => setImageSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {!selectedGroupId ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium mb-1">Search for a group</p>
            <p className="text-xs">Type a group name in the search box above to view images</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No images in this group</p>
            {imageSearch.trim() && <p className="text-xs mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredAssets.map((asset) => {
              const assignedPages = getPagesForImage(asset.id);
              const isAssignedToCurrentPage = page?.assignedImageId === asset.id;
              
              return (
              <motion.div
                key={asset.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAssign(asset.id)}
                className={cn(
                    "aspect-square rounded overflow-hidden cursor-pointer border-2 transition-colors relative",
                    isAssignedToCurrentPage ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-primary/50"
                )}
              >
                  <AssetImage asset={asset} />
                  
                  {/* Page assignment labels */}
                  {assignedPages.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
                      <div className="flex flex-wrap gap-1">
                        {assignedPages.map((pageInfo) => (
                          <Badge
                            key={pageInfo.index}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0.5 h-auto bg-background/90 text-foreground border border-primary/30"
                          >
                            {pageInfo.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Current page indicator */}
                  {isAssignedToCurrentPage && (
                    <div className="absolute top-1 right-1">
                      <Badge className="text-[10px] px-1.5 py-0.5 h-auto bg-primary text-primary-foreground">
                        Current
                      </Badge>
                    </div>
                  )}
              </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
