import Image from "next/image";

const AI_PROVIDERS = [
  { name: "Anthropic", logo: "/logos/Claude_AI_logo_NoBG.png" },
  { name: "OpenAI", logo: "/logos/OpenAI-Logo-PNG.png" },
  { name: "Google Gemini", logo: "/logos/Google-Gemini-Black-Logo.png" },
  { name: "Perplexity", logo: "/logos/Perplexity-Logo-PNG.png" },
];

export function LogoMarquee() {
  // Duplicate the list for seamless infinite looping
  const logos = [...AI_PROVIDERS, ...AI_PROVIDERS];

  return (
    <section className="py-10">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-6 text-center text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Powered by leading AI providers
        </p>
      </div>

      <div className="group relative overflow-hidden">
        {/* Gradient fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-24 bg-gradient-to-l from-background to-transparent" />

        {/* Scrolling track */}
        <div className="animate-marquee flex w-max items-center gap-16 sm:gap-28 lg:gap-40">
          {logos.map((provider, i) => (
            <div
              key={`${provider.name}-${i}`}
              className="flex h-15 w-52 sm:w-64 shrink-0 items-center justify-center opacity-50 transition-all duration-300 hover:opacity-100"
            >
              <Image
                src={provider.logo}
                alt={provider.name}
                width={240}
                height={60}
                className="h-12 sm:h-15 w-auto max-w-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
