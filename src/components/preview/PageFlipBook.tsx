import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarProject, MONTH_NAMES, MONTH_NAMES_SHORT, DAY_NAMES_SHORT, FONT_PRESETS } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getHolidaysForMonth, HolidayMap } from "@/lib/holidays-service";

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
  const [holidaysMap, setHolidaysMap] = useState<{ [month: number]: HolidayMap }>({});
  const { getAssetById, imageFit } = useAppStore();
  
  // Year for holidays (default to 2026)
  const currentYear = 2026;

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

  // Load holidays for all months
  useEffect(() => {
    const loadAllHolidays = async () => {
      const monthsToLoad = new Set<number>();
      project.months.forEach((p) => {
        if (p.month !== 'cover') {
          monthsToLoad.add(p.month as number);
          if (project.monthsPerPage === 2 && (p.month as number) < 12) {
            monthsToLoad.add((p.month as number) + 1);
          }
        }
      });
      
      for (const monthNum of monthsToLoad) {
        if (!holidaysMap[monthNum]) {
          const holidays = await getHolidaysForMonth(currentYear, monthNum);
          setHolidaysMap(prev => ({ ...prev, [monthNum]: holidays }));
        }
      }
    };
    
    loadAllHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.months, project.monthsPerPage]);

  const renderPage = (pageIndex: number) => {
    const page = project.months[pageIndex];
    if (!page) return null;

    const assignedImage = page.assignedImageId ? getAssetById(page.assignedImageId) : null;
    const { imageFrame, calendarGridFrame } = page.layout;
    const transform = page.imageTransform;
    
    // Get margins, default to 10mm if not set
    const margins = page.margins || { top: 10, right: 10, bottom: 10, left: 10 };
    
    // Convert margins to percentage based on page size
    const marginTopPercent = (margins.top / project.format.height) * 100;
    const marginRightPercent = (margins.right / project.format.width) * 100;
    const marginBottomPercent = (margins.bottom / project.format.height) * 100;
    const marginLeftPercent = (margins.left / project.format.width) * 100;

    // Get font family from presets
    const selectedFont = FONT_PRESETS.find(f => f.name === (project.fontFamily || 'Inter')) || FONT_PRESETS[0];
    const fontFamily = selectedFont.family;

    const getMonthName = () => {
      if (page.month === "cover") return project.title;
      return MONTH_NAMES[(page.month as number) - 1];
    };

    return (
      <div 
        className="w-full h-full bg-card relative overflow-hidden"
        style={{ fontFamily: fontFamily }}
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
            <div className="absolute top-0 left-0 right-0 p-6 text-center z-10 pointer-events-none">
              <p className="text-base font-medium text-foreground whitespace-pre-wrap">{page.coverTextTop}</p>
            </div>
          )}

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
              className="absolute bg-card overflow-visible"
              style={{
                left: `${calendarGridFrame.x * 100}%`,
                top: `${calendarGridFrame.y * 100}%`,
                width: `${calendarGridFrame.w * 100}%`,
                height: `${calendarGridFrame.h * 100}%`,
              }}
            >
            {page.month === "cover" ? (
              <div className="w-full h-full p-1">
                <div className="text-center mb-1">
                  <span className="font-bold text-base" style={{ fontFamily: fontFamily }}>{getMonthName()}</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-xs text-center">
                  {DAY_NAMES_SHORT.map((d, i) => (
                    <div key={d} className={cn(
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
                          "py-0.5",
                          isSunday && "text-red-500"
                        )}>{i < 31 ? i + 1 : ""}</div>
                      );
                  })}
                </div>
              </div>
            ) : (
              <div className={cn(
                "w-full h-full p-1",
                project.monthsPerPage === 2 ? "flex gap-4" : ""
              )}>
                {(() => {
                  const currentMonth = page.month as number;
                  const months: number[] = [currentMonth];
                  if (project.monthsPerPage === 2 && currentMonth < 12) {
                    months.push(currentMonth + 1);
                  }
                  return { months, currentMonth };
                })().months.map((monthNum, index, array) => {
                  // Helper to get days in month
                  const getDaysInMonth = (month: number, year: number = 2025) => {
                    return new Date(year, month, 0).getDate();
                  };
                  const getFirstDayOfMonth = (month: number, year: number = 2025) => {
                    return new Date(year, month - 1, 1).getDay();
                  };
                  const generateCalendarDays = (month: number, year: number = 2025) => {
                    const daysInMonth = getDaysInMonth(month, year);
                    const firstDay = getFirstDayOfMonth(month, year);
                    const days: (number | null)[] = [];
                    for (let i = 0; i < firstDay; i++) {
                      days.push(null);
                    }
                    for (let day = 1; day <= daysInMonth; day++) {
                      days.push(day);
                    }
                    while (days.length < 42) {
                      days.push(null);
                    }
                    return days;
                  };
                  
                  const days = generateCalendarDays(monthNum, currentYear);
                  const monthName = MONTH_NAMES[monthNum - 1];
                  const firstDay = getFirstDayOfMonth(monthNum, currentYear);
                  const currentMonth = page.month as number;
                  const monthHolidays = holidaysMap[monthNum] || {};
                  
                  // Get list of holidays for this month (deduplicate by date)
                  const monthHolidaysList = Object.values(monthHolidays).flat();
                  // Sort by date
                  monthHolidaysList.sort((a, b) => new Date(a.date).getDate() - new Date(b.date).getDate());
                  
                  // Group holidays by name and emoji, then combine consecutive dates
                  const groupedHolidays: Array<{ dates: number[]; name: string; emoji?: string | null }> = [];
                  const holidayGroups = new Map<string, { dates: number[]; name: string; emoji?: string | null }>();
                  
                  monthHolidaysList.forEach(holiday => {
                    const key = `${holiday.name}|${holiday.emoji || ''}`;
                    if (!holidayGroups.has(key)) {
                      holidayGroups.set(key, { dates: [], name: holiday.name, emoji: holiday.emoji });
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
                      project.monthsPerPage === 2 && monthNum === currentMonth ? "border-r border-border pr-2" : "",
                      project.monthsPerPage === 2 && monthNum === currentMonth + 1 ? "pl-2" : ""
                    )}>
                      <div className="text-center mb-1">
                        <span className="font-bold text-base" style={{ fontFamily: fontFamily }}>{monthName}</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-xs text-center">
                        {DAY_NAMES_SHORT.map((d, i) => (
                          <div key={d} className={cn(
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
                          
                          // Check if this date is a holiday
                          const dateKey = day !== null ? `${currentYear}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                          const isHoliday = dateKey && monthHolidays[dateKey] && monthHolidays[dateKey].length > 0;
                          
                          return (
                            <div key={i} className={cn(
                              "py-0.5",
                              day === null && "opacity-0",
                              day !== null && isHoliday ? "text-red-500 font-semibold" : day !== null && isSunday ? "text-red-500" : "text-muted-foreground/50"
                            )}>
                              {day}
                            </div>
                          );
                        })}
                      </div>
                      {/* Holidays info below calendar */}
                      {groupedHolidays.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-border/50 overflow-visible">
                          <div className="text-[10px] leading-tight space-y-0.5 text-left">
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
                                  <span className="text-red-500 font-semibold">{dateStr}:</span> {group.name} {group.emoji && <span>{group.emoji}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

          {/* Cover Page Bottom Text */}
          {page.month === "cover" && page.coverTextBottom && (
            <div className="absolute bottom-0 left-0 right-0 p-6 text-center z-10 pointer-events-none">
              <p className="text-base font-medium text-foreground whitespace-pre-wrap">{page.coverTextBottom}</p>
            </div>
          )}
        </div>
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
