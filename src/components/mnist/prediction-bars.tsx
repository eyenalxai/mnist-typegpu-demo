import type { PredictionBar } from "@/lib/mnist/types"

type PredictionBarsProps = {
	predictions: PredictionBar[]
	label: string
}

export function PredictionBars({ predictions, label }: PredictionBarsProps) {
	return (
		<div className="flex flex-col w-full items-center justify-center p-2 gap-4">
			<div className="mb-2 text-xl">{label}</div>

			<div className="flex flex-col w-full justify-start gap-1">
				{predictions.map((pred) => (
					<div
						key={pred.label}
						className="relative h-5 w-full font-mono text-base bg-linear-to-r from-transparent to-[#e6e6f2] rounded-full"
					>
						<div
							className="absolute h-full left-8 rounded-full bg-[#dadaed] transition-all duration-200 ease-in-out"
							style={{
								width: `calc((100% - 2rem) * ${pred.confidence})`
							}}
						/>
						<div
							className="absolute h-full left-8 rounded-full bg-linear-to-r from-[#c464ff] to-[#1d72f0] transition-all duration-200 ease-in-out"
							style={{
								width: `calc((100% - 2rem) * ${pred.confidence})`,
								opacity: pred.isHighlighted ? 1 : 0
							}}
						/>
						<span className="absolute left-2 top-0 leading-5">
							{pred.label}
						</span>
					</div>
				))}
			</div>
		</div>
	)
}
