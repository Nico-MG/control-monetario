import { AppPage } from "@/components/app-page";

type BudgetsProps = {
  searchParams: Promise<{ error?: string; notice?: string; month?: string }>;
};

export default function Budgets({ searchParams }: BudgetsProps) {
  return <AppPage section="budgets" searchParams={searchParams} />;
}
