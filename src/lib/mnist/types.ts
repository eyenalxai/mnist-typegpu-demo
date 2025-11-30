export const CANVAS_SIZE = 280
export const GRID_SIZE = 28

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
