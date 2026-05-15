<script lang="ts">
	import { T } from '@threlte/core';
	import { useGltf } from '@threlte/extras';
	import * as THREE from 'three';

	let { path, opacity, scala }: { path: string; opacity: number; scala: number } = $props();

	const gltf = useGltf(path);

	let scena = $state<THREE.Group | undefined>(undefined);

	$effect(() => {
		const unsub = gltf.subscribe((data: any) => {
			if (data?.scene) scena = data.scene;
		});
		return unsub;
	});

	$effect(() => {
		if (!scena) return;
		const op = opacity;
		scena.traverse((node: THREE.Object3D) => {
			if ((node as THREE.Mesh).isMesh) {
				const mesh = node as THREE.Mesh;
				const mats = Array.isArray(mesh.material)
					? (mesh.material as THREE.Material[])
					: [mesh.material as THREE.Material];
				for (const mat of mats) {
					mat.transparent = true;
					(mat as THREE.MeshStandardMaterial).opacity = op;
					mat.needsUpdate = true;
				}
			}
		});
	});
</script>

{#if scena}
	<T.Group scale={[scala, scala, scala]}>
		<T is={scena} dispose={false} />
	</T.Group>
{/if}
