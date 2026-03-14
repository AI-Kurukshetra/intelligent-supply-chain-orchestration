"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DM_Mono, DM_Sans } from "next/font/google";
import { useState } from "react";
import { Toaster } from "sonner";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], variable: "--font-dm-mono", display: "swap", weight: ["400", "500"] });

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  if (typeof window !== "undefined") {
    const licenseKey = process.env.NEXT_PUBLIC_AG_GRID_LICENSE_KEY;
    if (licenseKey) {
      void import("ag-grid-enterprise").then((module) => {
        module.LicenseManager.setLicenseKey(licenseKey);
      });
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className={`${dmSans.variable} ${dmMono.variable} min-h-screen font-sans`}>
        {children}
      </div>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
