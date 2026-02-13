import type { Metadata } from "next";
import { ToastProvider } from "@/app/components/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowTutor MVP",
  description: "Screenshots to SCORM 1.2 LMS modules"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
