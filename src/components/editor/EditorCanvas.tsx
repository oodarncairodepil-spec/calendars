import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { CalendarProject, MONTH_NAMES } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EditorCanvasProps {
  project: CalendarProject;
  pageIndex: number;
}

export const EditorCanvas = ({ project, pageIndex }: EditorCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { getAssetById, selectedFrameType, setSelectedFrame, updatePageLayout, imageFit } = useAppStore();

  const page = project.months[pageIndex];
  if (!page) return null;

  const assignedImage = page.assignedImageId ? getAssetById(page.assignedImageId) : null;
  const { imageFrame, calendarGridFrame } = page.layout;
  const transform = page.imageTransform;

  // Calculate aspect ratio for the page
  const aspectRatio = project.orientation === "portrait"
    ? project.format.width / project.format.height
    : project.format.height / project.format.width;

  const getMonthName = () => {
    if (page.month === "cover") return project.title;
    return MONTH_NAMES[(page.month as number) - 1];
  };

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card shadow-page rounded-sm overflow-hidden"
        style={{
          aspectRatio: `${project.orientation === "portrait" ? project.format.width : project.format.height} / ${project.orientation === "portrait" ? project.format.height : project.format.width}`,
          maxHeight: "100%",
          maxWidth: "100%",
          width: "auto",
          height: "80%",
        }}
      >
        {/* Image Frame */}
        <div
          onClick={() => setSelectedFrame("image")}
          className={cn(
            "absolute overflow-hidden cursor-pointer transition-all",
            selectedFrameType === "image" ? "ring-2 ring-primary ring-offset-2" : "hover:ring-1 hover:ring-primary/50"
          )}
          style={{
            left: `${imageFrame.x * 100}%`,
            top: `${imageFrame.y * 100}%`,
            width: `${imageFrame.w * 100}%`,
            height: `${imageFrame.h * 100}%`,
          }}
        >
          {assignedImage ? (
            <div className="w-full h-full bg-muted overflow-hidden">
              <img
                src={assignedImage.url}
                alt={assignedImage.name}
                className="w-full h-full"
                style={{
                  objectFit: imageFit === "stretch" ? "fill" : imageFit,
                  transform: `translate(${transform.x * 100}%, ${transform.y * 100}%) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
                }}
                draggable={false}
              />
            </div>
          ) : (
            <div className="w-full h-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Drop image here</p>
            </div>
          )}
        </div>

        {/* Calendar Grid Frame */}
        {page.showGrid && (
          <div
            onClick={() => setSelectedFrame("grid")}
            className={cn(
              "absolute overflow-hidden cursor-pointer transition-all",
              selectedFrameType === "grid" ? "ring-2 ring-primary ring-offset-2" : "hover:ring-1 hover:ring-primary/50"
            )}
            style={{
              left: `${calendarGridFrame.x * 100}%`,
              top: `${calendarGridFrame.y * 100}%`,
              width: `${calendarGridFrame.w * 100}%`,
              height: `${calendarGridFrame.h * 100}%`,
            }}
          >
            <div className="w-full h-full bg-card p-2">
              <div className="text-center mb-1">
                <span className="font-display font-semibold text-sm">{getMonthName()}</span>
              </div>
              <div className="grid grid-cols-7 gap-px text-[6px] text-center">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-muted-foreground font-medium">{d}</div>
                ))}
                {Array.from({ length: 35 }, (_, i) => (
                  <div key={i} className="text-muted-foreground/50">{(i % 31) + 1}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
