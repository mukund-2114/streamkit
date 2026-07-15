export interface SnapshotResult {
  dataUrl: string;
  usedWebCodecs: boolean;
}

const CODEC = "vp8";

function hasWebCodecs(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window && "VideoDecoder" in window;
}

function frameToCanvasDataUrl(frame: VideoFrame, width: number, height: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.drawImage(frame, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

async function encodeDecodeRoundTrip(sourceCanvas: HTMLCanvasElement): Promise<string> {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const chunks: EncodedVideoChunk[] = [];
  let encoderError: DOMException | null = null;

  const encoder = new VideoEncoder({
    output: (chunk) => chunks.push(chunk),
    error: (e) => {
      encoderError = e;
    },
  });
  encoder.configure({ codec: CODEC, width, height, bitrate: 2_000_000, framerate: 30 });

  const inputFrame = new VideoFrame(sourceCanvas, { timestamp: 0 });
  encoder.encode(inputFrame, { keyFrame: true });
  inputFrame.close();
  await encoder.flush();
  encoder.close();

  if (encoderError) throw encoderError;
  if (chunks.length === 0) throw new Error("Encoder produced no chunks");

  const decoded = await new Promise<VideoFrame>((resolve, reject) => {
    const decoder = new VideoDecoder({
      output: (frame) => resolve(frame),
      error: (e) => reject(e),
    });
    decoder.configure({ codec: CODEC, codedWidth: width, codedHeight: height });
    decoder.decode(chunks[0]);
    decoder.flush().catch(reject);
  });

  const dataUrl = frameToCanvasDataUrl(decoded, width, height);
  decoded.close();
  return dataUrl;
}

export async function captureSnapshot(video: HTMLVideoElement): Promise<SnapshotResult> {
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 360;

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const ctx = sourceCanvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.drawImage(video, 0, 0, width, height);

  if (!hasWebCodecs()) {
    return { dataUrl: sourceCanvas.toDataURL("image/png"), usedWebCodecs: false };
  }

  try {
    const dataUrl = await encodeDecodeRoundTrip(sourceCanvas);
    return { dataUrl, usedWebCodecs: true };
  } catch (err) {
    console.warn("WebCodecs round trip failed, falling back to canvas capture:", err);
    return { dataUrl: sourceCanvas.toDataURL("image/png"), usedWebCodecs: false };
  }
}
