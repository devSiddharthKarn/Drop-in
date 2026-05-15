function generateUniqueToken():number{
    const token=Math.floor(Math.random() * 10000000);
    return token;
}

export {generateUniqueToken}