"use client"

import { useRef } from "react"
import { DrawingCanvas } from "@/components/mnist/drawing-canvas"
import { PredictionBars } from "@/components/mnist/prediction-bars"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { useMNISTInference } from "@/hooks/use-mnist-inference"
import { NetworkStats } from "./mnist/network-stats"

export function MNISTCanvas() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const {
		isLoading,
		isSupported,
		predictions,
		inferenceTime,
		subgroupsStatus,
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
			<Alert variant="error">
				<AlertTitle>WebGPU Not Supported</AlertTitle>
				<AlertDescription>
					Your browser does not support WebGPU. Please use a compatible browser
					like Chrome or Edge.
				</AlertDescription>
			</Alert>
		)
	}

	if (isLoading) {
		return <Spinner className="size-8" />
	}

	return (
		<div className="flex flex-col lg:flex-row gap-4 items-center justify-center">
			<DrawingCanvas
				ref={canvasRef}
				onDrawEnd={handleDrawEnd}
				onClear={resetPredictions}
			/>

			<div className="flex flex-col w-full lg:w-[30%] gap-4">
				<PredictionBars predictions={predictions} />
				<NetworkStats
					subgroupsStatus={subgroupsStatus}
					inferenceTime={inferenceTime}
				/>
			</div>
		</div>
	)
}
