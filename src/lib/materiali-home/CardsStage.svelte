<script>
  import SectionCard from './SectionCard.svelte';

  /** @type {{ active?: boolean }} */
  let { active = false } = $props();
</script>

<div class="cards-stage-inner">
  <SectionCard
    title="sostenibilitÀ"
    theme="sustainability"
    modelSrc="/oggetti/albero-copia.glb"
    href="/sostenibilita"
    {active}
  />
  <SectionCard title="sport" theme="sport" modelSrc="/oggetti/ice_skate.glb" href="/sport" {active} />
  <SectionCard
    title="infrastrutture"
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
    gap: clamp(16px, 2.5vw, 40px);
    padding: 110px clamp(16px, 3vw, 48px) 48px;
    box-sizing: border-box;
  }

  @media (max-width: 768px) {
    .cards-stage-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: clamp(8px, 1.8dvh, 20px);
      padding: calc(52px + 10px) 24px clamp(10px, 2dvh, 20px);
      overflow: hidden;
    }
  }
</style>
