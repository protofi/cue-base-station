export default async function(millis: number): Promise<void> {

    return new Promise((resolve, reject) => {
        setTimeout(resolve, millis)
    })
}