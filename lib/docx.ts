import mammoth from "mammoth";

export async function importDocx(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.convertToHtml(
    { arrayBuffer },
    {
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
