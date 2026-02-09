import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const resiId = searchParams.get("id");

    if (!resiId) {
        return NextResponse.json({ error: "Resi ID is required" }, { status: 400 });
    }

    // Get settings from database
    let apiEndpoint = "";
    let apiKey = "";

    try {
        const [endpointSetting, keySetting] = await Promise.all([
            prisma.systemSetting.findUnique({ where: { key: 'API_ENDPOINT' } }),
            prisma.systemSetting.findUnique({ where: { key: 'API_KEY' } })
        ]);

        apiEndpoint = endpointSetting?.value || "";
        apiKey = keySetting ? decrypt(keySetting.value) || "" : "";
    } catch (e) {
        console.error("Failed to get settings from database:", e);
    }

    if (!apiEndpoint) {
        return NextResponse.json(
            { error: "API endpoint not configured" },
            { status: 500 }
        );
    }

    // Standardize apiEndpoint and path
    const baseApi = apiEndpoint.replace(/\/$/, '');

    // PDF URL according to Laravel routes
    // We try to match how api-client.ts builds URLs
    const apiPath = `/resi/${resiId}/pdf`;
    const apiPdfUrl = `${baseApi}${apiPath}`;

    // Fallback web URL (without /api)
    const webBase = baseApi.replace(/\/api$/, '');
    const webPdfUrl = `${webBase}/resi/${resiId}/generate/download`;

    console.log("Proxying PDF request. API URL:", apiPdfUrl, "Web Fallback:", webPdfUrl);

    try {
        // Try API route first
        let response = await fetch(apiPdfUrl, {
            headers: {
                "X-API-Key": apiKey || "",
                "Accept": "application/pdf",
            },
        });

        // If API route fails, try the web route (may need session auth)
        if (!response.ok) {
            console.log("API route failed, trying web route...");
            response = await fetch(webPdfUrl, {
                headers: {
                    "Accept": "application/pdf",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error("External fetch failed:", response.status, errorText);
            return NextResponse.json(
                { error: `Failed to fetch PDF: ${response.statusText}`, details: errorText },
                { status: response.status }
            );
        }

        const contentType = response.headers.get("content-type");

        // Check if response is actually PDF
        if (!contentType?.includes("pdf")) {
            const text = await response.text();
            console.error("Response is not PDF, got:", contentType, text.substring(0, 200));
            return NextResponse.json(
                { error: "Response is not a PDF. The server may require authentication." },
                { status: 401 }
            );
        }

        const pdfBuffer = await response.arrayBuffer();

        return new NextResponse(pdfBuffer, {
            headers: {
                "Content-Type": contentType || "application/pdf",
                "Content-Disposition": `inline; filename="Resi-${resiId}.pdf"`,
                "Cache-Control": "no-store, max-age=0",
            },
        });
    } catch (error: unknown) {
        console.error("PDF proxy exception:", error);
        const errorMessage = error instanceof Error ? error.message : "Undefined error";
        return NextResponse.json(
            { error: "Internal server error during PDF download", details: errorMessage },
            { status: 500 }
        );
    }
}
