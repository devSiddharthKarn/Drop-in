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

type SearchParams = {
  token?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

export const dynamic = "force-dynamic";

async function getOrigin() {
  const headersList = await headers();
  const forwardedHost = headersList.get("x-forwarded-host");
  const host = forwardedHost ?? headersList.get("host");
  const forwardedProto = headersList.get("x-forwarded-proto");
  const protocol = forwardedProto ?? (host?.includes("localhost") ? "http" : "https");

  if (host) {
    return `${protocol}://${host}`;
  }

  if (process.env.HOSTED_URL) {
    return process.env.HOSTED_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "";
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const tokenParam = resolvedSearchParams?.token;
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
      key={initialToken || "dropin"}
      initialToken={initialToken}
      initialFiles={initialFiles}
      initialMessage={initialMessage}
    />
  );
}