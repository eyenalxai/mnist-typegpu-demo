"use client"

import { throttle } from "es-toolkit/function"
import { useCallback, useEffect, useRef } from "react"
import { DrawingCanvas } from "@/components/mnist/drawing-canvas"
import { PredictionBars } from "@/components/mnist/prediction-bars"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { useMNISTInference } from "@/hooks/use-mnist-inference"

export const MNISTCanvas = () => {
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

	const throttledInference = useRef(
		throttle(() => {
			const canvas = canvasRef.current
			if (!canvas) return
			void runInference(canvas)
		}, 250)
	)

	useEffect(() => {
		const throttled = throttledInference.current
		return () => {
			throttled.cancel()
		}
	}, [])

	const handleDraw = useCallback(() => {
		throttledInference.current()
	}, [])

	const handleDrawEnd = async () => {
		throttledInference.current.flush()
		const canvas = canvasRef.current
		if (!canvas) return
		await runInference(canvas)
	}

	if (!isSupported) {
		return (
			<Alert variant="error">
				<AlertTitle>WebGPU Not Supported</AlertTitle>
				<AlertDescription>
					Your browser does not support WebGPU :(
				</AlertDescription>
			</Alert>
		)
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full gap-x-2">
				<Spinner /> <span>Loading models</span>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-4 items-center justify-center max-w-2xl mx-auto">
			<DrawingCanvas
				ref={canvasRef}
				onDraw={handleDraw}
				onDrawEnd={handleDrawEnd}
				onClear={resetPredictions}
			/>
			<PredictionBars
				predictions={predictions}
				subgroupsStatus={subgroupsStatus}
				inferenceTime={inferenceTime}
			/>
		</div>
	)
}
