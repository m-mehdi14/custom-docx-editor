import mammoth from "mammoth";

/** Word paragraph/run styles → HTML (mammoth style map). */
const DOCX_STYLE_MAP = [
  "b => strong",
  "i => em",
  "u => u",
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
];

export async function importDocx(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: DOCX_STYLE_MAP,
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.read("base64");
        return {
          src: `data:${image.contentType};base64,${base64}`,
        };
      }),
    },
  );

  return value;
}

export async function exportDocx(html: string): Promise<Blob> {
  const response = await fetch("/api/export-docx", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ html }),
  });

  if (!response.ok) {
    throw new Error("DOCX export failed.");
  }

  return response.blob();
}
