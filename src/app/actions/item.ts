"use server";

import { apiClient } from "@/lib/api-client";
import { revalidatePath } from "next/cache";

export interface Item {
    id: number;
    requester_name: string;
    division: string;
    request_date: string;
    item_name: string;
    quantity: number;
    link: string | null;
    status_order: "Belum Diorder" | "Sudah Diorder";
    created_at: string;
    updated_at: string;
}

export interface ItemFormData {
    requester_name: string;
    division: string;
    request_date: string;
    items: {
        name: string;
        quantity: number;
        link?: string | null;
    }[];
}

export interface ItemListResponse {
    success: boolean;
    message: string;
    data?: {
        items: Item[];
        pagination: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
        };
    };
    error?: string;
}

export async function getItems(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
}): Promise<ItemListResponse> {
    try {
        const query = new URLSearchParams();
        if (params?.page) query.append("page", params.page.toString());
        if (params?.per_page) query.append("per_page", params.per_page.toString());
        if (params?.search) query.append("search", params.search);
        if (params?.status) query.append("status", params.status);

        const response = await apiClient.get<any>(`/items?${query.toString()}`);

        if (response.success && response.data) {
            return {
                success: true,
                message: "Berhasil",
                data: {
                    items: response.data.data || [],
                    pagination: response.data.meta || {
                        current_page: 1,
                        last_page: 1,
                        per_page: 15,
                        total: 0,
                    },
                },
            };
        }

        return {
            success: false,
            message: response.error || "Gagal mengambil data",
        };
    } catch (error) {
        console.error("Error getting items:", error);
        return { success: false, message: "Terjadi kesalahan" };
    }
}

export async function createItem(data: ItemFormData) {
    try {
        const response = await apiClient.post<any>("/items", data);
        if (response.success) {
            revalidatePath("/administrasi/permintaan-barang");
        }
        return response;
    } catch (error) {
        console.error("Error creating item:", error);
        throw error;
    }
}

export async function updateItem(id: number, data: Partial<Item>) {
    try {
        const response = await apiClient.put<any>(`/items/${id}`, data);
        if (response.success) {
            revalidatePath("/administrasi/permintaan-barang");
        }
        return response;
    } catch (error) {
        console.error("Error updating item:", error);
        throw error;
    }
}

export async function deleteItem(id: number) {
    try {
        const response = await apiClient.delete<any>(`/items/${id}`);
        if (response.success) {
            revalidatePath("/administrasi/permintaan-barang");
        }
        return response;
    } catch (error) {
        console.error("Error deleting item:", error);
        throw error;
    }
}

export async function reorderItem(id: number, quantity?: number) {
    try {
        const response = await apiClient.post<any>(`/items/${id}/reorder`, { quantity });
        if (response.success) {
            revalidatePath("/administrasi/permintaan-barang");
        }
        return response;
    } catch (error) {
        console.error("Error reordering item:", error);
        throw error;
    }
}

export async function getItemStats() {
    try {
        const response = await apiClient.get<any>("/items/stats");
        return response.data;
    } catch (error) {
        console.error("Error getting item stats:", error);
        return null;
    }
}

export async function markAsDone(id: number, quantityOrdered: number) {
    try {
        const response = await apiClient.post<any>(`/items/${id}/mark-done`, {
            quantity_ordered: quantityOrdered,
        });
        if (response.success) {
            revalidatePath("/administrasi/permintaan-barang");
        }
        return response;
    } catch (error) {
        console.error("Error marking item as done:", error);
        throw error;
    }
}

export async function markAsUndone(id: number) {
    try {
        const response = await apiClient.post<any>(`/items/${id}/mark-undone`);
        if (response.success) {
            revalidatePath("/administrasi/permintaan-barang");
        }
        return response;
    } catch (error) {
        console.error("Error marking item as undone:", error);
        throw error;
    }
}

