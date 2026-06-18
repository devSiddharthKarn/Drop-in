import { cronJobs } from "@/mod/cron-job/deletePackages";
import { Respond } from "@/utils/res/response";
import { StatusCodes } from "@/utils/StatusCode/StatusCodes";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const res: NextResponse = await cronJobs.deleteExpiredPackages();
        return res;
    } catch (error) {
        console.error("Error at delete expired packages method GET,error", error);
        return NextResponse.json(
            Respond(false, "Internal Server Error"),
            {
                status: StatusCodes.INTERNAL_SERVER_ERROR
            }
        );
    }

}