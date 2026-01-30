"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import "@/styles/fullcalendar.css";

// Indonesian Holiday interface
interface Holiday {
  holiday_name: string;
  holiday_date: string;
  is_national_holiday: boolean;
}

// FullCalendar Event interface
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
  display: string;
  backgroundColor: string;
  textColor: string;
}

// Helper: Fix date format (2026-5-1 -> 2026-05-01)
const formatDate = (dateStr: string): string => {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  return dateStr;
};

export default function CalendarPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentTitle, setCurrentTitle] = useState("");
  const [currentView, setCurrentView] = useState("dayGridMonth");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendarRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedYearsRef = useRef<Set<number>>(new Set());

  // Fetch holidays from API
  const fetchHolidays = async (year: number): Promise<CalendarEvent[]> => {
    if (loadedYearsRef.current.has(year)) return [];

    try {
      const res = await fetch(
        `https://api-harilibur.vercel.app/api?year=${year}`,
      );
      if (!res.ok) return [];

      const data: Holiday[] = await res.json();
      loadedYearsRef.current.add(year);

      return data
        .filter((h) => h.is_national_holiday)
        .map((h, i) => ({
          id: `holiday-${year}-${i}`,
          title: h.holiday_name,
          start: formatDate(h.holiday_date),
          allDay: true,
          display: "background",
          backgroundColor: "#fee2e2",
          textColor: "#dc2626",
        }));
    } catch {
      return [];
    }
  };

  // Initialize FullCalendar
  useEffect(() => {
    const init = async () => {
      const { Calendar } = await import("@fullcalendar/core");
      const dayGridPlugin = (await import("@fullcalendar/daygrid")).default;
      const timeGridPlugin = (await import("@fullcalendar/timegrid")).default;
      const interactionPlugin = (await import("@fullcalendar/interaction"))
        .default;
      const idLocale = (await import("@fullcalendar/core/locales/id")).default;

      const currentYear = new Date().getFullYear();
      const holidays = await fetchHolidays(currentYear);

      if (!containerRef.current) return;

      const calendar = new Calendar(containerRef.current, {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: "dayGridMonth",
        locale: idLocale,
        height: "auto",
        headerToolbar: false,
        dayMaxEvents: true,
        moreLinkText: (n) => `+${n} lainnya`,
        events: holidays,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        datesSet: async (info: any) => {
          setCurrentTitle(calendar.view.title);
          setCurrentView(calendar.view.type);

          const year1 = info.start.getFullYear();
          const year2 = year1 + 1;

          for (const y of [year1, year2]) {
            if (!loadedYearsRef.current.has(y)) {
              const newHolidays = await fetchHolidays(y);
              newHolidays.forEach((h) => calendar.addEvent(h));
            }
          }
        },
        loading: setIsLoading,
      });

      calendarRef.current = calendar;
      calendar.render();
      setIsLoading(false);
    };

    init();

    return () => {
      calendarRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation handlers
  const handlePrev = () => calendarRef.current?.prev();
  const handleNext = () => calendarRef.current?.next();
  const handleToday = () => calendarRef.current?.today();
  const handleViewChange = (view: string) => {
    calendarRef.current?.changeView(view);
    setCurrentView(view);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <section className="bg-card shadow-sm border border-border rounded-2xl p-6 w-full">
        {/* Custom Toolbar */}
        {!isLoading && (
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-3">
              <div className="flex bg-muted p-1 rounded-xl">
                <button
                  onClick={handlePrev}
                  className="p-2 hover:bg-background rounded-lg transition-all text-foreground hover:shadow-sm"
                  title="Sebelumnya"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 hover:bg-background rounded-lg transition-all text-foreground hover:shadow-sm"
                  title="Berikutnya"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-muted hover:bg-background text-foreground font-semibold text-sm rounded-xl transition-all border border-transparent hover:border-border hover:shadow-sm"
              >
                Hari Ini
              </button>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-semibold text-foreground tracking-tight capitalize">
              {currentTitle}
            </h2>

            {/* View Switcher */}
            <div className="flex bg-muted p-1 rounded-xl">
              {[
                { id: "dayGridMonth", label: "Bulan" },
                { id: "timeGridWeek", label: "Minggu" },
                { id: "timeGridDay", label: "Hari" },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleViewChange(v.id)}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
                    currentView === v.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <span className="mt-4 text-sm font-semibold text-muted-foreground">
              Memuat kalender...
            </span>
          </div>
        )}

        {/* Calendar */}
        <div
          ref={containerRef}
          className="fullcalendar-container"
          style={{ display: isLoading ? "none" : "block" }}
        />

        {/* Legend */}
        {!isLoading && (
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-red-100 border border-red-300"></span>
                <span className="text-sm font-medium text-muted-foreground">
                  Hari Libur Nasional
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-primary"></span>
                <span className="text-sm font-medium text-muted-foreground">
                  Hari Ini
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
