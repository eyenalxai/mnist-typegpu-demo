import { Badge } from "@/components/ui/badge"
import { Card, CardPanel } from "@/components/ui/card"

type NetworkStatsProps = {
	subgroupsStatus: string
	inferenceTime: string
}

export function NetworkStats({
	subgroupsStatus,
	inferenceTime
}: NetworkStatsProps) {
	return (
		<Card className="w-full py-3">
			<CardPanel className="flex flex-col gap-3">
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
			</CardPanel>
		</Card>
	)
}
