import { bigint, boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

interface IPackage{
    _id:string,
    token:number,
    name:string,
    sizeInBytes:string,

    publicId:string,
    secureURL:string,
    originalName:string,
    resourceType:string,
    
    url:string,
    uploadedAt:Date,
    expiresAt:Date,
    isDeleted:boolean,
}

const Packages = pgTable("Packages",{
    _id:uuid("_id").notNull().defaultRandom().unique().primaryKey(),
    token:bigint("token",{mode:"number"}).notNull(),
    name:text("name").notNull(),
    sizeInBytes:text("size_in_bytes").notNull(),

    publicId:text("public_id").notNull(),
    secureURL:text("secure_url").notNull(),
    originalName:text("original_name").notNull(),
    resourceType:text("resource_type").notNull(),

    url:text("url").notNull(),
    uploadedAt:timestamp("uploaded_at").notNull().defaultNow(),
    expiresAt:timestamp("expires_at").notNull(),
    isDeleted:boolean("is_deleted").notNull().default(false)
});

export type {IPackage}
export {Packages}