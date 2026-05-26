export interface BuildFilenameInput {
  customerName: string;
  proposalTypeName: string | null;
  index: number;
  imageUrl: string;
}

export function buildCatalogFilename(input: BuildFilenameInput): string {
  const ext = inferExt(input.imageUrl);
  const proposal = input.proposalTypeName?.trim() || "시안";
  const nn = String(Math.max(1, input.index)).padStart(2, "0");
  return `${input.customerName}_${proposal}_${nn}.${ext}`;
}

function inferExt(url: string): string {
  const match = /\.([a-z0-9]+)(?:\?|#|$)/i.exec(url);
  return match?.[1]?.toLowerCase() ?? "jpg";
}

export async function downloadImage(
  url: string,
  filename: string,
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`이미지를 가져오지 못했습니다 (${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
