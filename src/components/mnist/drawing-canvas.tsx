import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
	clearCanvas,
	drawLine,
	getCanvasCoordinates
} from "@/lib/mnist/canvas-utils"
import { CANVAS_SIZE } from "@/lib/mnist/types"

type DrawingCanvasProps = {
	ref?: React.Ref<HTMLCanvasElement>
	onDrawEnd: () => void | Promise<void>
	onClear: () => void
}

export function DrawingCanvas({ ref, onDrawEnd, onClear }: DrawingCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const isDrawingRef = useRef(false)
	const lastPosRef = useRef<{ x: number; y: number } | null>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		clearCanvas(canvas)

		if (ref) {
			if (typeof ref === "function") {
				ref(canvas)
			} else if ("current" in ref) {
				ref.current = canvas
			}
		}
	}, [ref])

	const handleDrawStart = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		e.preventDefault()
		const canvas = canvasRef.current
		if (!canvas) return

		isDrawingRef.current = true
		const pos = getCanvasCoordinates(canvas, e)
		lastPosRef.current = pos

		const ctx = canvas.getContext("2d")
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
		if (!canvas) return

		const ctx = canvas.getContext("2d")
		if (!ctx) return

		const pos = getCanvasCoordinates(canvas, e)
		drawLine(ctx, lastPosRef.current, pos)
		lastPosRef.current = pos
	}

	const handleDrawEnd = () => {
		if (!isDrawingRef.current) return
		isDrawingRef.current = false
		lastPosRef.current = null

		void onDrawEnd()
	}

	const handleClear = () => {
		const canvas = canvasRef.current
		if (!canvas) return
		clearCanvas(canvas)
		onClear()
	}

	return (
		<div className="relative">
			<canvas
				ref={canvasRef}
				width={CANVAS_SIZE}
				height={CANVAS_SIZE}
				className="border border-border rounded-lg shadow-lg cursor-crosshair touch-none"
				onMouseDown={handleDrawStart}
				onMouseMove={handleDrawMove}
				onMouseUp={handleDrawEnd}
				onMouseLeave={handleDrawEnd}
				onTouchStart={handleDrawStart}
				onTouchMove={handleDrawMove}
				onTouchEnd={handleDrawEnd}
			/>
			<Button onClick={handleClear} className="mt-4 w-full">
				Clear
			</Button>
		</div>
	)
}
