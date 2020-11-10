import { File } from '@nativescript/core';

export declare type RequestOptions = {
    method: string;
    headers: Object;
};

export declare type ProgressCallback = (progress: number, url: string, destination: string) => void;

export declare class DownloadProgress {
    constructor();
    setProgressCallback(callback: ProgressCallback): void;
    downloadFile(
        url: string,
        options: RequestOptions | string,
        destinationFilePath?: string,
        expectedFileSize?: number
    ): Promise<File>;
}
