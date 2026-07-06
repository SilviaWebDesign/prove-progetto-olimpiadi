<script>
  /** @type {{ enabled?: boolean, visible?: boolean, height?: number }} */
  let { enabled = true, visible = $bindable(false), height = $bindable(0) } = $props();

  /** @type {HTMLElement | null} */
  let footerEl = $state(null);

  $effect(() => {
    if (!footerEl || !enabled) return;

    const updateHeight = () => {
      height = footerEl?.getBoundingClientRect().height ?? 0;
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(footerEl);
    return () => observer.disconnect();
  });

  const projectTeam = [
    'Silvia La Mastra',
    'Chiara Moretti',
    'Letizia Neri',
    'Giovanni Palladino',
    'Siyu Yang',
    'Jieni Ye',
  ];

  const faculty = ['Umberto Tolino', 'Christian Mazzoleni'];
  const teachingAssistants = ['Francesco Di Gioia', 'Tommaso Negri'];
</script>

{#if enabled}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="about-footer-reveal"
    class:visible
    style:height={visible && height > 0 ? `${height}px` : null}
    onmouseenter={() => {
      visible = true;
    }}
    onmouseleave={() => {
      visible = false;
    }}
  >
    <footer
      bind:this={footerEl}
      class="about-footer"
      class:visible
      aria-label="Credits progetto"
    >
      <div class="about-footer__inner">
        <div class="about-footer__col about-footer__col--project">
          <p class="about-footer__heading">PROGETTO DI</p>
          <ul class="about-footer__list">
            {#each projectTeam as name}
              <li>{name}</li>
            {/each}
          </ul>
        </div>

        <div class="about-footer__col about-footer__col--faculty">
          <p class="about-footer__heading">PROFESSORI</p>
          <ul class="about-footer__list">
            {#each faculty as name}
              <li>{name}</li>
            {/each}
          </ul>

          <p class="about-footer__heading about-footer__heading--sub">CULTORI DELLA MATERIA</p>
          <ul class="about-footer__list">
            {#each teachingAssistants as name}
              <li>{name}</li>
            {/each}
          </ul>
        </div>

        <div class="about-footer__col about-footer__col--brand">
          <p class="about-footer__lab">Laboratorio di Web e Digital Design 2025-2026</p>
          <div class="about-footer__logos">
            <img
              class="about-footer__ddc"
              src="/images/about/ddc-logo.svg"
              alt="DDC"
              width="110"
              height="47"
            />
            <img
              class="about-footer__polimi"
              src="/images/about/polimi-logo.png"
              alt="Politecnico di Milano"
              width="110"
              height="36"
            />
          </div>
        </div>
      </div>
    </footer>
  </div>
{/if}

<style>
  .about-footer-reveal {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 8;
    height: 56px;
    overflow: visible;
    pointer-events: auto;
  }

  .about-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: auto;
    overflow: visible;
    background: #ffffff;
    padding-top: 24px;
    padding-bottom: 24px;
    padding-left: clamp(24px, 3.44vw, 52px);
    padding-right: clamp(24px, 3.44vw, 52px);
    box-sizing: border-box;
    transform: translateY(100%);
    transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .about-footer.visible {
    transform: translateY(0);
  }

  .about-footer__inner {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: clamp(20px, 3vw, 40px);
  }

  .about-footer__col {
    min-width: 0;
  }

  .about-footer__col--project {
    flex: 0 0 148px;
  }

  .about-footer__col--faculty {
    flex: 0 0 220px;
  }

  .about-footer__col--brand {
    flex: 0 0 168px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    margin-left: auto;
  }

  .about-footer__heading {
    margin: 0 0 5px;
    font-family: 'Supreme Variable', sans-serif;
    font-size: 14px;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: 0.02em;
    color: #000000;
    text-transform: uppercase;
    text-align: left;
  }

  .about-footer__heading--sub {
    margin-top: 10px;
  }

  .about-footer__list {
    list-style: none;
    margin: 0;
    padding: 0;
    font-family: 'Supreme Variable', sans-serif;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.35;
    color: #000000;
    text-align: left;
  }

  .about-footer__lab {
    margin: 0 0 10px;
    max-width: 168px;
    font-family: 'Supreme Variable', sans-serif;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.2;
    color: #000000;
    text-align: right;
    text-wrap: balance;
  }

  .about-footer__logos {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }

  .about-footer__ddc {
    display: block;
    width: 110px;
    height: 47px;
    object-fit: contain;
    object-position: right center;
  }

  .about-footer__polimi {
    display: block;
    width: 110px;
    height: 36px;
    object-fit: contain;
    object-position: right center;
  }

  @media (max-width: 900px) {
    .about-footer-reveal {
      display: none;
    }
  }
</style>
