import type { Metadata } from "next";
import "@copilotkit/react-ui/styles.css";
import { AtriumCopilotProvider } from "@/components/AtriumCopilotProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atrium",
  description: "Personalized health intake and assessment guidance",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AtriumCopilotProvider>{children}</AtriumCopilotProvider>
      </body>
    </html>
  );
}
