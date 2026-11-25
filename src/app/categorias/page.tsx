import { AppPage } from "@/components/app-page";

type CategoriesProps = {
  searchParams: Promise<{ error?: string; notice?: string; month?: string; category?: string }>;
};

export default function Categories({ searchParams }: CategoriesProps) {
  return <AppPage section="categories" searchParams={searchParams} />;
}
