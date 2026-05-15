<script lang="ts">
	import { Canvas, T } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import AlberoGlb from './AlberoGlb.svelte';

	type Stato = 'NEUTRO' | 'TUTTO_POSITIVO' | 'MAGG_POSITIVO' | 'MAGG_NEGATIVO' | 'TUTTO_NEGATIVO';

	let { stato }: { stato: Stato } = $props();
</script>

<div class="contenitore">
	<div class="canvas-wrapper">
		<!-- alpha:true è default in Threlte (clearAlpha=0), quindi il canvas è trasparente
		     e il gradiente CSS sotto è visibile nelle aree non coperte da oggetti 3D -->
		<Canvas shadows={true}>
			<T.PerspectiveCamera
				makeDefault
				position={[5, 4, 7]}
				fov={50}
				oncreate={(ref) => ref.lookAt(0, 1.5, 0)}
			/>

			<T.AmbientLight intensity={0.25} />
			<T.HemisphereLight args={['#a8d8ff', '#3a2a1a', 0.6]} />

			<T.DirectionalLight
				position={[6, 10, 4]}
				intensity={1.3}
				color="#fff4e0"
				castShadow={true}
				shadow.mapSize.width={2048}
				shadow.mapSize.height={2048}
				shadow.camera.left={-5}
				shadow.camera.right={5}
				shadow.camera.top={5}
				shadow.camera.bottom={-5}
				shadow.camera.near={0.5}
				shadow.camera.far={30}
				shadow.bias={-0.0005}
			/>

			<OrbitControls oncreate={(ref) => { ref.target.set(0, 1.5, 0); ref.update(); }} />

			<!-- Terreno: disco più grande e più liscio -->
			<T.Mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={true}>
				<T.CircleGeometry args={[5, 96]} />
				<T.MeshStandardMaterial color="#8a9b6e" roughness={0.95} metalness={0} />
			</T.Mesh>

			<!-- Sasso 1 -->
			<T.Mesh
				position={[1.8, 0.15, 0.8]}
				rotation={[0.3, 0.5, 0.1]}
				scale={[0.35, 0.25, 0.3]}
				castShadow={true}
				receiveShadow={true}
			>
				<T.IcosahedronGeometry args={[1, 0]} />
				<T.MeshStandardMaterial color="#8a8478" roughness={0.9} metalness={0} />
			</T.Mesh>

			<!-- Sasso 2 -->
			<T.Mesh
				position={[-1.5, 0.1, 1.5]}
				rotation={[0.1, 1.2, 0.4]}
				scale={[0.22, 0.18, 0.22]}
				castShadow={true}
				receiveShadow={true}
			>
				<T.IcosahedronGeometry args={[1, 0]} />
				<T.MeshStandardMaterial color="#9a9085" roughness={0.9} metalness={0} />
			</T.Mesh>

			<!-- Sasso 3 -->
			<T.Mesh
				position={[1.2, 0.08, -1.7]}
				rotation={[0.2, 0.7, 0.3]}
				scale={[0.18, 0.14, 0.18]}
				castShadow={true}
				receiveShadow={true}
			>
				<T.IcosahedronGeometry args={[1, 0]} />
				<T.MeshStandardMaterial color="#807870" roughness={0.9} metalness={0} />
			</T.Mesh>

			<AlberoGlb {stato} />
		</Canvas>
	</div>
	<span class="label">{stato}</span>
</div>

<style>
	.contenitore {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.canvas-wrapper {
		width: 500px;
		height: 500px;
		box-sizing: border-box;
		overflow: hidden;
		border: 1px solid #ccc;
		border-radius: 8px;
		background: linear-gradient(180deg, #a8d8ff 0%, #ffd4b8 70%, #ffc8c8 100%);
	}

	.canvas-wrapper :global(canvas) {
		display: block;
	}

	.label {
		font-size: 0.75rem;
		font-family: monospace;
		color: #888;
		letter-spacing: 0.05em;
	}
</style>
