import { File } from '@nativescript/core';

type ProgressCallback = (progress: number, url: string, destination: string) => void;

export class DownloadProgress {
    private promiseResolve: (value?: File | PromiseLike<File>) => void;
    private promiseReject: (reason: any) => void;
    private progressCallback: ProgressCallback;
    private worker: Worker;

    public constructor() {
        if (global.TNS_WEBPACK) {
            // eslint-disable-next-line
            const WorkerScript = require('nativescript-worker-loader!./android-worker.js');
            this.worker = new WorkerScript();
        } else {
            this.worker = new Worker('./android-worker.js');
        }
    }

    public setProgressCallback(callback: ProgressCallback) {
        this.progressCallback = callback;
    }

    /**
     * @deprecated Use setProgressCallback
     */
    public addProgressCallback(callback: ProgressCallback) {
        this.progressCallback = callback;
    }

    public downloadFile(
        url: string,
        options?: any,
        destinationFilePath?: string,
        expectedFileSize?: number
    ): Promise<File> {
        return new Promise<File>((resolve, reject) => {
            // we check if options is a string
            // since in older versions of this plugin,
            // destinationFilePath was the second parameter.
            // so we check if options is possibly destinationFilePath {String}
            let isOptionsObject = true;
            if (typeof options === 'string') {
                isOptionsObject = false;
                destinationFilePath = options;
            }

            this.promiseResolve = resolve;
            this.promiseReject = reject;

            this.worker.postMessage({
                url,
                options: isOptionsObject ? options : undefined,
                destinationFilePath: destinationFilePath,
                expectedFileSize: expectedFileSize,
            });
            this.worker.onmessage = (msg: any) => {
                if (msg.data.progress) {
                    if (this.progressCallback) {
                        this.progressCallback(msg.data.progress, url, destinationFilePath);
                    }
                } else if (msg.data.filePath) {
                    this.promiseResolve(File.fromPath(msg.data.filePath));
                } else {
                    this.promiseReject(msg.data.error);
                }
            };

            this.worker.onerror = (err) => {
                console.log(`An unhandled error occurred in worker: ${err.filename}, line: ${err.lineno} :`);
                this.promiseReject(err.message);
            };
        });
    }
}
