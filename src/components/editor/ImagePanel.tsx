import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Image as ImageIcon } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const ImagePanel = () => {
  const { assets, groups, activePageIndex, assignImageToPage, getActivePage } = useAppStore();
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string | null>(null);

  const page = getActivePage();
  const filteredAssets = assets.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = !filterGroup || a.groupIds.includes(filterGroup);
    return matchesSearch && matchesGroup;
  });

  const handleAssign = (imageId: string) => {
    assignImageToPage(activePageIndex, imageId);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1 mt-2 flex-wrap">
          <button
            onClick={() => setFilterGroup(null)}
            className={cn("px-2 py-0.5 text-xs rounded", !filterGroup ? "bg-primary text-primary-foreground" : "bg-secondary")}
          >
            All
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setFilterGroup(g.id)}
              className={cn("px-2 py-0.5 text-xs rounded", filterGroup === g.id ? "bg-primary text-primary-foreground" : "bg-secondary")}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No images</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredAssets.map((asset) => (
              <motion.div
                key={asset.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAssign(asset.id)}
                className={cn(
                  "aspect-square rounded overflow-hidden cursor-pointer border-2 transition-colors",
                  page?.assignedImageId === asset.id ? "border-primary" : "border-transparent hover:border-primary/50"
                )}
              >
                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" loading="lazy" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
