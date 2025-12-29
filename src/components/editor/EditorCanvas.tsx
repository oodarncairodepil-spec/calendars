import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { CalendarProject, MONTH_NAMES, MONTH_NAMES_SHORT, DAY_NAMES_SHORT, FONT_PRESETS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getHolidaysForMonth, HolidayMap } from "@/lib/holidays-service";

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
  hideEditorBorders?: boolean; // Hide selection borders for PDF export
}

export const EditorCanvas = ({ project, pageIndex, hideEditorBorders = false }: EditorCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { getAssetById, selectedFrameType, setSelectedFrame, updatePageLayout } = useAppStore();
  const [holidaysMap, setHolidaysMap] = useState<{ [month: number]: HolidayMap }>({});

  const page = project.months[pageIndex];
  if (!page) return null;
  
  // Year for holidays (default to 2026)
  const currentYear = 2026;
  
  // Get font family from presets
  const selectedFont = FONT_PRESETS.find(f => f.name === (project.fontFamily || 'Inter')) || FONT_PRESETS[0];
  const fontFamily = selectedFont.family;

  const assignedImage = page.assignedImageId ? getAssetById(page.assignedImageId) : null;
  const { imageFrame, calendarGridFrame } = page.layout;
  const transform = page.imageTransform;
  
  // Get appropriate fit mode based on page type
  const imageFit = page.month === 'cover' 
    ? (project.coverImageFit || 'cover')
    : (project.monthsImageFit || 'cover');
  
  // Get margins, default to 10mm if not set
  const margins = page.margins || { top: 10, right: 10, bottom: 10, left: 10 };
  
  // Convert margins to percentage based on page size
  // Assuming margins are in mm (same unit as format)
  const marginTopPercent = (margins.top / project.format.height) * 100;
  const marginRightPercent = (margins.right / project.format.width) * 100;
  const marginBottomPercent = (margins.bottom / project.format.height) * 100;
  const marginLeftPercent = (margins.left / project.format.width) * 100;

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

  // Load holidays for displayed months
  useEffect(() => {
    if (page.month === "cover") return;
    
    const loadHolidays = async () => {
      const months = getMonthsToDisplay();
      for (const monthNum of months) {
        if (!holidaysMap[monthNum]) {
          const holidays = await getHolidaysForMonth(currentYear, monthNum);
          setHolidaysMap(prev => ({ ...prev, [monthNum]: holidays }));
        }
      }
    };
    
    loadHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.month, project.monthsPerPage]);

      return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center">
          <motion.div
            ref={canvasRef}
            data-page-index={pageIndex}
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
        {/* Content area with margins */}
        <div
          className="absolute"
          style={{
            top: `${marginTopPercent}%`,
            right: `${marginRightPercent}%`,
            bottom: `${marginBottomPercent}%`,
            left: `${marginLeftPercent}%`,
          }}
        >
          {/* Cover Page Top Text */}
          {page.month === "cover" && page.coverTextTop && (
            <div className="absolute top-0 left-0 right-0 p-4 text-center z-10 pointer-events-none">
              <p className="text-sm font-medium text-foreground whitespace-pre-wrap" style={{ fontFamily: fontFamily }}>{page.coverTextTop}</p>
            </div>
          )}

          {/* Image Frame */}
          <div
            onClick={() => !hideEditorBorders && setSelectedFrame("image")}
            className={cn(
              "absolute overflow-hidden transition-all",
              !hideEditorBorders && "cursor-pointer",
              !hideEditorBorders && selectedFrameType === "image" && "ring-2 ring-primary ring-offset-2",
              !hideEditorBorders && selectedFrameType !== "image" && "hover:ring-1 hover:ring-primary/50"
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
              onClick={() => !hideEditorBorders && setSelectedFrame("grid")}
              className={cn(
                "absolute overflow-visible transition-all",
                !hideEditorBorders && "cursor-pointer",
                !hideEditorBorders && selectedFrameType === "grid" && "ring-2 ring-primary ring-offset-2",
                !hideEditorBorders && selectedFrameType !== "grid" && "hover:ring-1 hover:ring-primary/50"
              )}
              style={{
                left: `${calendarGridFrame.x * 100}%`,
                top: `${calendarGridFrame.y * 100}%`,
                width: `${calendarGridFrame.w * 100}%`,
                height: `${calendarGridFrame.h * 100}%`,
              }}
            >
            {page.month === "cover" ? (
              <div className="w-full h-full bg-card p-1">
                <div className="text-center mb-1">
                  <span className="font-bold text-base" style={{ fontFamily: fontFamily }}>{getMonthName()}</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-xs text-center">
                  {DAY_NAMES_SHORT.map((d, i) => (
                    <div key={i} className={cn(
                      "font-medium",
                      i === 0 ? "text-red-500" : "text-muted-foreground" // Minggu (index 0) is red
                    )} style={{ fontFamily: fontFamily }}>{d}</div>
                  ))}
                  {Array.from({ length: 35 }, (_, i) => {
                    // For cover page, show sample calendar
                    // First row starts with Sunday (index 0)
                    const dayOfWeek = i % 7;
                    const isSunday = dayOfWeek === 0;
                    return (
                      <div key={i} className={cn(
                        "py-0.5",
                        isSunday ? "text-red-500" : "text-muted-foreground/50"
                      )} style={{ fontFamily: fontFamily }}>{i < 31 ? i + 1 : ""}</div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={cn(
                "w-full h-full bg-card p-1",
                project.monthsPerPage === 2 ? "flex gap-2" : ""
              )}>
                {getMonthsToDisplay().map((monthNum, idx) => {
                  const days = generateCalendarDays(monthNum, currentYear);
                  const monthName = MONTH_NAMES[monthNum - 1];
                  const firstDay = getFirstDayOfMonth(monthNum, currentYear);
                  const monthHolidays = holidaysMap[monthNum] || {};
                  
                  // Get list of holidays for this month (deduplicate by date)
                  const monthHolidaysList = Object.values(monthHolidays).flat();
                  // Sort by date
                  monthHolidaysList.sort((a, b) => new Date(a.date).getDate() - new Date(b.date).getDate());
                  
                  // Group holidays by name, then combine consecutive dates
                  const groupedHolidays: Array<{ dates: number[]; name: string }> = [];
                  const holidayGroups = new Map<string, { dates: number[]; name: string }>();
                  
                  monthHolidaysList.forEach(holiday => {
                    const key = holiday.name;
                    if (!holidayGroups.has(key)) {
                      holidayGroups.set(key, { dates: [], name: holiday.name });
                    }
                    const day = new Date(holiday.date).getDate();
                    holidayGroups.get(key)!.dates.push(day);
                  });
                  
                  // Convert map to array and sort dates within each group
                  groupedHolidays.push(...Array.from(holidayGroups.values()));
                  groupedHolidays.forEach(group => {
                    group.dates.sort((a, b) => a - b);
                  });
                  
                  return (
                    <div key={monthNum} className={cn(
                      "flex-1",
                      project.monthsPerPage === 2 && idx === 0 ? "border-r border-border pr-2" : "",
                      project.monthsPerPage === 2 && idx === 1 ? "pl-2" : ""
                    )}>
                      <div className="text-center mb-1">
                        <span className="font-bold text-base" style={{ fontFamily: fontFamily }}>{monthName}</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-xs text-center">
                        {DAY_NAMES_SHORT.map((d, i) => (
                          <div key={i} className={cn(
                            "font-medium",
                            i === 0 ? "text-red-500" : "text-muted-foreground" // Minggu (index 0) is red
                          )} style={{ fontFamily: fontFamily }}>{d}</div>
                        ))}
                        {days.map((day, i) => {
                          // Calculate the actual day of week (0 = Sunday, 6 = Saturday)
                          // firstDay is the day of week for the 1st of the month
                          // For each day, calculate: (firstDay + day - 1) % 7
                          const dayOfWeek = day !== null ? (firstDay + day - 1) % 7 : -1;
                          const isSunday = dayOfWeek === 0;
                          
                          // Check if this date is a holiday
                          const dateKey = day !== null ? `${currentYear}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                          const isHoliday = dateKey && monthHolidays[dateKey] && monthHolidays[dateKey].length > 0;
                          
                          return (
                            <div key={i} className={cn(
                              "py-0.5",
                              day === null && "opacity-0",
                              day !== null && isHoliday ? "text-red-500 font-semibold" : day !== null && isSunday ? "text-red-500" : "text-muted-foreground/50"
                            )} style={{ fontFamily: fontFamily }}>
                              {day}
                            </div>
                          );
                        })}
                      </div>
                      {/* Holidays info below calendar */}
                      {groupedHolidays.length > 0 ? (
                          <div className="mt-1 pt-1 border-t border-border/50 overflow-visible">
                            <div className="text-[10px] leading-tight space-y-0.5 text-left" style={{ fontFamily: fontFamily }}>
                              {groupedHolidays.map((group, hIdx) => {
                                const monthNameShort = MONTH_NAMES_SHORT[monthNum - 1];
                                // Format dates: if consecutive, show range (e.g., "16-17"), otherwise show single date
                                let dateStr: string;
                                if (group.dates.length === 1) {
                                  dateStr = `${group.dates[0]} ${monthNameShort}`;
                                } else {
                                  // Check if dates are consecutive
                                  const sortedDates = [...group.dates].sort((a, b) => a - b);
                                  const isConsecutive = sortedDates.every((d, idx) => 
                                    idx === 0 || d === sortedDates[idx - 1] + 1
                                  );
                                  if (isConsecutive) {
                                    dateStr = `${sortedDates[0]}-${sortedDates[sortedDates.length - 1]} ${monthNameShort}`;
                                  } else {
                                    dateStr = sortedDates.map(d => `${d} ${monthNameShort}`).join(', ');
                                  }
                                }
                                return (
                                  <div key={hIdx} className="text-foreground/80">
                                    <span className="text-red-500 font-semibold">{dateStr}:</span> {group.name}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
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
              <p className="text-sm font-medium text-foreground whitespace-pre-wrap" style={{ fontFamily: fontFamily }}>{page.coverTextBottom}</p>
            </div>
          )}
        </div>

        {/* Signature - displayed on all pages (positioned relative to entire page) */}
        {project.signatureImageUrl && (
          <div
            className="absolute pointer-events-none z-20"
            style={{
              left: `${(project.signaturePosition?.x || 0.85) * 100}%`,
              top: `${(project.signaturePosition?.y || 0.9) * 100}%`,
              width: `${(project.signatureSize?.width || 0.12) * 100}%`,
              height: `${(project.signatureSize?.height || 0.08) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <img
              src={project.signatureImageUrl}
              alt="Signature"
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </motion.div>
    </div>
  );
};
