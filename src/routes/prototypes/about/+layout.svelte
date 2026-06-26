<script>
  let { children } = $props();
</script>

{@render children()}

<style>
  :global(:root) {
    --font-title: sans-serif;

    --glass-bg: rgba(255, 255, 255, 0.55);
    --glass-bg-hover: rgba(255, 255, 255, 0.82);
    --glass-bg-emphasis: rgba(255, 255, 255, 0.7);
    --glass-border: rgba(22, 26, 31, 0.22);
    --glass-shadow: 0 2px 24px rgba(0, 0, 0, 0.06);
    --glass-rim: rgba(255, 255, 255, 0.65);
  }

  :global(.glass-surface) {
    background: var(--glass-bg);
    border: 2px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
  }
</style>
