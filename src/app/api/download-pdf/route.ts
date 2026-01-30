import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log("Proxying PDF request for URL:", url);

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("External fetch failed:", response.status, errorText);
            return NextResponse.json(
                { error: `Failed to fetch PDF: ${response.statusText}`, details: errorText },
                { status: response.status }
            );
        }

        const contentType = response.headers.get("content-type");
        const pdfBuffer = await response.arrayBuffer();

        return new NextResponse(pdfBuffer, {
            headers: {
                "Content-Type": contentType || "application/pdf",
                "Content-Disposition": `attachment; filename="invoice.pdf"`,
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
