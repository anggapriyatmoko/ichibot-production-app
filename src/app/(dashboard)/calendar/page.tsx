"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useAlert } from "@/hooks/use-alert";
import { useConfirmation } from "@/components/providers/modal-provider";
import "@/styles/fullcalendar.css";

// Shared Actions, Types & Components
import {
  IchibotEvent,
  CalendarEvent,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/app/actions/calendar";
import { CalendarLegend } from "@/components/calendar/CalendarLegend";
import { CalendarModal } from "@/components/calendar/CalendarModal";
import { EventViewModal } from "@/components/calendar/EventViewModal";

// Extended Props Type
interface EventExtendedProps {
  detail?: string | null;
  jenis?: "cuti bersama" | "kegiatan" | "libur nasional";
}

// Roles that can perform CRUD operations
const CRUD_ROLES = ["ADMIN", "HRD"];

export default function CalendarPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [currentTitle, setCurrentTitle] = useState("");
  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [currentEvents, setCurrentEvents] = useState<IchibotEvent[]>([]);

  // Check if user can perform CRUD operations
  const canEdit = CRUD_ROLES.includes(session?.user?.role || "");
  const canEditRef = useRef(canEdit);

  // Keep ref in sync with canEdit
  useEffect(() => {
    canEditRef.current = canEdit;
  }, [canEdit]);

  // CRUD States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState<Partial<IchibotEvent>>({
    kegiatan: "",
    jenis: "kegiatan",
    tanggal: "",
    waktu_mulai: "",
    waktu_selesai: "",
    detail: "",
  });

  // View-only modal for non-admin users
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewEventData, setViewEventData] =
    useState<Partial<IchibotEvent> | null>(null);

  // Jump to date state
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const { showAlert } = useAlert();
  const { showConfirmation } = useConfirmation();

  // Refs for dropdown containers
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside month dropdown
      if (
        monthDropdownRef.current &&
        !monthDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMonthDropdownOpen(false);
      }
      // Check if click is outside year dropdown
      if (
        yearDropdownRef.current &&
        !yearDropdownRef.current.contains(event.target as Node)
      ) {
        setIsYearDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendarRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dateRangeRef = useRef({ start: "", end: "" });

  // Fetch all calendar data and process for FullCalendar
  const fetchAndProcessEvents = async (
    start: string,
    end: string,
    calendar: {
      getEvents: () => {
        id: string;
        startStr: string;
        title: string;
        extendedProps: EventExtendedProps;
        remove: () => void;
      }[];
      addEvent: (evt: CalendarEvent) => void;
    },
  ) => {
    try {
      // Fetch Ichibot Events from API
      const ichibotRes = await getCalendarEvents(start, end);

      const ichibotRaw =
        ichibotRes.success && ichibotRes.data?.success
          ? ichibotRes.data.data
          : [];

      setCurrentEvents(ichibotRaw);

      // Group events by date for background colors
      type GroupEvent = IchibotEvent;
      const eventsByDate: Record<
        string,
        { events: GroupEvent[]; priorityType: string }
      > = {};

      const addToGroup = (date: string, event: GroupEvent, type: string) => {
        const normalizedDate = date.split("T")[0];
        if (!eventsByDate[normalizedDate])
          eventsByDate[normalizedDate] = {
            events: [],
            priorityType: "kegiatan",
          };
        eventsByDate[normalizedDate].events.push(event);

        const currentPriority = eventsByDate[normalizedDate].priorityType;
        if (type === "libur nasional")
          eventsByDate[normalizedDate].priorityType = "libur nasional";
        else if (
          type === "cuti bersama" &&
          currentPriority !== "libur nasional"
        )
          eventsByDate[normalizedDate].priorityType = "cuti bersama";
      };

      // Process Ichibot events
      const seenIchibot = new Set();
      ichibotRaw.forEach((e: IchibotEvent) => {
        const key = `${e.id}-${e.tanggal}`;
        if (!seenIchibot.has(key)) {
          addToGroup(e.tanggal, e, e.jenis);
          seenIchibot.add(key);
        }
      });

      // Create final events list
      const finalEvents: CalendarEvent[] = [];
      const colorMap: Record<string, string> = {
        kegiatan: "#10b981",
        "cuti bersama": "#d97706",
        "libur nasional": "#dc2626",
      };
      const bgMap: Record<string, string> = {
        kegiatan: "#10b981",
        "cuti bersama": "#f59e0b",
        "libur nasional": "#ef4444",
      };

      Object.entries(eventsByDate).forEach(([date, group]) => {
        // Background event for date coloring
        finalEvents.push({
          id: `bg-${date}`,
          title: "",
          start: date,
          allDay: true,
          display: "background",
          backgroundColor: bgMap[group.priorityType] || "transparent",
          textColor: "transparent",
          classNames: [group.priorityType.replace(/\s+/g, "-")],
        });

        // Individual events
        group.events.forEach((e) => {
          const hasTime = !!e.waktu_mulai;
          const isKegiatan = e.jenis === "kegiatan";

          // Determine display mode:
          // - Timed kegiatan events: show as time blocks in week/day views
          // - All-day events: show as list items or blocks
          let displayMode: string;
          let eventBgColor = "transparent";
          let eventTextColor = colorMap[e.jenis] || "#000000";

          if (hasTime && isKegiatan) {
            // Timed kegiatan: show as colored time block
            displayMode = "auto";
            eventBgColor = "rgba(16, 185, 129, 0.15)"; // Soft green background
            eventTextColor = "#059669"; // Dark green text
          } else if (isKegiatan) {
            // All-day kegiatan: show as list item (dot + text)
            displayMode = "list-item";
          } else {
            // Libur/Cuti: show as block
            displayMode = "block";
          }

          finalEvents.push({
            id: `ichibot-${e.id}`,
            title: e.kegiatan,
            start: hasTime ? `${e.tanggal}T${e.waktu_mulai}` : e.tanggal,
            end: e.waktu_selesai
              ? `${e.tanggal}T${e.waktu_selesai}`
              : undefined,
            allDay: !hasTime,
            display: displayMode,
            backgroundColor: eventBgColor,
            borderColor:
              hasTime && isKegiatan ? "rgba(16, 185, 129, 0.5)" : "transparent",
            textColor: eventTextColor,
            extendedProps: { detail: e.detail, jenis: e.jenis },
            classNames: [
              `event-${e.jenis.replace(/\s+/g, "-")}`,
              hasTime ? "timed-event" : "",
            ],
          });
        });
      });

      // Clear old events and add new ones
      calendar.getEvents().forEach((e) => e.remove());
      finalEvents.forEach((evt) => calendar.addEvent(evt));
    } catch (error) {
      console.error("Error processing events:", error);
    }
  };

  const handleRefresh = async () => {
    if (calendarRef.current && dateRangeRef.current.start) {
      await fetchAndProcessEvents(
        dateRangeRef.current.start,
        dateRangeRef.current.end,
        calendarRef.current,
      );
    }
  };

  const handleDateClick = (arg: { dateStr: string }) => {
    if (!canEditRef.current) return; // Only allow CRUD for authorized roles
    setFormData({
      kegiatan: "",
      jenis: "kegiatan",
      tanggal: arg.dateStr,
      waktu_mulai: "",
      waktu_selesai: "",
      detail: "",
    });
    setIsEdit(false);
    setIsModalOpen(true);
  };

  const handleEventClick = (arg: {
    event: {
      id: string;
      title: string;
      extendedProps: EventExtendedProps;
      start: Date | null;
      end: Date | null;
      allDay: boolean;
      startStr: string;
    };
  }) => {
    const event = arg.event;
    if (event.id.startsWith("bg-")) return;

    const props = event.extendedProps;
    const start = event.start;
    const end = event.end;

    const eventData: Partial<IchibotEvent> = {
      id: parseInt(event.id.replace("ichibot-", "")),
      kegiatan: event.title,
      jenis: props.jenis,
      tanggal: event.startStr.split("T")[0],
      waktu_mulai:
        start && !event.allDay ? start.toTimeString().slice(0, 5) : "",
      waktu_selesai: end && !event.allDay ? end.toTimeString().slice(0, 5) : "",
      detail: props.detail || "",
    };

    // Check if user can edit
    if (canEditRef.current) {
      // Admin/HRD: Show edit modal
      setFormData(eventData);
      setIsEdit(true);
      setIsModalOpen(true);
    } else {
      // Regular user: Show view-only modal
      setViewEventData(eventData);
      setIsViewModalOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;

    showConfirmation({
      title: "Hapus Agenda",
      message: "Apakah Anda yakin ingin menghapus agenda ini?",
      type: "confirm",
      action: async () => {
        setIsSubmitting(true);
        try {
          const res = await deleteCalendarEvent(formData.id!);
          if (res.success) {
            setIsModalOpen(false);
            await handleRefresh();
          } else {
            showAlert(res.error || "Gagal menghapus agenda");
          }
        } catch {
          showAlert("Terjadi kesalahan saat menghapus");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        tahun: formData.tanggal?.split("-")[0],
        is_active: true,
      };

      const res = isEdit
        ? await updateCalendarEvent(formData.id!, payload)
        : await createCalendarEvent(payload);

      if (res.success) {
        setIsModalOpen(false);
        await handleRefresh();
      } else {
        showAlert(res.error || "Gagal menyimpan agenda");
      }
    } catch {
      showAlert("Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSubmitting(false);
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

      if (!containerRef.current) return;

      const calendar = new Calendar(containerRef.current, {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: "dayGridMonth",
        locale: idLocale,
        height: "auto",
        headerToolbar: false,
        dayMaxEvents: 3,
        moreLinkText: (n: number) => `+${n} lainnya`,
        events: [],
        datesSet: async (info: { startStr: string; endStr: string; view: any }) => {
          setCurrentTitle(calendar.view.title);
          setCurrentView(calendar.view.type);

          // Update dropdown states to match the current view's centered date
          const currentViewDate = calendar.view.currentStart;
          setSelectedMonth(currentViewDate.getMonth());
          setSelectedYear(currentViewDate.getFullYear());

          const startStr = info.startStr.split("T")[0];
          const endStr = info.endStr.split("T")[0];
          dateRangeRef.current = { start: startStr, end: endStr };

          await fetchAndProcessEvents(startStr, endStr, calendar);
        },
        dateClick: handleDateClick,
        eventClick: handleEventClick,
        loading: (loading: boolean) => setIsLoading(loading),
      });

      calendarRef.current = calendar;
      calendar.render();
      setIsLoading(false);
    };

    init();

    return () => {
      calendarRef.current?.destroy();
    };
  }, []);

  // Navigation handlers
  const handlePrev = () => calendarRef.current?.prev();
  const handleNext = () => calendarRef.current?.next();
  const handleToday = () => calendarRef.current?.today();
  const handleViewChange = (view: string) => {
    calendarRef.current?.changeView(view);
    setCurrentView(view);
  };

  // Jump to selected month/year
  const handleJumpToDate = () => {
    if (calendarRef.current) {
      calendarRef.current.gotoDate(new Date(selectedYear, selectedMonth, 1));
      setIsMonthDropdownOpen(false);
      setIsYearDropdownOpen(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto w-full">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Column: Calendar */}
        <section className="bg-card shadow-sm border border-border rounded-2xl p-6 flex-1 min-w-0">
          {/* Custom Toolbar */}
          {!isLoading && (
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              {/* Left Box: Nav & Create */}
              <div className="flex items-center gap-4">
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

                {/* Only show add button for authorized roles */}
                {canEdit && (
                  <>
                    <div className="h-8 w-px bg-border mx-1 hidden md:block" />

                    <button
                      onClick={() => {
                        setFormData({
                          kegiatan: "",
                          jenis: "kegiatan",
                          tanggal: new Date().toISOString().split("T")[0],
                          waktu_mulai: "",
                          waktu_selesai: "",
                          detail: "",
                        });
                        setIsEdit(false);
                        setIsModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:opacity-90 transition-all shadow-sm active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Agenda
                    </button>
                  </>
                )}
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
                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${currentView === v.id
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

          {/* Jump to Date Section */}
          {!isLoading && (
            <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-border relative z-20">
              {/* Month Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Bulan:
                </span>
                <div className="relative" ref={monthDropdownRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsMonthDropdownOpen(!isMonthDropdownOpen);
                      setIsYearDropdownOpen(false);
                    }}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 min-w-40 bg-background border border-border rounded-xl text-sm font-semibold text-foreground hover:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    <span>{monthNames[selectedMonth]}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform ${isMonthDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isMonthDropdownOpen && (
                    <div
                      className="absolute top-full left-0 mt-2 w-40 bg-card border border-border rounded-xl shadow-lg z-[100] max-h-70 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-1">
                        {monthNames.map((month, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMonth(index);
                              setIsMonthDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${selectedMonth === index
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                              }`}
                          >
                            {month}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Year Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tahun:
                </span>
                <div className="relative" ref={yearDropdownRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsYearDropdownOpen(!isYearDropdownOpen);
                      setIsMonthDropdownOpen(false);
                    }}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 min-w-30 bg-background border border-border rounded-xl text-sm font-semibold text-foreground hover:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    <span>{selectedYear}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform ${isYearDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isYearDropdownOpen && (
                    <div
                      className="absolute top-full left-0 mt-2 w-30 bg-card border border-border rounded-xl shadow-lg z-100 max-h-70 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-1">
                        {Array.from({ length: 10 }, (_, i) => 2026 + i).map(
                          (year) => (
                            <button
                              key={year}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedYear(year);
                                setIsYearDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${selectedYear === year
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted"
                                }`}
                            >
                              {year}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Jump Button */}
              <button
                onClick={handleJumpToDate}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:opacity-90 transition-all shadow-sm active:scale-95"
              >
                <ArrowRight className="w-4 h-4" />
                Loncat
              </button>
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
          {!isLoading && <CalendarLegend />}
        </section>

        {/* Right Column: Events List */}
        <section className="w-full xl:w-96 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-card shadow-sm border border-border rounded-2xl p-6 flex-1 flex flex-col max-h-[calc(100vh-8rem)]">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-2 rounded-xl">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </span>
              Agenda List
            </h3>

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="mt-4 text-sm text-muted-foreground">Memuat agenda...</span>
              </div>
            ) : currentEvents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-xl">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-foreground font-medium">Tidak ada agenda</p>
                <p className="text-sm text-muted-foreground mt-1">Belum ada kegiatan, cuti, atau libur nasional pada bulan ini.</p>
              </div>
            ) : (
              <div className="overflow-y-auto pr-2 space-y-4">
                {currentEvents
                  .sort((a, b) => {
                    // Sort by Date then Time
                    const dateA = new Date(a.tanggal + (a.waktu_mulai ? `T${a.waktu_mulai}` : 'T00:00:00')).getTime();
                    const dateB = new Date(b.tanggal + (b.waktu_mulai ? `T${b.waktu_mulai}` : 'T00:00:00')).getTime();
                    return dateA - dateB;
                  })
                  .map((event) => {
                    let colorProps = "";

                    if (event.jenis === "kegiatan") {
                      colorProps = "text-emerald-600 dark:text-emerald-400";
                    } else if (event.jenis === "cuti bersama") {
                      colorProps = "text-amber-600 dark:text-amber-400";
                    } else if (event.jenis === "libur nasional") {
                      colorProps = "text-red-600 dark:text-red-400";
                    }

                    // Format date neatly
                    const eventDate = new Date(event.tanggal);
                    const formattedDate = eventDate.toLocaleDateString("id-ID", {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    });

                    const eventDay = eventDate.getDate();

                    return (
                      <div
                        key={event.id}
                        className="py-2.5 flex items-start gap-3 border-b border-border/50 last:border-0"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorProps}`}>
                          <span className="text-base font-bold">{eventDay}</span>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h4 className="text-sm font-semibold text-foreground break-words leading-tight flex items-start justify-between gap-2">
                            <span>{event.kegiatan}</span>
                          </h4>
                          <div className="flex flex-col gap-0.5 mt-1 text-xs">
                            <span className="text-muted-foreground">{formattedDate}</span>
                            {event.waktu_mulai && (
                              <span className="text-muted-foreground flex items-center gap-1 mt-0.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {event.waktu_mulai.slice(0, 5)} {event.waktu_selesai ? `- ${event.waktu_selesai.slice(0, 5)}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* CRUD Modal */}
      <CalendarModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        formData={formData}
        setFormData={setFormData}
        isEdit={isEdit}
        isSubmitting={isSubmitting}
      />

      {/* View-only Modal for regular users */}
      <EventViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        event={viewEventData}
      />
    </div>
  );
}
