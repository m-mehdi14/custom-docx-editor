import HTMLtoDOCX from "html-to-docx";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { html?: string };
    const html = body.html ?? "";

    if (!html.trim()) {
      return Response.json(
        { error: "HTML content is required." },
        { status: 400 },
      );
    }

    const docxBuffer = await HTMLtoDOCX(html, undefined, {
      table: { row: { cantSplit: true } },
      pageNumber: true,
    });

    return new Response(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="document.docx"',
      },
    });
  } catch {
    return Response.json({ error: "Unable to export DOCX." }, { status: 500 });
  }
}
