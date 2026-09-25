import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { SectionPlaceholder } from "@/components/app/SectionPlaceholder";

export const Route = createFileRoute("/_authenticated/parametres/journal")({
  head: () => ({
    meta: [
      { title: "Logs activités — Orange Digital Center" },
      { name: "description", content: "Consultez le journal des activités de la plateforme." },
      { property: "og:title", content: "Logs activités — Orange Digital Center" },
      { property: "og:description", content: "Consultez le journal des activités de la plateforme." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return <SectionPlaceholder title="Logs activités" description="Consultez le journal des activités de la plateforme." icon={ScrollText} />;
}
