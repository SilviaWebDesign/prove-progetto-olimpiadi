<script>
  import { onMount } from 'svelte';
  import { sectionList } from './sections.js';

  let menuOpen = $state(false);
  let scrolled = $state(false);

  const SCROLL_THRESHOLD = 8;

  function updateScrollState() {
    scrolled = window.scrollY > SCROLL_THRESHOLD;
  }

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

  onMount(() => {
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<header class="navbar" class:visible={scrolled || menuOpen}>
  <div class="navbar-inner">
    <a href="/" class="navbar-title">Quante facce ha una medaglia?</a>
    <button
      type="button"
      class="menu-button"
      aria-expanded={menuOpen}
      aria-controls="site-menu"
      aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'}
      onclick={toggleMenu}
    >
      <img src="/icons/menu.svg" alt="" width="24" height="24" />
    </button>
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
      <li>
        <a href="/" class="menu-link" onclick={closeMenu}>Home</a>
      </li>
      {#each sectionList as section (section.id)}
        <li>
          <a href="/{section.slug}" class="menu-link" onclick={closeMenu}>{section.menuLabel}</a>
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
    transition:
      transform 0.35s ease,
      opacity 0.35s ease;
  }

  .navbar.visible {
    transform: translateY(0);
    opacity: 1;
  }

  :global(html.section-route) .navbar-title {
    color: #000000;
  }

  .navbar-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    min-height: 24px;
    padding: 16px 24px;
    box-sizing: border-box;
    pointer-events: auto;
  }

  .navbar-title {
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: var(--font-title-weight);
    line-height: normal;
    text-transform: uppercase;
    color: #000000;
    text-decoration: none;
    white-space: nowrap;
  }

  .navbar-title:hover {
    opacity: 0.85;
  }

  .menu-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }

  .menu-button:focus-visible {
    outline: 2px solid #000000;
    outline-offset: 4px;
  }

  .menu-overlay {
    position: fixed;
    inset: 0;
    z-index: 8;
    display: flex;
    justify-content: flex-end;
    background: rgba(0, 0, 0, 0.85);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }

  .menu-overlay.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .menu-panel {
    width: min(400px, 100%);
    height: 100%;
    padding: 80px 40px 40px;
    box-sizing: border-box;
  }

  .menu-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .menu-link {
    font-family: var(--font-title);
    font-size: clamp(2rem, 6vw, 3.5rem);
    font-weight: var(--font-title-weight);
    line-height: 1;
    text-transform: uppercase;
    color: #ffffff;
    text-decoration: none;
  }

  .menu-link:hover {
    opacity: 0.75;
  }

  .menu-link:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 4px;
  }

  @media (max-width: 768px) {
    .navbar-inner {
      padding: 16px 20px;
    }

    .navbar-title {
      font-size: 14px;
      white-space: normal;
      max-width: calc(100% - 48px);
    }
  }

  @media (max-width: 480px) {
    .navbar-title {
      font-size: 12px;
    }
  }
</style>
