import { ZodError } from "zod";

function getZodErrorMessage(err:ZodError){
    const error = err.issues.map((issue)=>{
        return {
            at:issue.path,
            message:issue.message
        }
    });
    return error;
}

export {getZodErrorMessage}