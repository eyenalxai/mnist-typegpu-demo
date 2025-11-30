import { WebGPUCanvas } from "@/components/webgpu-canvas"

export default function Page() {
	return (
		<main className="container mx-auto py-8 px-4">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<h1 className="text-4xl font-bold">Conway&apos;s Game of Life</h1>
					<p className="text-gray-600 dark:text-gray-400">
						GPU-accelerated cellular automaton using TypeGPU and WebGPU
					</p>
				</div>
				<WebGPUCanvas />
			</div>
		</main>
	)
}
