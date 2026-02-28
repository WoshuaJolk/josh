import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  hasValidInternalApiKey,
  INTERNAL_API_KEY_HEADER,
} from "@/lib/internalApiAuth";

const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

const TRANSFORM_THUMBNAIL = { width: 400, height: 400, quality: 60 };
const TRANSFORM_FULL = { width: 1200, quality: 70 };

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get(INTERNAL_API_KEY_HEADER);
    if (!hasValidInternalApiKey(key)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { paths, size } = body;

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { message: "paths array is required" },
        { status: 400 }
      );
    }

    const transform = size === "full" ? TRANSFORM_FULL : TRANSFORM_THUMBNAIL;

    const results = await Promise.all(
      paths.map(async (path: string) => {
        // Some older records may already store an absolute URL instead of
        // a storage path. In that case we can use it directly.
        if (isHttpUrl(path)) {
          return { path, signedUrl: path };
        }

        const { data, error } = await supabase.storage
          .from("tpo-uploads")
          .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS, { transform });

        if (!error && data?.signedUrl) {
          return { path, signedUrl: data.signedUrl };
        }

        // Fallback: if transform fails for a valid image/object, try again
        // without transform so the UI still renders the asset.
        const fallback = await supabase.storage
          .from("tpo-uploads")
          .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);
        if (!fallback.error && fallback.data?.signedUrl) {
          return { path, signedUrl: fallback.data.signedUrl };
        }

        console.error(
          `[signed-url] Failed for ${path}:`,
          error?.message || fallback.error?.message
        );
        return { path, signedUrl: null };
      })
    );

    const urlMap: Record<string, string> = {};
    for (const item of results) {
      if (item.signedUrl) {
        urlMap[item.path] = item.signedUrl;
      }
    }

    return NextResponse.json({ urls: urlMap });
  } catch (error) {
    console.error("[tpo/admin/signed-url] Error:", error);
    return NextResponse.json(
      { message: "Failed to generate signed URLs" },
      { status: 500 }
    );
  }
}
