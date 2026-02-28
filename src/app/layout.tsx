import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
});

const ppEditorialNew = localFont({
  src: [
    {
      path: "../fonts/PPEditorialNew-Italic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../fonts/PPEditorialNew-Regular.otf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-pp-editorial-new",
});

const fivebyseven = localFont({
  src: [
    {
      path: "../fonts/FiveBySeven.ttf",
      weight: "400",
    },
    {
      path: "../fonts/FiveBySevenBold.ttf",
      weight: "600",
    },
  ],
  variable: "--font-5by7",
  preload: true,
});

const gtsuper = localFont({
  src: [
    {
      path: "../fonts/GT-Super-Display-Medium-Trial.otf",
      weight: "400",
    },
  ],
  variable: "--font-gtsuper",
  preload: true,
});

const ppNeueMontreal = localFont({
  src: [
    {
      path: "../fonts/PPNeueMontreal-Book.otf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../fonts/PPNeueMontreal-Italic.otf",
      weight: "100",
      style: "italic",
    },
  ],
  variable: "--font-pp-neue-montreal",
});

export async function generateMetadata(): Promise<Metadata> {
  const metaImage = "/ogjosh.png";

  return {
    title: "Jøsh",
    description: "We got rid of everything you hate about the apps.",
    openGraph: {
      title: "Jøsh",
      description: "We got rid of everything you hate about the apps.",
      images: [metaImage],
    },
    icons: {
      icon: "/favicon.ico",
    },
    twitter: {
      card: "summary_large_image",
      title: "Jøsh",
      description: "We got rid of everything you hate about the apps.",
      images: [metaImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${gtsuper.variable} ${geistMono.variable} ${fivebyseven.variable} ${ibmPlexMono.variable} ${ppEditorialNew.variable} ${ppNeueMontreal.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
