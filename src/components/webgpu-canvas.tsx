"use client"

import { useEffect, useRef, useState } from "react"
import { tgpu } from "typegpu"
import * as d from "typegpu/data"

const Span = d.struct({
	x: d.u32,
	y: d.u32
})

const layout = tgpu
	.bindGroupLayout({
		span: { uniform: Span }
	})
	.$idx(0)

const shaderCode = tgpu.resolve({
	template: /* wgsl */ `
    struct VertexOutput {
      @builtin(position) pos: vec4f,
      @location(0) uv: vec2f,
    }

    @vertex
    fn main_vertex(
      @builtin(vertex_index) vertexIndex: u32,
    ) -> VertexOutput {
      var pos = array<vec2f, 4>(
        vec2(1, 1), // top-right
        vec2(-1, 1), // top-left
        vec2(1, -1), // bottom-right
        vec2(-1, -1) // bottom-left
      );

      var out: VertexOutput;
      out.pos = vec4f(pos[vertexIndex], 0.0, 1.0);
      out.uv = (pos[vertexIndex] + 1) * 0.5;
      return out;
    }

    @fragment
    fn main_fragment(
      @location(0) uv: vec2f,
    ) -> @location(0) vec4f {
      let red = floor(uv.x * f32(_EXT_.span.x)) / f32(_EXT_.span.x);
      let green = floor(uv.y * f32(_EXT_.span.y)) / f32(_EXT_.span.y);
      return vec4(red, green, 0.5, 1.0);
    }
  `,
	externals: {
		_EXT_: { span: layout.bound.span }
	}
})

type WebGPUContext = {
	root: Awaited<ReturnType<typeof tgpu.init>>
	device: GPUDevice
	context: GPUCanvasContext
	pipeline: GPURenderPipeline
	spanBuffer: ReturnType<Awaited<ReturnType<typeof tgpu.init>>["createBuffer"]>
	bindGroup: ReturnType<
		Awaited<ReturnType<typeof tgpu.init>>["createBindGroup"]
	>
}

export function WebGPUCanvas() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [spanX, setSpanX] = useState(10)
	const [spanY, setSpanY] = useState(10)
	const [isSupported, setIsSupported] = useState(true)
	const [isInitialized, setIsInitialized] = useState(false)
	const gpuContextRef = useRef<WebGPUContext | null>(null)

	useEffect(() => {
		if (typeof navigator === "undefined" || !navigator.gpu) {
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
					device: device,
					format: presentationFormat,
					alphaMode: "premultiplied"
				})

				const shaderModule = device.createShaderModule({ code: shaderCode })

				const pipeline = device.createRenderPipeline({
					layout: device.createPipelineLayout({
						bindGroupLayouts: [root.unwrap(layout)]
					}),
					vertex: {
						module: shaderModule
					},
					fragment: {
						module: shaderModule,
						targets: [
							{
								format: presentationFormat
							}
						]
					},
					primitive: {
						topology: "triangle-strip"
					}
				})

				const spanBuffer = root
					.createBuffer(Span, { x: 10, y: 10 })
					.$usage("uniform")

				const bindGroup = root.createBindGroup(layout, {
					span: spanBuffer
				})

				if (mounted) {
					gpuContextRef.current = {
						root,
						device,
						context,
						pipeline,
						spanBuffer,
						bindGroup
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
			if (gpuContextRef.current) {
				gpuContextRef.current.root.destroy()
				gpuContextRef.current = null
			}
		}
	}, [])

	useEffect(() => {
		if (!isInitialized || !gpuContextRef.current) return

		const { device, context, pipeline, spanBuffer, bindGroup, root } =
			gpuContextRef.current

		function draw(spanXValue: number, spanYValue: number) {
			const textureView = context.getCurrentTexture().createView()

			const renderPassDescriptor: GPURenderPassDescriptor = {
				colorAttachments: [
					{
						view: textureView,
						clearValue: [0, 0, 0, 0],
						loadOp: "clear",
						storeOp: "store"
					}
				]
			}

			spanBuffer.write({ x: spanXValue, y: spanYValue })

			const commandEncoder = device.createCommandEncoder()
			const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)

			passEncoder.setPipeline(pipeline)
			passEncoder.setBindGroup(0, root.unwrap(bindGroup))
			passEncoder.draw(4)
			passEncoder.end()

			device.queue.submit([commandEncoder.finish()])
		}

		draw(spanX, spanY)
	}, [spanX, spanY, isInitialized])

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
				height={600}
				className="border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg"
			/>

			<div className="flex flex-col gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
				<div className="flex flex-col gap-2">
					<label htmlFor="span-x" className="text-sm font-medium">
						X Span ↔️: {spanX}
					</label>
					<input
						id="span-x"
						type="range"
						min={0}
						max={20}
						step={1}
						value={spanX}
						onChange={(e) => setSpanX(Number(e.target.value))}
						className="w-full"
						disabled={!isInitialized}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="span-y" className="text-sm font-medium">
						Y Span ↕️: {spanY}
					</label>
					<input
						id="span-y"
						type="range"
						min={0}
						max={20}
						step={1}
						value={spanY}
						onChange={(e) => setSpanY(Number(e.target.value))}
						className="w-full"
						disabled={!isInitialized}
					/>
				</div>
			</div>
		</div>
	)
}
