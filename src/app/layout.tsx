import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Drop It, Store it and Access it | Dropin",
    template: "%s | Dropin",
  },
  description:
    "Dropin helps you share files quickly: drop files, store them securely, and access them instantly with a share token.",
  keywords: [
    "quick share",
    "quick file share",
    "file sharing",
    "token based file sharing",
    "secure file transfer",
    "upload file and share token",
    "download shared files",
    "temporary file sharing",
    "drop it store it access it",
  ],
  openGraph: {
    title: "Drop It, Store it and Access it | Dropin",
    description:
      "Quick share files with token access. Upload once, share a token, and let recipients view and download instantly.",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Dropin logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Drop It, Store it and Access it | Dropin",
    description:
      "Upload files and share with a token. Quick share with simple access and download.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2072569471322100"
     crossorigin="anonymous"></script>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
