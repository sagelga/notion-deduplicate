import { Carousel } from "@/components/ui";

const steps = [
  {
    description: (
      <>
        Go to{" "}
        <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer">
          notion.so/my-integrations
        </a>{" "}
        → click <strong>Create a new integration</strong>.
      </>
    ),
    image: "/images/step-5-database-connections.png",
  },
  {
    description: (
      <>
        Fill in the integration <strong>name</strong> and select the <strong>associated workspace</strong>.
      </>
    ),
    image: "/images/step-2-copy-token.png",
  },
  {
    description: (
      <>
        Click the <strong>Content access</strong> tab at the top of the integration settings.
      </>
    ),
    image: "/images/step-6-alternative-connection.png",
  },
  {
    description: (
      <>
        Click <strong>Edit access</strong> to open the page and database selection modal.
      </>
    ),
    image: "/images/step-3-content-access.png",
  },
  {
    description: (
      <>
        Search for or type the <strong>database name</strong> and select it to grant the integration access.
      </>
    ),
    critical: true,
    image: "/images/step-4-manage-page-access.png",
  },
  {
    description: (
      <>
        Copy the <strong>Internal integration secret</strong> (<code>secret_…</code> or <code>ntn_…</code>) from the{" "}
        <strong>Configuration</strong> tab.
      </>
    ),
    image: "/images/step-1-create-integration.png",
  },
];

export function SetupCarousel() {
  return <Carousel steps={steps} />;
}
