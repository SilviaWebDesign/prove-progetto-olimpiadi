<script>
  import SectionCard from '$lib/components/file-chiara/SectionCard.svelte';

  /** @type {{ active?: boolean }} */
  let { active = false } = $props();
</script>

<div class="cards-stage-inner">
  <SectionCard
    title="SOSTENIBILITÀ"
    theme="sustainability"
    modelSrc="/oggetti/sostenibilita.glb"
    href="/sostenibilita"
    {active}
  />
  <SectionCard title="SPORT" theme="sport" modelSrc="/oggetti/ice_skate.glb" href="/sport" {active} />
  <SectionCard
    title="INFRASTRUTTURE"
    theme="infrastructure"
    modelSrc="/oggetti/excavator.glb"
    href="/sezioni/infrastrutture"
    {active}
  />
</div>

<style>
  .cards-stage-inner {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: center;
    justify-items: center;
    width: 100%;
    max-width: 100vw;
    height: 100%;
    min-height: 0;
    gap: clamp(12px, 2vw, 32px);
    padding: 110px clamp(16px, 3vw, 48px) 40px;
    box-sizing: border-box;
  }

  @media (max-width: 640px) {
    .cards-stage-inner {
      grid-template-columns: 1fr;
      padding-top: 100px;
      padding-bottom: 48px;
    }
  }
</style>
