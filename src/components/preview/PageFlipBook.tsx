import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarProject, MONTH_NAMES } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageFlipBookProps {
  project: CalendarProject;
  onClose: () => void;
}

/**
 * PageFlipBook - Realistic ebook page flip animation using CSS 3D transforms + framer-motion
 * 
 * The flip effect uses:
 * - perspective-2000 on container for 3D depth
 * - rotateY transform on pages for the flip motion
 * - preserve-3d and backface-hidden for proper 3D rendering
 * - Shadow overlay that follows the fold for realism
 */
export const PageFlipBook = ({ project, onClose }: PageFlipBookProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"forward" | "backward">("forward");
  const { getAssetById, imageFit } = useAppStore();

  const totalPages = project.months.length;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isFlipping) return;
    if (e.key === "ArrowRight" || e.key === " ") {
      if (currentPage < totalPages - 1) flip("forward");
    } else if (e.key === "ArrowLeft") {
      if (currentPage > 0) flip("backward");
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [currentPage, totalPages, isFlipping, onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const flip = (direction: "forward" | "backward") => {
    if (isFlipping) return;
    setFlipDirection(direction);
    setIsFlipping(true);
    
    setTimeout(() => {
      setCurrentPage((prev) => direction === "forward" ? prev + 1 : prev - 1);
      setIsFlipping(false);
    }, 600);
  };

  const renderPage = (pageIndex: number) => {
    const page = project.months[pageIndex];
    if (!page) return null;

    const assignedImage = page.assignedImageId ? getAssetById(page.assignedImageId) : null;
    const { imageFrame, calendarGridFrame } = page.layout;
    const transform = page.imageTransform;

    const getMonthName = () => {
      if (page.month === "cover") return project.title;
      return MONTH_NAMES[(page.month as number) - 1];
    };

    return (
      <div className="w-full h-full bg-card relative overflow-hidden">
        {/* Image Frame */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${imageFrame.x * 100}%`,
            top: `${imageFrame.y * 100}%`,
            width: `${imageFrame.w * 100}%`,
            height: `${imageFrame.h * 100}%`,
          }}
        >
          {assignedImage ? (
            <img
              src={assignedImage.url}
              alt=""
              className="w-full h-full"
              style={{
                objectFit: imageFit === "stretch" ? "fill" : imageFit,
                transform: `translate(${transform.x * 100}%, ${transform.y * 100}%) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
              }}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No image</span>
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        {page.showGrid && (
          <div
            className="absolute bg-card"
            style={{
              left: `${calendarGridFrame.x * 100}%`,
              top: `${calendarGridFrame.y * 100}%`,
              width: `${calendarGridFrame.w * 100}%`,
              height: `${calendarGridFrame.h * 100}%`,
            }}
          >
            <div className="w-full h-full p-3">
              <div className="text-center mb-2">
                <span className="font-display font-bold text-lg">{getMonthName()}</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-xs text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="font-medium text-muted-foreground">{d}</div>
                ))}
                {Array.from({ length: 35 }, (_, i) => (
                  <div key={i} className="py-1">{i < 31 ? i + 1 : ""}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 text-background hover:bg-background/20"
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Navigation */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => flip("backward")}
        disabled={currentPage === 0 || isFlipping}
        className="absolute left-4 text-background hover:bg-background/20 disabled:opacity-30"
      >
        <ChevronLeft className="w-8 h-8" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => flip("forward")}
        disabled={currentPage >= totalPages - 1 || isFlipping}
        className="absolute right-4 text-background hover:bg-background/20 disabled:opacity-30"
      >
        <ChevronRight className="w-8 h-8" />
      </Button>

      {/* Book Container */}
      <div className="perspective-2000 w-full max-w-2xl px-8">
        <div
          className="relative mx-auto shadow-heavy rounded-sm overflow-hidden"
          style={{
            aspectRatio: `${project.orientation === "portrait" ? project.format.width : project.format.height} / ${project.orientation === "portrait" ? project.format.height : project.format.width}`,
            maxHeight: "80vh",
          }}
        >
          {/* Current Page */}
          <motion.div
            key={currentPage}
            initial={{ rotateY: flipDirection === "forward" ? 0 : -180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 preserve-3d backface-hidden origin-left"
            style={{ transformOrigin: "left center" }}
          >
            {renderPage(currentPage)}
            
            {/* Page shadow during flip */}
            <AnimatePresence>
              {isFlipping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 page-flip-shadow pointer-events-none"
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Page Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {project.months.map((_, i) => (
          <button
            key={i}
            onClick={() => !isFlipping && setCurrentPage(i)}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              i === currentPage ? "bg-background" : "bg-background/30 hover:bg-background/50"
            )}
          />
        ))}
      </div>
    </motion.div>
  );
};
