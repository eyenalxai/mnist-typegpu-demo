import { useEffect, useRef, useState } from "react"
import type { Network } from "@/lib/mnist/data"
import { computeSoftmax, preprocessImage } from "@/lib/mnist/image-processing"
import { initNetwork } from "@/lib/mnist/network"
import type { PredictionBar } from "@/lib/mnist/types"

export const useMNISTInference = () => {
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

	useEffect(() => {
		if (typeof navigator === "undefined" || navigator.gpu === undefined) {
			setIsSupported(false)
			return
		}

		let mounted = true

		async function init() {
			try {
				const { network, hasSubgroups } = await initNetwork()

				if (mounted) {
					networkRef.current = network
					setSubgroupsStatus(hasSubgroups ? "enabled" : "disabled")
					setIsLoading(false)
				}
			} catch (error) {
				console.error("Failed to initialize MNIST:", error)
				setIsSupported(false)
			}
		}

		void init()

		return () => {
			mounted = false
		}
	}, [])

	const runInference = async (canvas: HTMLCanvasElement) => {
		const network = networkRef.current
		if (!network) return

		const normalized = preprocessImage(canvas)

		const startTime = performance.now()
		const result = await network.inference(normalized)
		const endTime = performance.now()
		const duration = endTime - startTime

		setInferenceTime(`${duration.toFixed(2)}ms`)
		setPredictionLabel(`Predictions (${duration.toFixed(2)}ms)`)

		const maxValue = Math.max(...result)
		const maxIndex = result.includes(maxValue) ? result.indexOf(maxValue) : 0

		const softmax = computeSoftmax(result)

		setPredictions(
			softmax.map((confidence, i) => ({
				label: i,
				confidence,
				isHighlighted: i === maxIndex
			}))
		)
	}

	const resetPredictions = () => {
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

	return {
		isLoading,
		isSupported,
		predictions,
		inferenceTime,
		subgroupsStatus,
		predictionLabel,
		runInference,
		resetPredictions
	}
}
