import { CANVAS_SIZE } from "@/lib/mnist/types"

export const drawLine = (
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

export const clearCanvas = (canvas: HTMLCanvasElement) => {
	const ctx = canvas.getContext("2d")
	if (!ctx) return

	ctx.fillStyle = "black"
	ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
}

export const getCanvasCoordinates = (
	canvas: HTMLCanvasElement,
	e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
): { x: number; y: number } => {
	const rect = canvas.getBoundingClientRect()
	const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
	const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

	return {
		x: ((clientX - rect.left) / rect.width) * CANVAS_SIZE,
		y: ((clientY - rect.top) / rect.height) * CANVAS_SIZE
	}
}
