<script>
  import Navbar from '$lib/materiali-home/Navbar.svelte';
  import SectionPage from '$lib/materiali-home/SectionPage.svelte';
  import { sections } from '$lib/materiali-home/sections.js';
</script>

<Navbar alwaysVisible />
<SectionPage section={sections.sport} />
