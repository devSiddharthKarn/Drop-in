import { headers } from "next/headers";

import DropinClient from "./DropinClient";

type FileEntry = {
  _id: string;
  token: number;
  name: string;
  sizeInBytes: string;
  url: string;
  uploadedAt: string;
  expiresAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
  error: unknown | null;
};

type PageProps = {
  searchParams?: {
    token?: string;
  };
};

export const dynamic = "force-dynamic";

async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  if (process.env.HOSTED_URL) {
    return process.env.HOSTED_URL;
  }

  if (!host) {
    return "";
  }

  return `${protocol}://${host}`;
}

export default async function Page({ searchParams }: PageProps) {
  const tokenParam = searchParams?.token;
  const initialToken = tokenParam ?? "";
  let initialFiles: FileEntry[] = [];
  let initialMessage = "";

  if (tokenParam) {
    const token = Number(tokenParam);
    if (!Number.isFinite(token)) {
      initialMessage = "Invalid token in link.";
    } else {
      const origin = await getOrigin();
      if (origin) {
        try {
          const response = await fetch(`${origin}/api/package?token=${encodeURIComponent(token)}`, {
            cache: "no-store",
          });
          const payload = (await response.json()) as ApiResponse<FileEntry[]>;

          if (response.ok && payload.success && payload.data) {
            initialFiles = payload.data;
            initialMessage = payload.message || "Files found.";
          } else {
            initialMessage = payload.message || "Token not found.";
          }
        } catch {
          initialMessage = "Could not load files.";
        }
      } else {
        initialMessage = "Open this link in a browser to load files.";
      }
    }
  }

  return (
    <DropinClient
      initialToken={initialToken}
      initialFiles={initialFiles}
      initialMessage={initialMessage}
    />
  );
}