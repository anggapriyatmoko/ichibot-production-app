import React from "react";

export const CalendarLegend: React.FC = () => {
  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
        Keterangan
      </h3>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-100">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#dc2626]"></span>
          <span className="text-[10px] font-bold text-[#dc2626] uppercase tracking-wider">
            Libur Nasional
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#d97706]"></span>
          <span className="text-[10px] font-bold text-[#d97706] uppercase tracking-wider">
            Cuti Bersama
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#10b981]"></span>
          <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider">
            Kegiatan
          </span>
        </div>
      </div>
    </div>
  );
};
