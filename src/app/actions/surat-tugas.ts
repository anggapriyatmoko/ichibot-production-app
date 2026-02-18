'use server'

import { apiClient } from '@/lib/api-client';

export interface SuratTugasPeserta {
    id?: number;
    nama: string;
    jabatan: string;
}

export interface SuratTugas {
    id: number;
    instansi: string;
    letter_no: string;
    title: string;
    details: string;
    signer_name: string;
    signer_title: string;
    company_name: string;
    company_address: string;
    issue_place: string;
    issue_date: string;
    start_date: string;
    end_date: string;
    status: "draft" | "issued" | "cancelled";
    peserta?: SuratTugasPeserta[];
    pdf_urls?: {
        download: string;
        download_ichibot: string;
        secure_download: string;
        secure_download_ichibot: string;
        secure_qr_download: string;
        secure_qr_download_ichibot: string;
        preview: string;
        secure_preview: string;
    };
    created_at: string;
    updated_at: string;
    secure_token: string;
}

export interface SuratTugasFormData {
    instansi: string;
    letter_no: string;
    title: string;
    details: string;
    signer_name: string;
    signer_title: string;
    company_name: string;
    company_address: string;
    issue_place: string;
    issue_date: string;
    start_date: string;
    end_date: string;
    status?: string;
    peserta: SuratTugasPeserta[];
}

export async function getSuratTugas(page = 1, search = "") {
    const result = await apiClient.get<any>(`/surat-tugas?page=${page}&search=${encodeURIComponent(search)}`);
    if (!result.success) throw new Error(result.error);
    return result.data;
}

export async function generateSuratTugasNumber(instansi: string, date?: string) {
    let url = `/surat-tugas/generate-number?instansi=${instansi}`;
    if (date) url += `&date=${date}`;
    const result = await apiClient.get<any>(url);
    if (!result.success) throw new Error(result.error);
    return result.data.number;
}

export async function getSuratTugasStats() {
    const result = await apiClient.get<any>(`/surat-tugas/stats`);
    if (!result.success) throw new Error(result.error);
    return result.data;
}

export async function createSuratTugas(data: SuratTugasFormData) {
    const result = await apiClient.post<any>(`/surat-tugas`, data);
    return result;
}

export async function updateSuratTugas(id: number, data: SuratTugasFormData) {
    const result = await apiClient.put<any>(`/surat-tugas/${id}`, data);
    return result;
}

export async function deleteSuratTugas(id: number) {
    const result = await apiClient.delete<any>(`/surat-tugas/${id}`);
    return result;
}
