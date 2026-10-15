import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { NewScanForm } from "@/components/NewScanForm";

export const dynamic = "force-dynamic";

export default async function NewScanPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; type?: string; projectId?: string }>;
}) {
  const sp = await searchParams;

  return (
    <>
      <PageHeader
        title="Lancer une analyse"
        subtitle="Connecte un dépôt GitHub, importe un fichier ZIP ou colle du code. ShadowStack le scanne en moins d'une minute."
        breadcrumb={[{ label: "Projets", href: "/projects" }, { label: "Nouvelle analyse" }]}
      />

      <Suspense fallback={null}>
        <NewScanForm
          defaultMode={sp?.mode ?? "github"}
          defaultType={sp?.type ?? "full"}
          defaultProjectId={sp?.projectId}
        />
      </Suspense>
    </>
  );
}
