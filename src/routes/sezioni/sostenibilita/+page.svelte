<script>
  import Navbar from '$lib/materiali-home/Navbar.svelte';
  import SectionScrollytell from '$lib/materiali-home/scrollytell/SectionScrollytell.svelte';
  import { getScrollytellConfig } from '$lib/materiali-home/scrollytell/scrollytellConfig.js';

  const config = getScrollytellConfig('sustainability');
</script>

<Navbar alwaysVisible />
<SectionScrollytell {config} />
