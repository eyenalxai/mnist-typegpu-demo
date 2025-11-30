"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from "@/components/ui/shadcn/chart"
import type { PredictionBar } from "@/lib/mnist/types"

type PredictionBarsProps = {
	predictions: PredictionBar[]
}

const chartConfig = {
	confidence: {
		label: "Confidence"
	},
	digit: {
		label: "Digit"
	}
} satisfies ChartConfig

export function PredictionBars({ predictions }: PredictionBarsProps) {
	const chartData = predictions.map((pred) => ({
		digit: pred.label.toString(),
		confidence: Number((pred.confidence * 100).toFixed(2)),
		fill: pred.isHighlighted
			? "hsl(var(--chart-1))"
			: "hsl(var(--muted-foreground))"
	}))

	return (
		<div className="flex flex-col w-full gap-4">
			<ChartContainer config={chartConfig} className="min-h-[300px] w-full">
				<BarChart accessibilityLayer data={chartData}>
					<CartesianGrid vertical={false} />
					<XAxis
						dataKey="digit"
						tickLine={false}
						tickMargin={10}
						axisLine={false}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						tickMargin={10}
						tickFormatter={(value) => `${value}%`}
					/>
					<ChartTooltip
						content={
							<ChartTooltipContent
								labelKey="digit"
								nameKey="confidence"
								formatter={(value) => `${value}%`}
							/>
						}
					/>
					<Bar dataKey="confidence" radius={4} />
				</BarChart>
			</ChartContainer>
		</div>
	)
}
