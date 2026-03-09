import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Please upload a PDF file." },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF files are accepted." },
        { status: 400 }
      );
    }

    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });

    const trimmed = text?.trim() ?? "";

    if (trimmed.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from the PDF. The file may be scanned or image-based.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: trimmed });
  } catch (error) {
    console.error("PDF parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse the PDF file. Please try again." },
      { status: 500 }
    );
  }
}
