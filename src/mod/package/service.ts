import { db } from "@/db/connect";
import { cloudinary } from "@/utils/cloudinary/config";
import { Respond } from "@/utils/res/response";
import { StatusCodes } from "@/utils/StatusCode/StatusCodes";
import { generateUniqueToken } from "@/utils/token/service";
import { UploadApiResponse } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";
import { Packages } from "./model";
import { eq } from "drizzle-orm";

class PackageService {
    private fileUploadValidity = 24 * 60 * 60 * 1000;

    public handleUploadFile = async (req: NextRequest) => {
        try {
            const formData = await req.formData();

            const files: File[] = formData.getAll("files") as File[];

            if (!files || files.length == 0) {
                return NextResponse.json(
                    Respond(false, "Invalid Files Provided", null, null),
                    { status: StatusCodes.BAD_REQUEST }
                );
            }


            const result: UploadApiResponse[] = await Promise.all(
                files.map((file) => {
                    return new Promise<UploadApiResponse>(async (resolve, reject) => {
                        try {
                            const arrayBuffer = await file.arrayBuffer();
                            const fileBuffer = Buffer.from(arrayBuffer);

                            const stream = cloudinary.uploader.upload_stream(
                                {
                                    folder: "QShare",
                                    resource_type: "auto",
                                    use_filename:true,
                                    filename_override:file.name
                                },
                                (error, result) => {
                                    if (error || !result) {
                                        reject(error || new Error("Upload failed"));
                                        return;
                                    }
                                    resolve(result);
                                }
                            );

                            stream.end(fileBuffer);

                            console.log(file.name)
                        } catch (err) {
                            reject(err);
                        }
                    });
                })
            );

            const token = generateUniqueToken();
            const now = new Date();
            const dbData = result.map(r => {
                console.log("File has name:",r.original_filename);
                const data = {
                    token: token,
                    name: r.original_filename,
                    sizeInBytes: r.bytes.toString(),

                    publicId:r.public_id,
                    secureURL:r.secure_url,
                    originalName:r.original_filename,
                    resourceType:r.resource_type,

                    url: r.secure_url,
                    uploadedAt: now,
                    expiresAt: new Date(now.getTime() + this.fileUploadValidity)
                }
                return data;
            })

            const dbResult = await db.insert(Packages).values(dbData).returning();

            if (!dbResult || dbResult.length == 0) {
                return NextResponse.json(
                    Respond(false, "Error Saving File", null, null),
                    {
                        status: StatusCodes.INTERNAL_SERVER_ERROR
                    }
                );
            }

            const link = (process.env.HOSTED_URL as string)+"?token="+token;
            const responseData = {
                token: token,
                link:link
            }

            return NextResponse.json(
                Respond(true, "File Uploaded.Share the token to help others download it.", responseData),
                { status: StatusCodes.OK }
            );

        } catch (error) {
            console.error("Error at handleUploadFile,error:", error);
            return NextResponse.json(
                Respond(false, "Internal Server Error. Please try again later"),
                { status: StatusCodes.INTERNAL_SERVER_ERROR }
            );
        }
    }


    public handleGetFile = async (req: NextRequest) => {
        try {
            const url = new URL(req.url);

            const token = Number(url.searchParams.get("token"));

            if (!token) {
                return NextResponse.json(
                    Respond(false, "Token Not Provided."),
                    { status: StatusCodes.BAD_REQUEST }
                );
            }


            const packages = await db.select().from(Packages).where(
                eq(Packages.token, token)
            );

            if (!packages || packages.length == 0) {
                return NextResponse.json(
                    Respond(false, "Package Not Found"),
                    {
                        status: StatusCodes.NOT_FOUND
                    }
                );
            }

            const now = new Date();
            const hasExpired = now > packages[0].expiresAt;

            if (hasExpired) {
                return NextResponse.json(
                    Respond(false, "Package has already Expired"),
                    { status: StatusCodes.GONE }
                );
            }

            const resData = packages.map(pkg => {
                return {
                    _id: pkg._id,
                    token: pkg.token,
                    name: pkg.name,
                    sizeInBytes: pkg.sizeInBytes,
                    url: pkg.url,
                    uploadedAt: pkg.uploadedAt,
                    expiresAt: pkg.expiresAt,
                }
            });

            return NextResponse.json(
                Respond(true, "Success", resData),
                {
                    status: StatusCodes.OK
                }
            );

        } catch (error) {
            console.error("Error getting token from file,error:", error);
            return NextResponse.json(
                Respond(false, "Internal Server Error. Please try again later"), {
                status: StatusCodes.INTERNAL_SERVER_ERROR
            }
            );
        }
    }
}

const packageService = new PackageService();

export { packageService };