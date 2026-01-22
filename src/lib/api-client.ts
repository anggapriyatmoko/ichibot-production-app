import { getSystemSetting, getAllApiSettings } from '@/app/actions/system-settings'

interface ApiClientOptions {
    headers?: Record<string, string>
    timeout?: number
}

interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
    status?: number
}

/**
 * Reusable API Client
 * 
 * Usage:
 * ```typescript
 * import { apiClient } from '@/lib/api-client'
 * 
 * // GET request
 * const { success, data, error } = await apiClient.get('/products')
 * 
 * // POST request
 * const { success, data, error } = await apiClient.post('/orders', { items: [...] })
 * 
 * // PUT request
 * const { success, data, error } = await apiClient.put('/products/123', { name: 'Updated' })
 * 
 * // DELETE request
 * const { success, data, error } = await apiClient.delete('/products/123')
 * ```
 */
export const apiClient = {
    /**
     * GET request
     */
    async get<T = unknown>(endpoint: string, options?: ApiClientOptions): Promise<ApiResponse<T>> {
        return makeRequest<T>('GET', endpoint, undefined, options)
    },

    /**
     * POST request
     */
    async post<T = unknown>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<ApiResponse<T>> {
        return makeRequest<T>('POST', endpoint, body, options)
    },

    /**
     * PUT request
     */
    async put<T = unknown>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<ApiResponse<T>> {
        return makeRequest<T>('PUT', endpoint, body, options)
    },

    /**
     * PATCH request
     */
    async patch<T = unknown>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<ApiResponse<T>> {
        return makeRequest<T>('PATCH', endpoint, body, options)
    },

    /**
     * DELETE request
     */
    async delete<T = unknown>(endpoint: string, options?: ApiClientOptions): Promise<ApiResponse<T>> {
        return makeRequest<T>('DELETE', endpoint, undefined, options)
    },

    /**
     * Get the configured API settings
     */
    async getConfig(): Promise<{ apiEndpoint: string | null, apiKey: string | null }> {
        return getAllApiSettings()
    }
}

/**
 * Internal request handler
 */
async function makeRequest<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    options?: ApiClientOptions
): Promise<ApiResponse<T>> {
    try {
        // Get API settings from database
        const { apiEndpoint, apiKey } = await getAllApiSettings()

        if (!apiEndpoint) {
            return {
                success: false,
                error: 'API Endpoint belum dikonfigurasi. Silakan konfigurasi di Settings.'
            }
        }

        // Build full URL
        const url = endpoint.startsWith('http')
            ? endpoint
            : `${apiEndpoint.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

        // Build headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options?.headers
        }

        // Add API Key header (X-API-Key format)
        if (apiKey) {
            headers['X-API-Key'] = apiKey
        }

        // Make request
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(options?.timeout || 30000)
        })

        // Parse response
        let data: T | undefined
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
            data = await response.json()
        }

        if (!response.ok) {
            return {
                success: false,
                error: `HTTP ${response.status}: ${response.statusText}`,
                status: response.status,
                data
            }
        }

        return {
            success: true,
            data,
            status: response.status
        }
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'TimeoutError') {
                return { success: false, error: 'Request timeout' }
            }
            return { success: false, error: error.message }
        }
        return { success: false, error: 'Terjadi kesalahan saat menghubungi API' }
    }
}

export default apiClient
