import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getSessionAttendeeId } from '@/lib/session';
import { getAttendeeById } from '@/lib/db';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_RE = /^([0-9a-f-]+)(?:-(outbound|return))?\.(png|jpg|jpeg|webp)$/i;
const EXT_TYPE: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { file: string } }
): Promise<NextResponse> {
  const { file } = params;

  const m = FILE_RE.exec(file);
  if (!m || !UUID_RE.test(m[1])) {
    return new NextResponse('Not found', { status: 404 });
  }
  const ownerId = m[1];

  // Auth: only the pass owner, or an admin, may view it.
  const sessionId = getSessionAttendeeId();
  if (!sessionId) return new NextResponse('Not found', { status: 404 });
  const me = await getAttendeeById(sessionId);
  if (!me) return new NextResponse('Not found', { status: 404 });
  if (me.id !== ownerId && !me.is_admin) {
    return new NextResponse('Not found', { status: 404 });
  }

  const safeName = path.basename(file); // belt-and-braces after FILE_RE
  const filePath = path.join(process.cwd(), 'boarding', safeName);
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await fs.readFile(filePath));
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }

  const ext = m[3].toLowerCase();
  return new NextResponse(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': EXT_TYPE[ext] ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
