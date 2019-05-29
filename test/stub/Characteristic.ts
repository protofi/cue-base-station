import * as Noble from 'noble'

export default class Characteristic implements Noble.Characteristic{
    uuid: string;   
    name: string;
    type: string;
    properties: string[];
    descriptors: Noble.Descriptor[];
    read(callback?: (error: string, data: Buffer) => void): void {
        throw new Error("Method not implemented.");
    }
    write(data: Buffer, notify: boolean, callback?: (error: string) => void): void {
        throw new Error("Method not implemented.");
    }
    broadcast(broadcast: boolean, callback?: (error: string) => void): void {
        throw new Error("Method not implemented.");
    }
    notify(notify: boolean, callback?: (error: string) => void): void {
        throw new Error("Method not implemented.");
    }
    discoverDescriptors(callback?: (error: string, descriptors: Noble.Descriptor[]) => void): void {
        throw new Error("Method not implemented.");
    }
    toString(): string {
        throw new Error("Method not implemented.");
    }
    subscribe(callback?: (error: string) => void): void {
        throw new Error("Method not implemented.");
    }
    unsubscribe(callback?: (error: string) => void): void {
        throw new Error("Method not implemented.");
    }
    //@ts-ignore
    on(event: "read", listener: (data: Buffer, isNotification: boolean) => void): this;
    on(event: "write", withoutResponse: boolean, listener: (error: string) => void): this;
    on(event: "broadcast", listener: (state: string) => void): this;
    on(event: "notify", listener: (state: string) => void): this;
	on(event: "descriptorsDiscover", listener: (descriptors: Noble.Descriptor[]) => void): this;
	on(event: string, listener: Function): this;
    on(event: string, option: boolean, listener: Function): this;
    on(event: any, option: any, listener?: any) {
        throw new Error("Method not implemented.");
    }
    addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    once(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    off(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    removeAllListeners(event?: string | symbol): this {
        throw new Error("Method not implemented.");
    }
    setMaxListeners(n: number): this {
        throw new Error("Method not implemented.");
    }
    getMaxListeners(): number {
        throw new Error("Method not implemented.");
    }
    listeners(event: string | symbol): Function[] {
        throw new Error("Method not implemented.");
    }
    rawListeners(event: string | symbol): Function[] {
        throw new Error("Method not implemented.");
    }
    emit(event: string | symbol, ...args: any[]): boolean {
        throw new Error("Method not implemented.");
    }
    eventNames(): (string | symbol)[] {
        throw new Error("Method not implemented.");
    }
    listenerCount(type: string | symbol): number {
        throw new Error("Method not implemented.");
    }


}