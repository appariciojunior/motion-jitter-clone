// In-browser MP4 export via WebCodecs: each rendered frame goes straight into a
// hardware H.264 encoder (NVENC/QuickSync/AMF through the OS media stack) and
// mp4-muxer boxes the compressed chunks into an .mp4 Blob — no JPEG per frame,
// no base64, no per-frame HTTP, no server ffmpeg re-encode. The ffmpeg pipeline
// remains as the fallback (GIF, audio muxing, unsupported browsers).
//
// WebCodecs types may lag in lib.dom depending on the TS version, so the API is
// reached through narrow local typings rather than the global ambient ones.

interface WCVideoFrame {
  close(): void;
}
interface WCChunk { byteLength: number }
interface WCEncoder {
  encode(frame: WCVideoFrame, opts?: { keyFrame?: boolean }): void;
  configure(config: Record<string, unknown>): void;
  flush(): Promise<void>;
  close(): void;
  encodeQueueSize: number;
}
interface WCEncoderCtor {
  new (init: { output: (chunk: WCChunk, meta: unknown) => void; error: (e: Error) => void }): WCEncoder;
  isConfigSupported(config: Record<string, unknown>): Promise<{ supported?: boolean }>;
}
interface WCFrameCtor {
  new (source: CanvasImageSource, init: { timestamp: number; duration?: number }): WCVideoFrame;
}

const getWC = () => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { VideoEncoder?: WCEncoderCtor; VideoFrame?: WCFrameCtor };
  return w.VideoEncoder && w.VideoFrame ? { VideoEncoder: w.VideoEncoder, VideoFrame: w.VideoFrame } : null;
};

export function supportsWebCodecs(): boolean {
  return getWC() !== null;
}

// H.264 High profile, level 5.1 — covers up to 4K@30. Hardware first; encoders
// vary per machine, so fall back to the browser's software encoder before
// giving up (still far faster than the JPEG+ffmpeg round trip).
async function pickConfig(VideoEncoder: WCEncoderCtor, width: number, height: number, fps: number) {
  const base = {
    codec: 'avc1.640033',
    width,
    height,
    framerate: fps,
    // ~0.15 bits per pixel per frame ≈ visually lossless for motion graphics
    bitrate: Math.min(40_000_000, Math.max(4_000_000, Math.round(width * height * fps * 0.15))),
  };
  for (const hw of ['prefer-hardware', 'no-preference']) {
    const config = { ...base, hardwareAcceleration: hw, avc: { format: 'avc' } };
    try {
      const res = await VideoEncoder.isConfigSupported(config);
      if (res.supported) return config;
    } catch { /* try next */ }
  }
  return null;
}

export interface WcExportOpts {
  width: number;          // final output px (even, from targetFor)
  height: number;
  fps: number;
  totalFrames: number;
  // Realize + draw frame f and hand back the live canvas to copy from.
  renderFrame: (f: number) => Promise<HTMLCanvasElement>;
  onProgress?: (done: number) => void;
}

// Encode the whole clip and return the finished MP4. Throws if WebCodecs or the
// H.264 config is unavailable — callers catch and use the ffmpeg pipeline.
export async function encodeMp4WebCodecs(opts: WcExportOpts): Promise<Blob> {
  const wc = getWC();
  if (!wc) throw new Error('WebCodecs unavailable');
  const { width, height, fps, totalFrames, renderFrame, onProgress } = opts;

  const config = await pickConfig(wc.VideoEncoder, width, height, fps);
  if (!config) throw new Error('No supported H.264 encoder config');

  // muxer is dynamic so it stays out of the initial bundle
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width, height },
    fastStart: 'in-memory', // moov up front → instantly seekable file
  });

  let encodeError: Error | null = null;
  const encoder = new wc.VideoEncoder({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    output: (chunk, meta) => muxer.addVideoChunk(chunk as any, meta as any),
    error: (e) => { encodeError = e; },
  });
  encoder.configure(config);

  // Used only when renderer rounding differs from the exact even output size.
  // The common path feeds the WebGL canvas straight to VideoFrame and avoids a
  // full-resolution WebGL-to-2D copy for every exported frame.
  const staging = document.createElement('canvas');
  staging.width = width;
  staging.height = height;
  const stagingCtx = staging.getContext('2d')!;

  const frameUs = Math.round(1_000_000 / fps);
  const keyInt = Math.max(1, Math.round(fps * 2)); // keyframe every ~2s

  try {
    for (let f = 0; f < totalFrames; f++) {
      if (encodeError) throw encodeError;
      const src = await renderFrame(f);
      let frameSource: CanvasImageSource = src;
      if (src.width !== width || src.height !== height) {
        stagingCtx.drawImage(src, 0, 0, width, height);
        frameSource = staging;
      }
      const frame = new wc.VideoFrame(frameSource, { timestamp: f * frameUs, duration: frameUs });
      encoder.encode(frame, { keyFrame: f % keyInt === 0 });
      frame.close();
      if (f === totalFrames - 1 || f % Math.max(1, Math.round(fps / 6)) === 0) {
        onProgress?.(f + 1);
      }
      // backpressure: don't let raw frames pile up faster than the encoder drains
      while (encoder.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 1));
      if (f % 10 === 0) await new Promise((r) => setTimeout(r, 0)); // keep UI responsive
    }
    await encoder.flush();
    if (encodeError) throw encodeError;
  } finally {
    try { encoder.close(); } catch { /* already closed on error */ }
  }

  muxer.finalize();
  return new Blob([target.buffer], { type: 'video/mp4' });
}
