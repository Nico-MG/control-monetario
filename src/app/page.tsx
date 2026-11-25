import { AppPage } from "@/components/app-page";

export const instant = false;

type HomeProps = {
  searchParams: Promise<{ error?: string; notice?: string; month?: string }>;
};

export default function Home({ searchParams }: HomeProps) {
  return <AppPage section="overview" searchParams={searchParams} />;
}
