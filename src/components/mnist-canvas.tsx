// oxlint-disable max-lines
"use client"

import { useEffect, useRef, useState } from "react"
import { tgpu } from "typegpu"
import * as d from "typegpu/data"
import * as std from "typegpu/std"
import { ioLayout, type Network, weightsBiasesLayout } from "@/lib/mnist/data"
import { downloadLayers } from "@/lib/mnist/helpers"

const CANVAS_SIZE = 280
const GRID_SIZE = 28

type PredictionBar = {
	label: number
	confidence: number
	isHighlighted: boolean
}

const drawLine = (
	ctx: CanvasRenderingContext2D,
	from: { x: number; y: number },
	to: { x: number; y: number }
) => {
	ctx.strokeStyle = "white"
	ctx.lineWidth = 20
	ctx.lineCap = "round"
	ctx.lineJoin = "round"
	ctx.beginPath()
	ctx.moveTo(from.x, from.y)
	ctx.lineTo(to.x, to.y)
	ctx.stroke()
}

export function MNISTCanvas() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isSupported, setIsSupported] = useState(true)
	const [predictions, setPredictions] = useState<PredictionBar[]>(
		Array.from({ length: 10 }, (_, i) => ({
			label: i,
			confidence: 0,
			isHighlighted: false
		}))
	)
	const [inferenceTime, setInferenceTime] = useState<string>("-")
	const [subgroupsStatus, setSubgroupsStatus] = useState<string>("-")
	const [predictionLabel, setPredictionLabel] = useState("Predictions (-.--ms)")
	const networkRef = useRef<Network | null>(null)
	const isDrawingRef = useRef(false)
	const lastPosRef = useRef<{ x: number; y: number } | null>(null)

	useEffect(() => {
		if (typeof navigator === "undefined" || navigator.gpu === undefined) {
			setIsSupported(false)
			return
		}

		let mounted = true

		async function initMNIST() {
			try {
				const root = await tgpu.init({
					device: {
						optionalFeatures: ["timestamp-query", "subgroups"]
					}
				})

				const hasSubgroups = root.enabledFeatures.has("subgroups")
				setSubgroupsStatus(hasSubgroups ? "enabled" : "disabled")

				const layersData = await downloadLayers(root)

				const relu = tgpu.fn(
					[d.f32],
					d.f32
				)((x) => {
					"use gpu"
					return std.max(0, x)
				})

				const defaultCompute = tgpu["~unstable"].computeFn({
					in: {
						gid: d.builtin.globalInvocationId
					},
					workgroupSize: [1]
				})(({ gid }) => {
					"use gpu"
					const inputSize = ioLayout.$.input.length

					const i = gid.x
					const weightsOffset = i * inputSize
					let sum = d.f32()

					for (let j = d.u32(); j < inputSize; j++) {
						sum = std.fma(
							ioLayout.$.input[j],
							weightsBiasesLayout.$.weights[weightsOffset + j],
							sum
						)
					}

					const total = sum + weightsBiasesLayout.$.biases[i]
					ioLayout.$.output[i] = relu(total)
				})

				const pipeline = root["~unstable"]
					.withCompute(defaultCompute)
					.createPipeline()

				const buffers = layersData.map(([weights, biases]) => {
					if (weights.shape[1] !== biases.shape[0]) {
						throw new Error(
							`Shape mismatch: ${weights.shape} and ${biases.shape}`
						)
					}

					return {
						weights: weights.buffer,
						biases: biases.buffer,
						state: root
							.createBuffer(d.arrayOf(d.f32, biases.shape[0]))
							.$usage("storage")
					}
				})

				const input = root
					.createBuffer(d.arrayOf(d.f32, layersData.at(0)?.[0].shape[0] ?? 0))
					.$usage("storage")
				const output = buffers.at(-1)?.state ?? buffers[0].state

				const ioBindGroups = buffers.map((_, i) =>
					root.createBindGroup(ioLayout, {
						input: i === 0 ? input : buffers[i - 1].state,
						output: buffers[i].state
					})
				)

				const weightsBindGroups = buffers.map((layer) =>
					root.createBindGroup(weightsBiasesLayout, {
						weights: layer.weights,
						biases: layer.biases
					})
				)

				const inference = async (data: number[]): Promise<number[]> => {
					if (data.length !== layersData[0][0].shape[0]) {
						throw new Error(
							`Data length ${data.length} does not match input shape ${layersData[0][0].shape[0]}`
						)
					}

					input.write(data)

					for (let i = 0; i < buffers.length; i++) {
						const boundPipeline = pipeline
							.with(ioBindGroups[i])
							.with(weightsBindGroups[i])

						boundPipeline.dispatchWorkgroups(
							buffers[i].biases.dataType.elementCount
						)
					}

					return await output.read()
				}

				const network: Network = {
					layers: buffers,
					input,
					output,
					inference
				}

				if (mounted) {
					networkRef.current = network
					setIsLoading(false)
				}
			} catch (error) {
				console.error("Failed to initialize MNIST:", error)
				setIsSupported(false)
			}
		}

		void initMNIST()

		return () => {
			mounted = false
		}
	}, [])

	const getCanvasCoordinates = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	): { x: number; y: number } => {
		const canvas = canvasRef.current
		if (!canvas) return { x: 0, y: 0 }

		const rect = canvas.getBoundingClientRect()
		const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
		const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

		return {
			x: ((clientX - rect.left) / rect.width) * CANVAS_SIZE,
			y: ((clientY - rect.top) / rect.height) * CANVAS_SIZE
		}
	}

	const handleDrawStart = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		e.preventDefault()
		isDrawingRef.current = true
		const pos = getCanvasCoordinates(e)
		lastPosRef.current = pos

		const canvas = canvasRef.current
		const ctx = canvas?.getContext("2d")
		if (ctx) {
			drawLine(ctx, pos, pos)
		}
	}

	const handleDrawMove = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		e.preventDefault()
		if (!isDrawingRef.current || !lastPosRef.current) return

		const canvas = canvasRef.current
		const ctx = canvas?.getContext("2d")
		if (!ctx) return

		const pos = getCanvasCoordinates(e)
		drawLine(ctx, lastPosRef.current, pos)
		lastPosRef.current = pos
	}

	const handleDrawEnd = async () => {
		if (!isDrawingRef.current) return
		isDrawingRef.current = false
		lastPosRef.current = null

		await runInference()
	}

	const centerImage = (data: number[]): number[] => {
		const mass = data.reduce((acc, value) => acc + value, 0)
		if (mass === 0) return data

		const x =
			data.reduce((acc, value, i) => acc + value * (i % GRID_SIZE), 0) / mass
		const y =
			data.reduce(
				(acc, value, i) => acc + value * Math.floor(i / GRID_SIZE),
				0
			) / mass

		const offsetX = Math.round(GRID_SIZE / 2 - x)
		const offsetY = Math.round(GRID_SIZE / 2 - y)

		const newData = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => 0)

		for (let i = 0; i < GRID_SIZE; i++) {
			for (let j = 0; j < GRID_SIZE; j++) {
				const index = i * GRID_SIZE + j
				const newIndex = (i + offsetY) * GRID_SIZE + j + offsetX
				if (newIndex >= 0 && newIndex < GRID_SIZE * GRID_SIZE) {
					newData[newIndex] = data[index]
				}
			}
		}

		return newData
	}

	const runInference = async () => {
		const canvas = canvasRef.current
		const network = networkRef.current
		if (!canvas || !network) return

		const ctx = canvas.getContext("2d")
		if (!ctx) return

		const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE)
		const downscaled = new Float32Array(GRID_SIZE * GRID_SIZE)

		const scale = CANVAS_SIZE / GRID_SIZE
		for (let y = 0; y < GRID_SIZE; y++) {
			for (let x = 0; x < GRID_SIZE; x++) {
				let sum = 0
				let count = 0

				for (let dy = 0; dy < scale; dy++) {
					for (let dx = 0; dx < scale; dx++) {
						const sx = Math.floor(x * scale + dx)
						const sy = Math.floor(y * scale + dy)
						const idx = (sy * CANVAS_SIZE + sx) * 4
						sum += imageData.data[idx]
						count++
					}
				}

				downscaled[y * GRID_SIZE + x] = sum / count
			}
		}

		const centered = centerImage(Array.from(downscaled))
		const normalized = centered.map((x) => (x / 255) * 3.24 - 0.42)

		const startTime = performance.now()
		const result = await network.inference(normalized)
		const endTime = performance.now()
		const duration = endTime - startTime

		setInferenceTime(`${duration.toFixed(2)}ms`)
		setPredictionLabel(`Predictions (${duration.toFixed(2)}ms)`)

		const maxValue = Math.max(...result)
		const maxIndex =
			result.indexOf(maxValue) === -1 ? 0 : result.indexOf(maxValue)

		const total = result.reduce((sum, val) => sum + Math.exp(val), 0)
		const softmax = result.map((val) => Math.exp(val) / total)

		setPredictions(
			softmax.map((confidence, i) => ({
				label: i,
				confidence,
				isHighlighted: i === maxIndex
			}))
		)
	}

	const handleClear = () => {
		const canvas = canvasRef.current
		if (!canvas) return

		const ctx = canvas.getContext("2d")
		if (!ctx) return

		ctx.fillStyle = "black"
		ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

		setPredictions(
			Array.from({ length: 10 }, (_, i) => ({
				label: i,
				confidence: 0,
				isHighlighted: false
			}))
		)
		setInferenceTime("-")
		setPredictionLabel("Predictions (-.--ms)")
	}

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		const ctx = canvas.getContext("2d")
		if (!ctx) return

		ctx.fillStyle = "black"
		ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
	}, [])

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

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8 text-3xl">
				🤖 Downloading the model...
			</div>
		)
	}

	return (
		<div className="flex flex-col lg:flex-row gap-4 items-start">
			<div className="relative">
				<canvas
					ref={canvasRef}
					width={CANVAS_SIZE}
					height={CANVAS_SIZE}
					className="border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg cursor-crosshair touch-none"
					onMouseDown={handleDrawStart}
					onMouseMove={handleDrawMove}
					onMouseUp={handleDrawEnd}
					onMouseLeave={handleDrawEnd}
					onTouchStart={handleDrawStart}
					onTouchMove={handleDrawMove}
					onTouchEnd={handleDrawEnd}
				/>
				<button
					type="button"
					onClick={handleClear}
					className="mt-4 w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
				>
					Clear
				</button>
			</div>

			<div className="flex flex-col w-full lg:w-[30%] items-center justify-center p-2 gap-4">
				<div className="mb-2 text-xl">{predictionLabel}</div>

				<div className="flex flex-col w-full justify-start gap-1">
					{predictions.map((pred) => (
						<div
							key={pred.label}
							className="relative h-5 w-full font-mono text-base bg-linear-to-r from-transparent to-[#e6e6f2] rounded-full"
						>
							<div
								className="absolute h-full left-8 rounded-full bg-[#dadaed] transition-all duration-200 ease-in-out"
								style={{
									width: `calc((100% - 2rem) * ${pred.confidence})`
								}}
							/>
							<div
								className="absolute h-full left-8 rounded-full bg-linear-to-r from-[#c464ff] to-[#1d72f0] transition-all duration-200 ease-in-out"
								style={{
									width: `calc((100% - 2rem) * ${pred.confidence})`,
									opacity: pred.isHighlighted ? 1 : 0
								}}
							/>
							<span className="absolute left-2 top-0 leading-5">
								{pred.label}
							</span>
						</div>
					))}
				</div>

				<div className="w-full p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm flex flex-col gap-1">
					<div className="flex justify-between text-gray-600 dark:text-gray-400">
						<span>Subgroups:</span>
						<span
							className={`font-mono font-semibold ${
								subgroupsStatus === "enabled"
									? "text-green-600 dark:text-green-400"
									: "text-red-600 dark:text-red-400"
							}`}
						>
							{subgroupsStatus}
						</span>
					</div>
					<div className="flex justify-between text-gray-600 dark:text-gray-400">
						<span>Inference:</span>
						<span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
							{inferenceTime}
						</span>
					</div>
				</div>
			</div>
		</div>
	)
}
