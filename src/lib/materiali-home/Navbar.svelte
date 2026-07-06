<script>
  import { onMount } from 'svelte';
  import { getSectionHref } from './sections.js';
  import { homeScrollProgress } from './homeScrollProgress.js';
  import { HOME_CARDS_START } from './scrollStages.js';

  /** @type {{ alwaysVisible?: boolean, revealAtCards?: boolean }} */
  let { alwaysVisible = false, revealAtCards = false } = $props();

  let menuOpen = $state(false);
  let scrolled = $state(false);
  let cardsPhase = $state(false);

  /** @type {HTMLElement | null} */
  let titleEl = $state(null);
  let iconSize = $state(20);

  const SCROLL_THRESHOLD = 8;

  /** @type {{ label: string, href: string }[]} */
  const menuItems = [
    { label: 'home', href: '/prototypes/home' },
    { label: 'sostenibilità', href: getSectionHref('sustainability') },
    { label: 'sport', href: getSectionHref('sport') },
    { label: 'infrastrutture', href: getSectionHref('infrastructure') },
    { label: 'about', href: '/prototypes/about' },
  ];

  function updateScrollState() {
    scrolled = window.scrollY > SCROLL_THRESHOLD;
    if (revealAtCards) {
      cardsPhase = homeScrollProgress.value >= HOME_CARDS_START;
    }
  }

  const navbarVisible = $derived(
    alwaysVisible ||
    menuOpen ||
    (revealAtCards ? cardsPhase : scrolled)
  );

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }

  /** @param {KeyboardEvent} event */
  function handleKeydown(event) {
    if (event.key === 'Escape' && menuOpen) {
      closeMenu();
    }
  }

  $effect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  });

  function measureTitleCapHeight() {
    if (!titleEl) return;
    const style = getComputedStyle(titleEl);
    const probe = document.createElement('span');
    probe.textContent = 'Q';
    probe.style.font = style.font;
    probe.style.fontFamily = style.fontFamily;
    probe.style.fontWeight = style.fontWeight;
    probe.style.fontSize = style.fontSize;
    probe.style.fontStretch = style.fontStretch;
    probe.style.fontVariationSettings = style.fontVariationSettings;
    probe.style.lineHeight = 'normal';
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.whiteSpace = 'nowrap';
    probe.style.textTransform = 'uppercase';
    titleEl.appendChild(probe);

    const range = document.createRange();
    range.selectNodeContents(probe);
    const cap = range.getBoundingClientRect().height;
    probe.remove();

    if (cap > 0) iconSize = Math.round(cap * 0.93);
  }

  onMount(() => {
    updateScrollState();
    measureTitleCapHeight();
    if (document.fonts?.ready) {
      document.fonts.ready.then(measureTitleCapHeight);
    }
    window.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', measureTitleCapHeight);
    return () => {
      window.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', measureTitleCapHeight);
    };
  });
</script>

<header
  class="navbar"
  class:visible={navbarVisible}
  class:always-visible={alwaysVisible}
  class:reveal-at-cards={revealAtCards}
  class:menu-open={menuOpen}
>
  <div class="navbar-inner" style="--navbar-icon-size: {iconSize}px">
    <div class="navbar-row">
      <a bind:this={titleEl} href="/prototypes/home#sezioni" class="navbar-title">Quante facce ha una medaglia?</a>
      <button
        type="button"
        class="menu-button"
        aria-expanded={menuOpen}
        aria-controls="site-menu"
        aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'}
        onclick={toggleMenu}
      >
        {#if menuOpen}
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 4L20 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M20 4L4 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2 4H22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M2 12H22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M2 20H22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        {/if}
      </button>
    </div>
  </div>
</header>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="menu-overlay"
  class:open={menuOpen}
  aria-hidden={!menuOpen}
  onclick={(e) => e.target === e.currentTarget && closeMenu()}
>
  <nav id="site-menu" class="menu-panel" aria-hidden={!menuOpen}>
    <ul class="menu-list">
      {#each menuItems as item (item.label)}
        <li>
          <a href={item.href} class="menu-link" onclick={closeMenu}>
            {item.label}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
</div>

<style>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    max-width: 100vw;
    z-index: 10;
    box-sizing: border-box;
    background: transparent;
    pointer-events: none;
    transform: translateY(-100%);
    opacity: 0;
    --navbar-padding-x: clamp(24px, 5.23vw, 79px);
    --navbar-padding-top: clamp(16px, 2.51vw, 38px);
    transition:
      transform 0.35s ease,
      opacity 0.35s ease;
  }

  .navbar.visible {
    transform: translateY(0);
    opacity: 1;
  }

  .navbar.menu-open {
    z-index: 201;
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }

  .navbar.always-visible {
    z-index: 200;
  }

  .navbar.reveal-at-cards.visible {
    z-index: 200;
  }

  .navbar.always-visible ~ .menu-overlay,
  .navbar.reveal-at-cards.visible ~ .menu-overlay {
    z-index: 199;
  }

  @media (min-width: 769px) {
    .navbar.always-visible {
      transform: translateY(0);
      opacity: 1;
    }

    .navbar.always-visible.menu-open {
      opacity: 1;
    }
  }

  .navbar-inner {
    --navbar-title-size: 20px;
    width: 100%;
    padding: var(--navbar-padding-top) var(--navbar-padding-x) 0;
    box-sizing: border-box;
    pointer-events: auto;
  }

  .navbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
  }

  .navbar-title {
    font-family: 'PP Formula Condensed', var(--font-title);
    font-size: var(--navbar-title-size);
    font-weight: 900;
    font-variation-settings: 'wght' 900;
    font-stretch: condensed;
    line-height: 1;
    text-transform: uppercase;
    color: #161a1f;
    text-decoration: none;
    white-space: nowrap;
    min-width: 0;
    margin: 0;
    padding: 0;
    display: block;
    text-box-trim: trim-both;
    text-box-edge: cap alphabetic;
  }

  .navbar-title:hover {
    opacity: 0.85;
  }

  .menu-button {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: var(--navbar-icon-size, 20px);
    height: var(--navbar-icon-size, 20px);
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    color: #161a1f;
    cursor: pointer;
  }

  .menu-button svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .menu-button:focus-visible {
    outline: 2px solid #161a1f;
    outline-offset: 4px;
  }

  .menu-overlay {
    --navbar-padding-x: clamp(24px, 5.23vw, 79px);
    --navbar-padding-top: clamp(16px, 2.51vw, 38px);
    position: fixed;
    inset: 0;
    z-index: 9;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition:
      opacity 0.3s ease,
      visibility 0.3s ease;
  }

  .menu-overlay.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .menu-panel {
    width: 100%;
    padding: 120px 24px 40px;
    box-sizing: border-box;
  }

  .menu-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 21px;
  }

  .menu-link {
    font-family: 'PP Formula Condensed', var(--font-title);
    font-size: 80px;
    font-weight: 900;
    font-variation-settings: 'wght' 900;
    font-stretch: condensed;
    line-height: 1.3;
    letter-spacing: 5.6px;
    text-transform: uppercase;
    color: #161a1f;
    text-decoration: none;
    text-align: center;
    word-break: break-word;
  }

  .menu-link:hover {
    opacity: 0.75;
  }

  .menu-link:focus-visible {
    outline: 2px solid #161a1f;
    outline-offset: 4px;
  }

  @media (max-width: 768px) {
    .navbar.visible,
    .navbar.always-visible {
      transform: translateY(0);
      opacity: 1;
    }

    .navbar:not(.visible):not(.always-visible) {
      transform: translateY(-100%);
      opacity: 0;
    }

    .navbar.menu-open {
      opacity: 1;
    }

    .navbar {
      --navbar-padding-x: 20px;
      --navbar-padding-top: 24px;
    }

    .menu-overlay {
      --navbar-padding-x: 20px;
      --navbar-padding-top: 24px;
    }

    .navbar-inner {
      --navbar-title-size: 20px;
      padding: var(--navbar-padding-top) var(--navbar-padding-x) 0;
    }

    .menu-list {
      gap: 35px;
    }

    .menu-link {
      font-size: 48px;
      letter-spacing: 3.36px;
    }

    .menu-panel {
      padding: 120px 20px 40px;
    }
  }
</style>
