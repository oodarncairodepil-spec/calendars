import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { CalendarProject, MONTH_NAMES, DAY_NAMES_SHORT, FONT_PRESETS } from "@/lib/types";
import { cn } from "@/lib/utils";

// Helper function to get days in a month
const getDaysInMonth = (month: number, year: number = 2025): number => {
  return new Date(year, month, 0).getDate();
};

// Helper function to get first day of month (0 = Sunday, 1 = Monday, etc.)
const getFirstDayOfMonth = (month: number, year: number = 2025): number => {
  return new Date(year, month - 1, 1).getDay();
};

// Helper function to generate calendar days for a month
const generateCalendarDays = (month: number, year: number = 2025) => {
  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);
  const days: (number | null)[] = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  
  // Fill remaining cells to make 6 rows (42 cells total)
  while (days.length < 42) {
    days.push(null);
  }
  
  return days;
};

interface EditorCanvasProps {
  project: CalendarProject;
  pageIndex: number;
}

export const EditorCanvas = ({ project, pageIndex }: EditorCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { getAssetById, selectedFrameType, setSelectedFrame, updatePageLayout, imageFit } = useAppStore();

  const page = project.months[pageIndex];
  if (!page) return null;
  
  // Get font family from presets
  const selectedFont = FONT_PRESETS.find(f => f.name === (project.fontFamily || 'Inter')) || FONT_PRESETS[0];
  const fontFamily = selectedFont.family;

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

  // Get months to display based on monthsPerPage
  const getMonthsToDisplay = () => {
    if (page.month === "cover") return [];
    
    const currentMonth = page.month as number;
    const months: number[] = [currentMonth];
    
    if (project.monthsPerPage === 2) {
      // For 2 months per page, each page stores the first month of the pair
      // Page 1: month = 1 (Jan), display Jan & Feb
      // Page 2: month = 3 (Mar), display Mar & Apr
      // Page 3: month = 5 (May), display May & Jun
      // etc.
      const secondMonth = currentMonth + 1;
      if (secondMonth <= 12) {
        months.push(secondMonth);
      }
    }
    
    return months;
  };

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card shadow-page rounded-sm overflow-hidden"
        style={{
          aspectRatio: `${project.orientation === "portrait" ? project.format.width : project.format.height} / ${project.orientation === "portrait" ? project.format.height : project.format.width}`,
          maxHeight: "100%",
          maxWidth: "100%",
          width: project.orientation === "portrait" ? "auto" : "100%",
          height: project.orientation === "portrait" ? "100%" : "auto",
          fontFamily: fontFamily,
        }}
      >
        {/* Cover Page Top Text */}
        {page.month === "cover" && page.coverTextTop && (
          <div className="absolute top-0 left-0 right-0 p-4 text-center z-10 pointer-events-none">
            <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{page.coverTextTop}</p>
          </div>
        )}

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
            {page.month === "cover" ? (
              <div className="w-full h-full bg-card p-2">
                <div className="text-center mb-1">
                  <span className="font-display font-semibold text-sm">{getMonthName()}</span>
                </div>
                <div className="grid grid-cols-7 gap-px text-[6px] text-center">
                  {DAY_NAMES_SHORT.map((d, i) => (
                    <div key={i} className={cn(
                      "font-medium",
                      i === 0 ? "text-red-500" : "text-muted-foreground" // Minggu (index 0) is red
                    )}>{d}</div>
                  ))}
                  {Array.from({ length: 35 }, (_, i) => {
                    // For cover page, show sample calendar
                    // First row starts with Sunday (index 0)
                    const dayOfWeek = i % 7;
                    const isSunday = dayOfWeek === 0;
                    return (
                      <div key={i} className={cn(
                        isSunday ? "text-red-500" : "text-muted-foreground/50"
                      )}>{i < 31 ? i + 1 : ""}</div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={cn(
                "w-full h-full bg-card p-2",
                project.monthsPerPage === 2 ? "flex gap-2" : ""
              )}>
                {getMonthsToDisplay().map((monthNum, idx) => {
                  const days = generateCalendarDays(monthNum);
                  const monthName = MONTH_NAMES[monthNum - 1];
                  const firstDay = getFirstDayOfMonth(monthNum);
                  
                  return (
                    <div key={monthNum} className={cn(
                      "flex-1",
                      project.monthsPerPage === 2 && idx === 0 ? "border-r border-border pr-1" : "",
                      project.monthsPerPage === 2 && idx === 1 ? "pl-1" : ""
                    )}>
                      <div className="text-center mb-1">
                        <span className="font-display font-semibold text-sm">{monthName}</span>
                      </div>
                      <div className="grid grid-cols-7 gap-px text-[6px] text-center">
                        {DAY_NAMES_SHORT.map((d, i) => (
                          <div key={i} className={cn(
                            "font-medium",
                            i === 0 ? "text-red-500" : "text-muted-foreground" // Minggu (index 0) is red
                          )}>{d}</div>
                        ))}
                        {days.map((day, i) => {
                          // Calculate the actual day of week (0 = Sunday, 6 = Saturday)
                          // firstDay is the day of week for the 1st of the month
                          // For each day, calculate: (firstDay + day - 1) % 7
                          const dayOfWeek = day !== null ? (firstDay + day - 1) % 7 : -1;
                          const isSunday = dayOfWeek === 0;
                          return (
                            <div key={i} className={cn(
                              day === null && "opacity-0",
                              day !== null && isSunday ? "text-red-500" : "text-muted-foreground/50"
                            )}>
                              {day}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Cover Page Bottom Text */}
        {page.month === "cover" && page.coverTextBottom && (
          <div className="absolute bottom-0 left-0 right-0 p-4 text-center z-10 pointer-events-none">
            <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{page.coverTextBottom}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
