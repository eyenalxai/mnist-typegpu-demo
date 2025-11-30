import { tgpu } from "typegpu"
import * as d from "typegpu/data"
import * as std from "typegpu/std"
import { ioLayout, type Network, weightsBiasesLayout } from "@/lib/mnist/data"
import { downloadLayers } from "@/lib/mnist/helpers"

export const initNetwork = async () => {
	const root = await tgpu.init({
		device: {
			optionalFeatures: ["timestamp-query", "subgroups"]
		}
	})

	const hasSubgroups = root.enabledFeatures.has("subgroups")
	const layersData = await downloadLayers(root)

	const relu = tgpu.fn(
		[d.f32],
		d.f32
	)((x) => {
		"use gpu"
		return std.max(0, x)
	})

	const defaultCompute = tgpu["~unstable"].computeFn({
		in: {
			gid: d.builtin.globalInvocationId
		},
		workgroupSize: [1]
	})(({ gid }) => {
		"use gpu"
		const inputSize = ioLayout.$.input.length

		const i = gid.x
		const weightsOffset = i * inputSize
		let sum = d.f32()

		for (let j = d.u32(); j < inputSize; j++) {
			sum = std.fma(
				ioLayout.$.input[j],
				weightsBiasesLayout.$.weights[weightsOffset + j],
				sum
			)
		}

		const total = sum + weightsBiasesLayout.$.biases[i]
		ioLayout.$.output[i] = relu(total)
	})

	const pipeline = root["~unstable"]
		.withCompute(defaultCompute)
		.createPipeline()

	const buffers = layersData.map(([weights, biases]) => {
		if (weights.shape[1] !== biases.shape[0]) {
			throw new Error(
				`Shape mismatch: ${JSON.stringify(weights.shape)} and ${JSON.stringify(biases.shape)}`
			)
		}

		return {
			weights: weights.buffer,
			biases: biases.buffer,
			state: root
				.createBuffer(d.arrayOf(d.f32, biases.shape[0]))
				.$usage("storage")
		}
	})

	const input = root
		.createBuffer(d.arrayOf(d.f32, layersData.at(0)?.[0].shape[0] ?? 0))
		.$usage("storage")
	const output = buffers.at(-1)?.state ?? buffers[0].state

	const ioBindGroups = buffers.map((_, i) =>
		root.createBindGroup(ioLayout, {
			input: i === 0 ? input : buffers[i - 1].state,
			output: buffers[i].state
		})
	)

	const weightsBindGroups = buffers.map((layer) =>
		root.createBindGroup(weightsBiasesLayout, {
			weights: layer.weights,
			biases: layer.biases
		})
	)

	const inference = async (data: number[]): Promise<number[]> => {
		if (data.length !== layersData[0][0].shape[0]) {
			throw new Error(
				`Data length ${data.length} does not match input shape ${layersData[0][0].shape[0]}`
			)
		}

		input.write(data)

		for (let i = 0; i < buffers.length; i++) {
			const boundPipeline = pipeline
				.with(ioBindGroups[i])
				.with(weightsBindGroups[i])

			boundPipeline.dispatchWorkgroups(buffers[i].biases.dataType.elementCount)
		}

		return output.read()
	}

	const network: Network = {
		layers: buffers,
		input,
		output,
		inference
	}

	return { network, hasSubgroups }
}
