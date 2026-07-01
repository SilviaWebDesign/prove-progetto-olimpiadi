<script>
  import Navbar from '$lib/materiali-home/Navbar.svelte';
  import ScrollytellResponsive from '$lib/materiali-home/scrollytell/ScrollytellResponsive.svelte';
  import { getScrollytellConfig } from '$lib/materiali-home/scrollytell/scrollytellConfig.js';

  const config = getScrollytellConfig('sustainability');
</script>

<Navbar alwaysVisible />
<ScrollytellResponsive {config} />
