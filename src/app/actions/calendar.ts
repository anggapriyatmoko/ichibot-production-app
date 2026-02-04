import { apiClient } from "@/lib/api-client";

export interface IchibotEvent {
    id: number;
    jenis: "cuti bersama" | "kegiatan" | "libur nasional";
    kegiatan: string;
    tanggal: string;
    waktu_mulai: string | null;
    waktu_selesai: string | null;
    detail: string | null;
    tahun: string;
    is_active: boolean;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end?: string;
    allDay: boolean;
    display?: string;
    backgroundColor: string;
    borderColor?: string;
    textColor: string;
    extendedProps?: {
        detail?: string | null;
        jenis?: "cuti bersama" | "kegiatan" | "libur nasional";
        isPublic?: boolean;
    };
    classNames?: string[];
}


export async function getCalendarEvents(start: string, end: string) {
    const result = await apiClient.get<{
        success: boolean;
        data: IchibotEvent[];
    }>(`/calendar?start=${start}&end=${end}`);
    return result;
}

export async function createCalendarEvent(data: Partial<IchibotEvent>) {
    const result = await apiClient.post<{ success: boolean; data: IchibotEvent; error?: string }>("/calendar", data);
    return result;
}

export async function updateCalendarEvent(id: number, data: Partial<IchibotEvent>) {
    const result = await apiClient.put<{ success: boolean; data: IchibotEvent; error?: string }>(`/calendar/${id}`, data);
    return result;
}

export async function deleteCalendarEvent(id: number) {
    const result = await apiClient.delete<{ success: boolean; error?: string }>(`/calendar/${id}`);
    return result;
}
