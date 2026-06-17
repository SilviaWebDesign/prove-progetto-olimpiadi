<script>
  import { onMount } from 'svelte';
  import HeroFrost from '$lib/components/file-chiara/HeroFrost.svelte';
  import OpinionCard from '$lib/components/file-chiara/OpinionCard.svelte';

  /** @type {{ section: (typeof import('./sections.js').sections)[keyof typeof import('./sections.js').sections] }} */
  let { section } = $props();

  onMount(() => {
    document.documentElement.classList.add('section-route');
    document.body.classList.remove('cards-phase');
    return () => document.documentElement.classList.remove('section-route');
  });
</script>

<article class="section-page theme-{section.theme}" style="--section-accent: {section.accent}">
  <section class="hero-screen" aria-labelledby="section-hero-title">
    <div class="hero-visual">
      <HeroFrost src={section.hero.background} />
      <h1
        id="section-hero-title"
        class="hero-title"
        style="--title-chars: {section.heroTitle.length}"
      >
        {section.heroTitle}
      </h1>
    </div>
  </section>

  <div class="section-body">
    <div class="section-claim">
      <p>{section.claim}</p>
    </div>

    <p class="section-intro">{section.intro}</p>

    <section class="featured-block" aria-labelledby="featured-heading">
      <div class="featured-visual" id="featured-heading">
        <div class="featured-box"></div>
      </div>
      <div class="featured-copy">
        <h2 class="featured-title">{section.featured.title}</h2>
        <a href="#articolo" class="featured-cta">{section.featured.cta}</a>
      </div>
    </section>

    <section class="opinions-section" aria-label="Punti di vista">
      <div class="opinions-grid">
        {#each section.opinions as opinion, index (index)}
          <OpinionCard quote={opinion.quote} />
        {/each}
      </div>
    </section>

    {#if section.footerBand}
      {#if section.footerGradientImage}
        <div
          class="footer-gradient"
          style="background-image: url('{section.footerGradientImage}')"
          aria-hidden="true"
        ></div>
      {/if}
      <div class="footer-band" aria-hidden="true"></div>
      <div
        class="footer-snow"
        class:has-image={!!section.footerSnowImage}
        style={section.footerSnowImage
          ? `background-image: url('${section.footerSnowImage}')`
          : undefined}
        aria-hidden="true"
      ></div>
    {/if}
  </div>
</article>

<style>
  .section-page {
    --section-accent: #3eaf3f;
    width: 100%;
    min-height: 100vh;
    background: #ffffff;
    color: #000000;
  }

  /* —— Hero: titolo incollato al fondo della foto —— */
  .hero-screen {
    width: 100%;
    height: 100svh;
    height: 100dvh;
    min-height: 100svh;
    min-height: 100dvh;
    overflow: hidden;
  }

  .hero-visual {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
  }

  .hero-title {
    position: relative;
    z-index: 2;
    flex-shrink: 0;
    width: 100%;
    margin: 0 0 -0.06em;
    padding: 0.12em 0 0;
    box-sizing: border-box;
    font-family: 'PP Formula Condensed', var(--font-title);
    font-size: min(
      300px,
      max(18vw, calc(100vw / (var(--title-chars, 12) * 0.44)))
    );
    font-weight: 900;
    font-variation-settings: 'wght' 900;
    font-stretch: condensed;
    line-height: 0.72;
    letter-spacing: clamp(6px, 1.2vw, 18.2px);
    text-align: center;
    text-transform: uppercase;
    color: #000000;
    white-space: nowrap;
    pointer-events: none;
  }

  /* —— Contenuto sotto l’hero —— */
  .section-body {
    position: relative;
    z-index: 4;
    padding: 80px clamp(24px, 4vw, 59px) 80px;
    background: #ffffff;
  }

  .section-claim {
    max-width: 835px;
    margin: 2rem auto 2.5rem;
    padding: 0.5rem 0;
    border-left: 4px solid var(--section-accent);
  }

  .section-claim p {
    margin: 0;
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(1.1rem, 2.5vw, 1.5rem);
    font-weight: 400;
    line-height: 1.45;
    letter-spacing: 0.02em;
    color: #000000;
  }

  .section-intro {
    max-width: min(1499px, 100%);
    margin: 0 auto 4rem;
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(1.75rem, 5vw, 6rem);
    font-weight: 400;
    line-height: 1.1;
    letter-spacing: -0.01em;
    color: #000000;
  }

  .featured-block {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto 5rem;
    padding: 2rem 0;
  }

  .featured-box {
    width: min(100%, 602px);
    aspect-ratio: 602 / 430;
    border-radius: 30px;
    background: rgba(217, 217, 217, 0.2);
    border: 2px solid rgba(0, 0, 0, 0.06);
  }

  .theme-sustainability .featured-box {
    box-shadow: inset 0 0 80px rgba(62, 175, 63, 0.12);
  }

  .theme-sport .featured-box {
    box-shadow: inset 0 0 80px rgba(66, 44, 203, 0.15);
  }

  .theme-infrastructure .featured-box {
    box-shadow: inset 0 0 80px rgba(255, 120, 60, 0.15);
  }

  .featured-copy {
    max-width: 520px;
  }

  .featured-title {
    margin: 0 0 1.5rem;
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(1.5rem, 3vw, 2.5rem);
    line-height: 1.25;
    font-weight: 400;
    color: #000000;
  }

  .featured-cta {
    font-family: var(--font-title);
    font-size: clamp(2rem, 4vw, 3.5rem);
    font-weight: var(--font-title-weight);
    text-transform: uppercase;
    color: #000000;
    text-decoration: none;
    border-bottom: 3px solid #000000;
    padding-bottom: 0.15rem;
  }

  .featured-cta:hover {
    opacity: 0.75;
  }

  .opinions-section {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem 0 6rem;
  }

  .opinions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: clamp(1.5rem, 3vw, 2.5rem);
  }

  .footer-gradient {
    width: 100%;
    max-width: 100vw;
    height: min(420px, 50vh);
    margin: 4rem auto 0;
    background-size: cover;
    background-position: center;
    mask-image: linear-gradient(180deg, transparent 0%, #000 35%, #000 100%);
  }

  .footer-band {
    height: 54px;
    background: linear-gradient(90deg, transparent, var(--section-accent), transparent);
    opacity: 0.35;
  }

  .footer-snow {
    height: 280px;
    margin-top: -2rem;
    background: linear-gradient(
      180deg,
      rgba(200, 230, 255, 0.45) 0%,
      rgba(255, 255, 255, 0.9) 55%,
      #ffffff 100%
    );
    border-radius: 0 0 40% 40%;
  }

  .footer-snow.has-image {
    background-size: cover;
    background-position: center bottom;
    background-repeat: no-repeat;
  }

  @media (max-width: 900px) {
    .hero-title {
      font-size: min(
        10rem,
        max(15vw, calc(100vw / (var(--title-chars, 12) * 0.5)))
      );
      letter-spacing: clamp(3px, 0.8vw, 12px);
      line-height: 0.72;
      white-space: normal;
      padding: 0.1em 0 0;
      margin-bottom: -0.06em;
    }

    .featured-block {
      grid-template-columns: 1fr;
    }

    .featured-visual {
      order: -1;
    }

    .featured-copy {
      max-width: 100%;
    }
  }

  @media (max-width: 640px) {
    .hero-screen {
      min-height: 100svh;
      min-height: 100dvh;
    }

    .section-body {
      padding: 60px 16px 60px;
    }

    .opinions-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
