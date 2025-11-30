import { GRID_SIZE } from "@/lib/constants"

export const centerImage = (data: number[]) => {
	const mass = data.reduce((acc, value) => acc + value, 0)
	if (mass === 0) return data

	const x =
		data.reduce((acc, value, i) => acc + value * (i % GRID_SIZE), 0) / mass
	const y =
		data.reduce((acc, value, i) => acc + value * Math.floor(i / GRID_SIZE), 0) /
		mass

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

export const downscaleCanvas = (canvas: HTMLCanvasElement) => {
	const ctx = canvas.getContext("2d")
	if (!ctx) return new Float32Array(GRID_SIZE * GRID_SIZE)

	const imageData = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE)
	const downscaled = new Float32Array(GRID_SIZE * GRID_SIZE)

	for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
		downscaled[i] = imageData.data[i * 4]
	}

	return downscaled
}

export const preprocessImage = (canvas: HTMLCanvasElement) => {
	const downscaled = downscaleCanvas(canvas)
	const centered = centerImage(Array.from(downscaled))
	return centered.map((x) => (x / 255) * 3.24 - 0.42)
}

export const computeSoftmax = (logits: number[]) => {
	const total = logits.reduce((sum, val) => sum + Math.exp(val), 0)
	return logits.map((val) => Math.exp(val) / total)
}
