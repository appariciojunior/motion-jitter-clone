import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const maxDuration = 300;

const EXPORTS_DIR = path.join(process.cwd(), 'public', 'exports');

function sessionDir(id: string) {
  return path.join(os.tmpdir(), `motion-export-${id}`);
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let stderr = '';
    p.stderr.on('data', (d) => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-800)}`));
    });
  });
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const { action } = body;

  try {
    if (action === 'begin') {
      const id = crypto.randomUUID();
      await fs.mkdir(sessionDir(id), { recursive: true });
      return NextResponse.json({ sessionId: id });
    }

    if (action === 'frame') {
      const { sessionId, index, dataUrl } = body;
      const dir = sessionDir(sessionId);
      const base64 = String(dataUrl).replace(/^data:image\/png;base64,/, '');
      const file = path.join(dir, `frame_${String(index).padStart(5, '0')}.png`);
      await fs.writeFile(file, Buffer.from(base64, 'base64'));
      return NextResponse.json({ ok: true });
    }

    if (action === 'encode') {
      const { sessionId, fps, format, audio } = body;
      const dir = sessionDir(sessionId);
      const pattern = path.join(dir, 'frame_%05d.png');
      await fs.mkdir(EXPORTS_DIR, { recursive: true });

      let audioFile: string | null = null;
      if (audio) {
        audioFile = path.join(dir, 'audio.input');
        await fs.writeFile(audioFile, Buffer.from(audio, 'base64'));
      }

      const files: string[] = [];

      if (format === 'mp4' || format === 'both') {
        const out = `motion_${sessionId}.mp4`;
        const outPath = path.join(EXPORTS_DIR, out);
        const args = ['-y', '-framerate', String(fps), '-i', pattern];
        if (audioFile) args.push('-i', audioFile);
        args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18');
        if (audioFile) args.push('-c:a', 'aac', '-shortest');
        args.push(outPath);
        await run('ffmpeg', args);
        files.push(out);
      }

      if (format === 'gif' || format === 'both') {
        const palette = path.join(dir, 'palette.png');
        const out = `motion_${sessionId}.gif`;
        const outPath = path.join(EXPORTS_DIR, out);
        await run('ffmpeg', ['-y', '-framerate', String(fps), '-i', pattern,
          '-vf', `fps=${fps},scale=iw:-1:flags=lanczos,palettegen`, palette]);
        await run('ffmpeg', ['-y', '-framerate', String(fps), '-i', pattern, '-i', palette,
          '-filter_complex', `fps=${fps} [x]; [x][1:v] paletteuse`, outPath]);
        files.push(out);
      }

      // clean temp frames
      await fs.rm(dir, { recursive: true, force: true });

      return NextResponse.json({ files });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
