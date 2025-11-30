import { NextResponse } from "next/server"

export const GET = (_request: Request) =>
	new NextResponse("Healthy.", { status: 200 })

export const OPTIONS = (_request: Request) =>
	new NextResponse(null, { status: 200 })
