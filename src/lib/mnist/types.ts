export type PredictionBar = {
	label: number
	confidence: number
	isHighlighted: boolean
}

export type NetworkStats = {
	inferenceTime: string
	subgroupsStatus: string
	predictionLabel: string
}
