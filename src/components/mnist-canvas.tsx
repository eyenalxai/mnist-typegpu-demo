"use client"

import { useRef } from "react"
import { useMNISTInference } from "@/hooks/use-mnist-inference"
import { DrawingCanvas } from "./mnist/drawing-canvas"
import { NetworkStats } from "./mnist/network-stats"
import { PredictionBars } from "./mnist/prediction-bars"

export function MNISTCanvas() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const {
		isLoading,
		isSupported,
		predictions,
		inferenceTime,
		subgroupsStatus,
		predictionLabel,
		runInference,
		resetPredictions
	} = useMNISTInference()

	const handleDrawEnd = async () => {
		const canvas = canvasRef.current
		if (!canvas) return
		await runInference(canvas)
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

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8 text-3xl">
				🤖 Downloading the model...
			</div>
		)
	}

	return (
		<div className="flex flex-col lg:flex-row gap-4 items-start">
			<DrawingCanvas
				ref={canvasRef}
				onDrawEnd={handleDrawEnd}
				onClear={resetPredictions}
			/>

			<div className="flex flex-col w-full lg:w-[30%] gap-4">
				<PredictionBars predictions={predictions} label={predictionLabel} />
				<NetworkStats
					subgroupsStatus={subgroupsStatus}
					inferenceTime={inferenceTime}
				/>
			</div>
		</div>
	)
}
