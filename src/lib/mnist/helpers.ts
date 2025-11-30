import { errAsync, okAsync, ResultAsync } from "neverthrow"
import type { TgpuRoot } from "typegpu"
import * as d from "typegpu/data"
import type { LayerData } from "@/lib/mnist/data"

type LayerError =
	| { type: "fetch_failed"; fileName: string; message: string }
	| { type: "parse_failed"; fileName: string; message: string }

const getLayerData = (layer: ArrayBuffer, fileName: string) => {
	const headerLen = new Uint16Array(layer.slice(8, 10))

	const header = new TextDecoder().decode(
		new Uint8Array(layer.slice(10, 10 + headerLen[0]))
	)

	const shapeMatch = header.match(/'shape': \((\d+), ?(\d+)?\)/)
	if (!shapeMatch) {
		return errAsync<never, LayerError>({
			type: "parse_failed",
			fileName,
			message: "Shape not found in header"
		})
	}

	const X = Number.parseInt(shapeMatch[1], 10)
	const Y = Number.parseInt(shapeMatch[2], 10)
	const shape = Number.isNaN(Y) ? ([X] as const) : ([Y, X] as const)

	const data = new Float32Array(layer.slice(10 + headerLen[0]))

	if (data.length !== shape[0] * (shape[1] ?? 1)) {
		return errAsync<never, LayerError>({
			type: "parse_failed",
			fileName,
			message: `Data length ${data.length} does not match shape ${JSON.stringify(shape)}`
		})
	}

	return okAsync({
		shape,
		data
	})
}

export const downloadLayers = (root: TgpuRoot) => {
	const downloadLayer = (
		fileName: string
	): ResultAsync<LayerData, LayerError> => {
		return ResultAsync.fromPromise(
			fetch(`/TypeGPU/assets/mnist-weights/${fileName}`),
			(error) => ({
				type: "fetch_failed" as const,
				fileName,
				message: error instanceof Error ? error.message : String(error)
			})
		)
			.andThen((response) =>
				ResultAsync.fromPromise(response.arrayBuffer(), (error) => ({
					type: "fetch_failed" as const,
					fileName,
					message: error instanceof Error ? error.message : String(error)
				}))
			)
			.andThen((buffer) => getLayerData(buffer, fileName))
			.map(({ shape, data }) => {
				const layerBuffer = root
					.createBuffer(d.arrayOf(d.f32, data.length), [...data])
					.$usage("storage")

				return {
					shape,
					buffer: layerBuffer
				}
			})
	}

	return ResultAsync.combine(
		[0, 1, 2, 3, 4, 5, 6, 7].map((layer) =>
			ResultAsync.combine([
				downloadLayer(`layer${layer}.weight.npy`),
				downloadLayer(`layer${layer}.bias.npy`)
			])
		)
	)
}
