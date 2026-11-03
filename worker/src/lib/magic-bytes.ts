import { mimeFromExt } from "@zzal/shared/src/image-formats";

interface DetectedImage {
  ext: string;
  mime: string;
}

function matchesBytes(bytes: Uint8Array, offset: number, signature: number[]): boolean {
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  return new TextDecoder("ascii").decode(bytes.slice(offset, offset + length));
}

function detected(ext: string): DetectedImage {
  return { ext, mime: mimeFromExt(ext) };
}

// 확장자·Content-Type을 신뢰하지 않고 매직 바이트로만 형식을 판별한다.
export function detectImageType(buffer: ArrayBuffer): DetectedImage | null {
  const bytes = new Uint8Array(buffer);

  if (matchesBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return detected("png");
  }
  if (matchesBytes(bytes, 0, [0xff, 0xd8, 0xff])) {
    return detected("jpg");
  }
  if (asciiAt(bytes, 0, 6) === "GIF87a" || asciiAt(bytes, 0, 6) === "GIF89a") {
    return detected("gif");
  }
  if (asciiAt(bytes, 0, 4) === "RIFF" && asciiAt(bytes, 8, 4) === "WEBP") {
    return detected("webp");
  }
  if (asciiAt(bytes, 4, 4) === "ftyp" && (asciiAt(bytes, 8, 4) === "avif" || asciiAt(bytes, 8, 4) === "avis")) {
    return detected("avif");
  }

  return null;
}
