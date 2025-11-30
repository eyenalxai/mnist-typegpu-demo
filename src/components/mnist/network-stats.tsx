type NetworkStatsProps = {
	subgroupsStatus: string
	inferenceTime: string
}

export function NetworkStats({
	subgroupsStatus,
	inferenceTime
}: NetworkStatsProps) {
	return (
		<div className="w-full p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm flex flex-col gap-1">
			<div className="flex justify-between text-gray-600 dark:text-gray-400">
				<span>Subgroups:</span>
				<span
					className={`font-mono font-semibold ${
						subgroupsStatus === "enabled"
							? "text-green-600 dark:text-green-400"
							: "text-red-600 dark:text-red-400"
					}`}
				>
					{subgroupsStatus}
				</span>
			</div>
			<div className="flex justify-between text-gray-600 dark:text-gray-400">
				<span>Inference:</span>
				<span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
					{inferenceTime}
				</span>
			</div>
		</div>
	)
}
