"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardPanel } from "@/components/ui/card"
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from "@/components/ui/shadcn/chart"
import type { PredictionBar } from "@/lib/mnist/types"

type PredictionBarsProps = {
	predictions: PredictionBar[]
	subgroupsStatus: string
	inferenceTime: string
}

const chartConfig = {
	confidence: {
		label: "Confidence"
	},
	digit: {
		label: "Digit"
	}
} satisfies ChartConfig

export function PredictionBars({
	predictions,
	subgroupsStatus,
	inferenceTime
}: PredictionBarsProps) {
	const chartData = predictions.map((pred) => ({
		digit: pred.label.toString(),
		confidence: Number((pred.confidence * 100).toFixed(2)),
		fill: pred.isHighlighted ? "var(--chart-5)" : "var(--muted-foreground)"
	}))

	return (
		<Card className="w-full">
			<CardPanel className="flex flex-col gap-4">
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

				<div className="flex items-center justify-between gap-4 pt-2 border-t text-xs">
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground">Subgroups:</span>
						<Badge
							variant={subgroupsStatus === "enabled" ? "success" : "error"}
							className="font-mono text-xs"
						>
							{subgroupsStatus}
						</Badge>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground">Inference:</span>
						<Badge variant="outline" className="font-mono text-xs">
							{inferenceTime}
						</Badge>
					</div>
				</div>
			</CardPanel>
		</Card>
	)
}
