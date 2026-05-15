import {z} from "zod"

const packageDownloadFromTokenSchema = z.object({
    token:z.coerce.number()
})

export {packageDownloadFromTokenSchema}