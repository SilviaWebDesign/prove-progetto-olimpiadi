<script>
  import SectionCard from './SectionCard.svelte';
  import { sections, getSectionHref } from './sections.js';

  /** @type {{ active?: boolean }} */
  let { active = false } = $props();

  const cardSections = [sections.sustainability, sections.sport, sections.infrastructure];
</script>

<div class="cards-stage-inner">
  {#each cardSections as section (section.id)}
    <SectionCard
      title={section.heroTitle}
      theme={section.theme}
      modelSrc={section.modelSrc}
      href={getSectionHref(section)}
      {active}
    />
  {/each}
</div>

<style>
  .cards-stage-inner {
    --cards-padding-x: var(--page-padding-x, clamp(24px, 5.23vw, 79px));
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 354px));
    justify-content: space-between;
    align-items: center;
    justify-items: start;
    width: 100%;
    max-width: 100vw;
    height: 100%;
    min-height: 0;
    padding: 110px var(--cards-padding-x) 48px;
    box-sizing: border-box;
  }

  @media (max-width: 768px) {
    .cards-stage-inner {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: center;
      gap: clamp(8px, 1.8dvh, 20px);
      padding: calc(52px + 10px) var(--cards-padding-x) clamp(10px, 2dvh, 20px);
      overflow: hidden;
    }
  }
</style>
