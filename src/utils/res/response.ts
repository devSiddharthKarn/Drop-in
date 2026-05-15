interface IResponse {
    success: boolean,
    message: string,
    data: unknown | null,
    error: unknown | null
}

function Respond(success: boolean, message: string, data: unknown | null = null, error: unknown | null = null): IResponse {
    return {
        success,
        message,
        data,
        error
    }
}

export { Respond }