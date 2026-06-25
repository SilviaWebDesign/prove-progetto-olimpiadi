<script>
  import { onMount } from 'svelte';
  import { getSectionHref } from './sections.js';

  /** @type {{ alwaysVisible?: boolean }} */
  let { alwaysVisible = false } = $props();

  let menuOpen = $state(false);
  let scrolled = $state(false);

  const SCROLL_THRESHOLD = 8;

  /** @type {{ label: string, href: string }[]} */
  const menuItems = [
    { label: 'home', href: '/prototypes/home' },
    { label: 'sostenibilità', href: getSectionHref('sustainability') },
    { label: 'sport', href: getSectionHref('sport') },
    { label: 'infrastrutture', href: getSectionHref('infrastructure') },
    { label: 'about', href: '/prototypes/home' },
  ];

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

<header
  class="navbar"
  class:visible={alwaysVisible || scrolled || menuOpen}
  class:always-visible={alwaysVisible}
  class:menu-open={menuOpen}
>
  <div class="navbar-inner">
    <a href="/prototypes/home#sezioni" class="navbar-title">Quante facce ha una medaglia?</a>
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
  <button
    type="button"
    class="menu-close"
    aria-label="Chiudi menu"
    onclick={closeMenu}
  >
    <img src="/icons/menu.svg" alt="" width="24" height="24" />
  </button>

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
    transition:
      transform 0.35s ease,
      opacity 0.35s ease;
  }

  .navbar.visible {
    transform: translateY(0);
    opacity: 1;
  }

  .navbar.menu-open {
    opacity: 0;
    pointer-events: none;
  }

  .navbar.always-visible {
    z-index: 200;
  }

  .navbar.always-visible ~ .menu-overlay {
    z-index: 199;
  }

  @media (min-width: 769px) {
    .navbar.always-visible {
      transform: translateY(0);
      opacity: 1;
    }

    .navbar.always-visible.menu-open {
      opacity: 0;
    }
  }

  .navbar-inner {
    --navbar-control-height: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    min-height: var(--navbar-control-height);
    padding: 16px 6vw;
    box-sizing: border-box;
    pointer-events: auto;
    gap: 12px;
  }

  .navbar-title {
    font-family: 'PP Formula Condensed', var(--font-title);
    font-size: var(--navbar-control-height);
    font-weight: 900;
    font-variation-settings: 'wght' 900;
    font-stretch: condensed;
    line-height: 1;
    height: var(--navbar-control-height);
    text-transform: uppercase;
    color: #161a1f;
    text-decoration: none;
    white-space: nowrap;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .navbar-title:hover {
    opacity: 0.85;
  }

  .menu-button {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: var(--navbar-control-height);
    height: var(--navbar-control-height);
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }

  .menu-button img {
    display: block;
    width: var(--navbar-control-height);
    height: var(--navbar-control-height);
  }

  .menu-button:focus-visible {
    outline: 2px solid #161a1f;
    outline-offset: 4px;
  }

  .menu-overlay {
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

  .menu-close {
    position: absolute;
    top: 40px;
    right: 5.35vw;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    z-index: 1;
  }

  .menu-close img {
    display: block;
    width: 24px;
    height: 24px;
  }

  .menu-close:focus-visible {
    outline: 2px solid #161a1f;
    outline-offset: 4px;
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
    .navbar {
      transform: translateY(0);
      opacity: 1;
    }

    .navbar.menu-open {
      opacity: 0;
    }

    .navbar-inner {
      --navbar-control-height: 20px;
      padding: 16px 6vw;
    }

    .menu-close {
      top: 67px;
      right: 28px;
    }

    .menu-list {
      gap: 35px;
    }

    .menu-link {
      font-size: 48px;
      letter-spacing: 3.36px;
    }
  }
</style>
