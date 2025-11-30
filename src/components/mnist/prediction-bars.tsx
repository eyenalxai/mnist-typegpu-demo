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
		fill: pred.isHighlighted
			? "hsl(var(--chart-1))"
			: "hsl(var(--muted-foreground))"
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

				<div className="flex flex-col gap-3 pt-2 border-t">
					<div className="flex justify-between items-center">
						<span className="text-sm text-muted-foreground">Subgroups:</span>
						<Badge
							variant={subgroupsStatus === "enabled" ? "success" : "error"}
							className="font-mono"
						>
							{subgroupsStatus}
						</Badge>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-sm text-muted-foreground">Inference:</span>
						<Badge variant="outline" className="font-mono">
							{inferenceTime}
						</Badge>
					</div>
				</div>
			</CardPanel>
		</Card>
	)
}
