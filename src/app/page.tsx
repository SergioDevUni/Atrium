import { AppShell, type AppView } from "@/components/app-shell/AppShell";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  return <AppShell initialView={normalizeInitialView(params?.view)} />;
}

function normalizeInitialView(value: string | string[] | undefined): AppView {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (rawValue === "check" || rawValue === "dashboard" || rawValue === "conditions") return rawValue;
  return "home";
}

