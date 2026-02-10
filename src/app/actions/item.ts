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

export interface ItemActionResponse {
    success: boolean;
    message: string;
    data?: any;
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

export async function createItem(data: ItemFormData): Promise<ItemActionResponse> {
    try {
        const response = await apiClient.post<any>("/items", data);
        if (response.success) {
            revalidatePath("/administrasi/permintaan-barang");
            return {
                success: true,
                message: "Permintaan berhasil dibuat",
                data: response.data
            };
        }
        return {
            success: false,
            message: response.error || "Gagal membuat permintaan",
            error: response.error
        };
    } catch (error) {
        console.error("Error creating item:", error);
        return {
            success: false,
            message: "Terjadi kesalahan sistem saat membuat permintaan"
        };
    }
}

export async function updateItem(id: number, data: Partial<Item>): Promise<ItemActionResponse> {
    try {
        const response = await apiClient.put<any>(`/items/${id}`, data);
        if (response.success) {
            revalidatePath("/administrasi/permintaan-barang");
            return {
                success: true,
                message: "Permintaan berhasil diperbarui",
                data: response.data
            };
        }
        return {
            success: false,
            message: response.error || "Gagal memperbarui",
            error: response.error
        };
    } catch (error) {
        console.error("Error updating item:", error);
        return {
            success: false,
            message: "Terjadi kesalahan sistem saat memperbarui"
        };
    }
}

export async function deleteItem(id: number): Promise<ItemActionResponse> {
    try {
        const response = await apiClient.delete<any>(`/items/${id}`);
        if (response.success) {
            revalidatePath("/administrasi/permintaan-barang");
            return {
                success: true,
                message: "Berhasil dihapus"
            };
        }
        return {
            success: false,
            message: response.error || "Gagal menghapus",
            error: response.error
        };
    } catch (error) {
        console.error("Error deleting item:", error);
        return {
            success: false,
            message: "Terjadi kesalahan sistem saat menghapus"
        };
    }
}

export async function reorderItem(id: number, quantity?: number): Promise<ItemActionResponse> {
    try {
        const response = await apiClient.post<any>(`/items/${id}/reorder`, { quantity });
        if (response.success) {
            revalidatePath("/administrasi/permintaan-barang");
            return {
                success: true,
                message: "Berhasil membuat order baru",
                data: response.data
            };
        }
        return {
            success: false,
            message: response.error || "Gagal membuat order baru",
            error: response.error
        };
    } catch (error) {
        console.error("Error reordering item:", error);
        return {
            success: false,
            message: "Terjadi kesalahan sistem saat membuat order baru"
        };
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

export async function markAsDone(id: number, quantityOrdered: number): Promise<ItemActionResponse> {
    try {
        const response = await apiClient.post<any>(`/items/${id}/mark-done`, {
            quantity_ordered: quantityOrdered,
        });
        if (response.success) {
            revalidatePath("/administrasi/permintaan-barang");
            return {
                success: true,
                message: "Item berhasil ditandai sudah diorder",
                data: response.data
            };
        }
        return {
            success: false,
            message: response.error || "Gagal menandai item",
            error: response.error
        };
    } catch (error) {
        console.error("Error marking item as done:", error);
        return {
            success: false,
            message: "Terjadi kesalahan sistem saat menandai item"
        };
    }
}

export async function markAsUndone(id: number): Promise<ItemActionResponse> {
    try {
        const response = await apiClient.post<any>(`/items/${id}/mark-undone`);
        if (response.success) {
            revalidatePath("/administrasi/permintaan-barang");
            return {
                success: true,
                message: "Order berhasil dibatalkan"
            };
        }
        return {
            success: false,
            message: response.error || "Gagal membatalkan order",
            error: response.error
        };
    } catch (error) {
        console.error("Error marking item as undone:", error);
        return {
            success: false,
            message: "Terjadi kesalahan sistem saat membatalkan order"
        };
    }
}

