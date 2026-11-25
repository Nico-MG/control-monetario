import { AppPage } from "@/components/app-page";

type GoalsProps = {
  searchParams: Promise<{ error?: string; notice?: string; month?: string }>;
};

export default function Goals({ searchParams }: GoalsProps) {
  return <AppPage section="goals" searchParams={searchParams} />;
}
