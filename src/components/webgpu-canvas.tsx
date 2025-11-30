// oxlint-disable max-lines
"use client"

import { useEffect, useRef, useState } from "react"
import { tgpu } from "typegpu"
import * as d from "typegpu/data"
import { Button } from "./ui/button"
import { Switch } from "./ui/switch"

const bindGroupLayoutCompute = tgpu.bindGroupLayout({
	size: {
		storage: d.vec2u,
		access: "readonly"
	},
	current: {
		storage: d.arrayOf(d.u32),
		access: "readonly"
	},
	next: {
		storage: d.arrayOf(d.u32),
		access: "mutable"
	}
})

const bindGroupLayoutRender = tgpu.bindGroupLayout({
	size: {
		uniform: d.vec2u
	}
})

type GameOfLifeContext = {
	root: Awaited<ReturnType<typeof tgpu.init>>
	device: GPUDevice
	context: GPUCanvasContext
	computePipeline: GPUComputePipeline
	renderPipeline: GPURenderPipeline
	render: (swap: boolean) => void
	loop: (swap: boolean) => void
	resetGameData: () => void
	presentationFormat: GPUTextureFormat
}

export function WebGPUCanvas() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [gridSize, setGridSize] = useState(64)
	const [timestep, setTimestep] = useState(15)
	const [workgroupSize, setWorkgroupSize] = useState(16)
	const [paused, setPaused] = useState(false)
	const [isSupported, setIsSupported] = useState(true)
	const [isInitialized, setIsInitialized] = useState(false)
	const gameContextRef = useRef<GameOfLifeContext | null>(null)
	const swapRef = useRef(false)
	const lastRenderTimeRef = useRef(0)

	useEffect(() => {
		if (typeof navigator === "undefined" || navigator.gpu === undefined) {
			setIsSupported(false)
			return
		}

		let mounted = true

		async function initWebGPU() {
			if (!canvasRef.current) return

			try {
				const root = await tgpu.init()
				const device = root.device
				const canvas = canvasRef.current
				const context = canvas.getContext("webgpu")

				if (!context) {
					setIsSupported(false)
					return
				}

				const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

				context.configure({
					device,
					format: presentationFormat,
					alphaMode: "premultiplied"
				})

				const computeShader = device.createShaderModule({
					code: tgpu.resolve({
						template: `
override blockSize = 8;

fn getIndex(x: u32, y: u32) -> u32 {
  let h = size.y;
  let w = size.x;

  return (y % h) * w + (x % w);
}

fn getCell(x: u32, y: u32) -> u32 {
  return current[getIndex(x, y)];
}

fn countNeighbors(x: u32, y: u32) -> u32 {
  return getCell(x - 1, y - 1) + getCell(x, y - 1) + getCell(x + 1, y - 1) +
         getCell(x - 1, y) +                         getCell(x + 1, y) +
         getCell(x - 1, y + 1) + getCell(x, y + 1) + getCell(x + 1, y + 1);
}

@compute @workgroup_size(blockSize, blockSize)
fn main(@builtin(global_invocation_id) grid: vec3u) {
  let x = grid.x;
  let y = grid.y;
  let n = countNeighbors(x, y);
  next[getIndex(x, y)] = select(u32(n == 3u), u32(n == 2u || n == 3u), getCell(x, y) == 1u);
}
`,
						externals: {
							...bindGroupLayoutCompute.bound
						}
					})
				})

				const squareVertexLayout = tgpu.vertexLayout(
					d.arrayOf(d.location(1, d.vec2u)),
					"vertex"
				)

				const cellsVertexLayout = tgpu.vertexLayout(
					d.arrayOf(d.location(0, d.u32)),
					"instance"
				)

				const renderShader = device.createShaderModule({
					code: tgpu.resolve({
						template: `
struct Out {
  @builtin(position) pos: vec4f,
  @location(0) cell: f32,
  @location(1) uv: vec2f,
}

@vertex
fn vert(@builtin(instance_index) i: u32, @location(0) cell: u32, @location(1) pos: vec2u) -> Out {
  let w = size.x;
  let h = size.y;
  let x = (f32(i % w + pos.x) / f32(w) - 0.5) * 2. * f32(w) / f32(max(w, h));
  let y = (f32((i - (i % w)) / w + pos.y) / f32(h) - 0.5) * 2. * f32(h) / f32(max(w, h));

  return Out(
    vec4f(x, y, 0., 1.),
    f32(cell),
    vec2f((x + 1) / 2, (y + 1) / 2)
  );
}

@fragment
fn frag(@location(0) cell: f32, @builtin(position) pos: vec4f, @location(1) uv: vec2f) -> @location(0) vec4f {
  if (cell == 0.) {
    discard;
  }

  return vec4f(
    uv.x / 1.5,
    uv.y / 1.5,
    1 - uv.x / 1.5,
    0.8
  );
}`,
						externals: {
							...bindGroupLayoutRender.bound
						}
					})
				})

				const computePipeline = device.createComputePipeline({
					layout: device.createPipelineLayout({
						bindGroupLayouts: [root.unwrap(bindGroupLayoutCompute)]
					}),
					compute: {
						module: computeShader,
						constants: {
							blockSize: workgroupSize
						}
					}
				})

				const renderPipeline = device.createRenderPipeline({
					layout: device.createPipelineLayout({
						bindGroupLayouts: [root.unwrap(bindGroupLayoutRender)]
					}),
					primitive: {
						topology: "triangle-strip"
					},
					vertex: {
						module: renderShader,
						buffers: [
							root.unwrap(cellsVertexLayout),
							root.unwrap(squareVertexLayout)
						]
					},
					fragment: {
						module: renderShader,
						targets: [
							{
								format: presentationFormat
							}
						]
					}
				})

				if (mounted) {
					gameContextRef.current = {
						root,
						device,
						context,
						computePipeline,
						renderPipeline,
						presentationFormat,
						render: () => {},
						loop: () => {},
						resetGameData: () => {}
					}
					setIsInitialized(true)
				}
			} catch (error) {
				console.error("Failed to initialize WebGPU:", error)
				setIsSupported(false)
			}
		}

		void initWebGPU()

		return () => {
			mounted = false
			if (gameContextRef.current) {
				gameContextRef.current.root.destroy()
				gameContextRef.current = null
			}
		}
	}, [workgroupSize])

	useEffect(() => {
		if (!isInitialized || !gameContextRef.current) return

		const ctx = gameContextRef.current
		const { root, device, context, computePipeline, renderPipeline } = ctx

		const resetGameData = () => {
			swapRef.current = false

			const sizeBuffer = root
				.createBuffer(d.vec2u, d.vec2u(gridSize, gridSize))
				.$usage("uniform", "storage")

			const length = gridSize * gridSize
			const cells = Array.from({ length })
				.fill(0)
				.map(() => (Math.random() < 0.25 ? 1 : 0))

			const buffer0 = root
				.createBuffer(d.arrayOf(d.u32, length), cells)
				.$usage("storage", "vertex")

			const buffer1 = root
				.createBuffer(d.arrayOf(d.u32, length))
				.$usage("storage", "vertex")

			const bindGroup0 = root.createBindGroup(bindGroupLayoutCompute, {
				size: sizeBuffer,
				current: buffer0,
				next: buffer1
			})

			const bindGroup1 = root.createBindGroup(bindGroupLayoutCompute, {
				size: sizeBuffer,
				current: buffer1,
				next: buffer0
			})

			const uniformBindGroup = root.createBindGroup(bindGroupLayoutRender, {
				size: sizeBuffer
			})

			const squareBuffer = root
				.createBuffer(d.arrayOf(d.u32, 8), [0, 0, 1, 0, 0, 1, 1, 1])
				.$usage("vertex")

			const render = (swap: boolean) => {
				const view = context.getCurrentTexture().createView()
				const renderPass: GPURenderPassDescriptor = {
					colorAttachments: [
						{
							view,
							loadOp: "clear",
							storeOp: "store"
						}
					]
				}

				const commandEncoder = device.createCommandEncoder()
				const passEncoderCompute = commandEncoder.beginComputePass()

				passEncoderCompute.setPipeline(computePipeline)
				passEncoderCompute.setBindGroup(
					0,
					root.unwrap(swap ? bindGroup1 : bindGroup0)
				)

				passEncoderCompute.dispatchWorkgroups(
					gridSize / workgroupSize,
					gridSize / workgroupSize
				)
				passEncoderCompute.end()

				const passEncoderRender = commandEncoder.beginRenderPass(renderPass)
				passEncoderRender.setPipeline(renderPipeline)

				passEncoderRender.setVertexBuffer(
					0,
					root.unwrap(swap ? buffer1 : buffer0)
				)
				passEncoderRender.setVertexBuffer(1, root.unwrap(squareBuffer))
				passEncoderRender.setBindGroup(0, root.unwrap(uniformBindGroup))

				passEncoderRender.draw(4, length)
				passEncoderRender.end()
				device.queue.submit([commandEncoder.finish()])
			}

			const loop = () => {
				requestAnimationFrame(() => {
					const now = performance.now()
					if (!paused && now - lastRenderTimeRef.current >= timestep) {
						render(swapRef.current)
						swapRef.current = !swapRef.current
						lastRenderTimeRef.current = now
					}
					loop()
				})
			}

			lastRenderTimeRef.current = performance.now()
			loop()
		}

		resetGameData()
	}, [isInitialized, gridSize, workgroupSize, paused, timestep])

	const handleReset = () => {
		if (!gameContextRef.current) return
		setIsInitialized(false)
		setTimeout(() => setIsInitialized(true), 0)
	}

	if (!isSupported) {
		return (
			<div className="flex flex-col items-center justify-center p-8 border border-red-500 rounded-lg bg-red-50 dark:bg-red-950">
				<h2 className="text-xl font-bold text-red-700 dark:text-red-300">
					WebGPU Not Supported
				</h2>
				<p className="mt-2 text-red-600 dark:text-red-400">
					Your browser does not support WebGPU. Please use a compatible browser
					like Chrome or Edge.
				</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-6">
			<canvas
				ref={canvasRef}
				width={800}
				height={800}
				className="border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg"
			/>

			<div className="flex flex-col gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
				<div className="flex flex-col gap-2">
					<label htmlFor="grid-size" className="text-sm font-medium">
						Grid Size: {gridSize}x{gridSize}
					</label>
					<select
						id="grid-size"
						value={gridSize}
						onChange={(e) => setGridSize(Number(e.target.value))}
						className="w-full p-2 border rounded"
						disabled={!isInitialized}
					>
						{[16, 32, 64, 128, 256, 512, 1024].map((size) => (
							<option key={size} value={size}>
								{size}
							</option>
						))}
					</select>
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="timestep" className="text-sm font-medium">
						Timestep (ms): {timestep}
					</label>
					<input
						id="timestep"
						type="range"
						min={15}
						max={100}
						step={1}
						value={timestep}
						onChange={(e) => setTimestep(Number(e.target.value))}
						className="w-full"
						disabled={!isInitialized}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="workgroup-size" className="text-sm font-medium">
						Workgroup Size: {workgroupSize}
					</label>
					<select
						id="workgroup-size"
						value={workgroupSize}
						onChange={(e) => setWorkgroupSize(Number(e.target.value))}
						className="w-full p-2 border rounded"
						disabled={!isInitialized}
					>
						{[1, 2, 4, 8, 16].map((size) => (
							<option key={size} value={size}>
								{size}
							</option>
						))}
					</select>
				</div>

				<div className="flex items-center justify-between gap-4">
					<label htmlFor="pause" className="text-sm font-medium">
						Pause
					</label>
					<Switch
						id="pause"
						checked={paused}
						onCheckedChange={setPaused}
						disabled={!isInitialized}
					/>
				</div>

				<Button onClick={handleReset} disabled={!isInitialized}>
					Reset
				</Button>
			</div>
		</div>
	)
}
