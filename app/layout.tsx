import type { Metadata } from "next";
import { ToastProvider } from "@/app/components/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowTutor Pro",
  description: "AI workflow-to-LMS engine with SCORM export, QA scan, and completion sync."
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
