import type { TgpuRoot } from "typegpu"
import * as d from "typegpu/data"
import type { LayerData } from "@/lib/mnist/data"

const getLayerData = (layer: ArrayBuffer) => {
	const headerLen = new Uint16Array(layer.slice(8, 10))

	const header = new TextDecoder().decode(
		new Uint8Array(layer.slice(10, 10 + headerLen[0]))
	)

	const shapeMatch = header.match(/'shape': \((\d+), ?(\d+)?\)/)
	if (!shapeMatch) {
		throw new Error("Shape not found in header")
	}

	const X = Number.parseInt(shapeMatch[1], 10)
	const Y = Number.parseInt(shapeMatch[2], 10)
	const shape = Number.isNaN(Y) ? ([X] as const) : ([Y, X] as const)

	const data = new Float32Array(layer.slice(10 + headerLen[0]))

	if (data.length !== shape[0] * (shape[1] ?? 1)) {
		throw new Error(
			`Data length ${data.length} does not match shape ${JSON.stringify(shape)}`
		)
	}

	return {
		shape,
		data
	}
}

export const downloadLayers = async (root: TgpuRoot) => {
	const downloadLayer = async (fileName: string): Promise<LayerData> => {
		const response = await fetch(`/TypeGPU/assets/mnist-weights/${fileName}`)
		const buffer = await response.arrayBuffer()

		const { shape, data } = getLayerData(buffer)

		const layerBuffer = root
			.createBuffer(d.arrayOf(d.f32, data.length), [...data])
			.$usage("storage")

		return {
			shape,
			buffer: layerBuffer
		}
	}

	return Promise.all(
		[0, 1, 2, 3, 4, 5, 6, 7].map(async (layer) =>
			Promise.all([
				downloadLayer(`layer${layer}.weight.npy`),
				downloadLayer(`layer${layer}.bias.npy`)
			])
		)
	)
}
