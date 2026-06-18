import { db } from "@/db/connect";
import {NextResponse } from "next/server";
import { Packages } from "../package/model";
import { and, eq, inArray, lte } from "drizzle-orm";
import { Respond } from "@/utils/res/response";
import { StatusCodes } from "@/utils/StatusCode/StatusCodes";
import { cloudinary } from "@/utils/cloudinary/config";

class CronJobs {
    public deleteExpiredPackages = async () => {
        try {
            const now = new Date();
            const expiredPackages = await db.select().from(Packages).where(
                and(
                    lte(Packages.expiresAt, now),
                    eq(Packages.isDeleted, false)
                )
            );

            if (!expiredPackages || expiredPackages.length == 0) {
                return NextResponse.json(
                    Respond(true, "Cron Executed " + expiredPackages.length + " jobs"),
                    {
                        status: StatusCodes.OK
                    }
                );
            }

            const files = expiredPackages.map(pkg => {
                return {
                    public_id: pkg.publicId,
                    resource_type: pkg.resourceType
                }
            });

            await Promise.all(
                files.map(file => {
                    return cloudinary.uploader.destroy(file.public_id, {
                        resource_type: file.resource_type
                    })
                })
            );

            const packageIds = expiredPackages.map(pkg => { return pkg._id });

            const deletedPackages = await db.update(Packages).set(
                {
                    isDeleted: true
                }
            ).where(
                inArray(Packages._id, packageIds)
            ).returning();

            console.log(`Executed ${deletedPackages} packages deletion in db`);

            return NextResponse.json(
                Respond(true, "Package Deletion Cron Job successfully completed"),
                {
                    status: StatusCodes.OK
                }
            );

        } catch (error) {
            console.log("Error at delete expired packages cron job,error:", error);
            return NextResponse.json(
                Respond(false, "Internal Server Error at deleteExpiredPackages cron job"), {
                status: StatusCodes.INTERNAL_SERVER_ERROR
            }
            );
        }
    }
}

const cronJobs = new CronJobs();

export {cronJobs};