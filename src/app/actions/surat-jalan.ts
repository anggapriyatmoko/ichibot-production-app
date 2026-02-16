'use server'

import { apiClient } from '@/lib/api-client';

export interface SuratJalanItem {
    item_name: string;
    qty: number;
    unit: string;
    notes: string;
}

export interface SuratJalan {
    id: number;
    sj_number: string;
    sj_date: string;
    name: string;
    phone: string;
    address: string;
    expedition: string;
    notes: string;
    items: SuratJalanItem[];
    access_token: string;
    pdf_urls?: {
        download: string;
        secure_download: string;
        preview: string;
        secure_preview: string;
    };
    created_at: string;
    updated_at: string;
}

export interface SuratJalanFormData {
    sj_date: string;
    name: string;
    phone?: string;
    address: string;
    expedition?: string;
    notes?: string;
    items: SuratJalanItem[];
}

export async function getSuratJalan(page = 1, search = "") {
    const result = await apiClient.get<any>(`/surat-jalan?page=${page}&search=${encodeURIComponent(search)}`);
    if (!result.success) throw new Error(result.error);
    return result.data;
}

export async function generateSuratJalanNumber() {
    const result = await apiClient.get<any>(`/surat-jalan/generate-number`);
    if (!result.success) throw new Error(result.error);
    return result.data.number;
}

export async function getSuratJalanStats() {
    const result = await apiClient.get<any>(`/surat-jalan/stats`);
    if (!result.success) throw new Error(result.error);
    return result.data;
}

export async function createSuratJalan(data: SuratJalanFormData) {
    const result = await apiClient.post<any>(`/surat-jalan`, data);
    return result;
}

export async function updateSuratJalan(id: number, data: SuratJalanFormData) {
    const result = await apiClient.put<any>(`/surat-jalan/${id}`, data);
    return result;
}

export async function deleteSuratJalan(id: number) {
    const result = await apiClient.delete<any>(`/surat-jalan/${id}`);
    return result;
}
