import { AppPage } from "@/components/app-page";

type MovementsProps = {
  searchParams: Promise<{ error?: string; notice?: string; month?: string }>;
};

export default function Movements({ searchParams }: MovementsProps) {
  return <AppPage section="transactions" searchParams={searchParams} />;
}
