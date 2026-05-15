import { packageService } from "@/mod/package/service";
import { NextRequest } from "next/server";

export async function GET(req:NextRequest){
    const res = await packageService.handleGetFile(req);
    return res;
}

export async function POST(req:NextRequest){
    const res =await packageService.handleUploadFile(req);
    return res;
}