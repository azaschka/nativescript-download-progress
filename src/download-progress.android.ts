import * as application from "tns-core-modules/application";
import * as fs from "tns-core-modules/file-system";

export class DownloadProgress {

    private promiseResolve;
    private promiseReject;
    private progressCallback;

    public addProgressCallback(callback: any) {
        this.progressCallback = callback;
    }

    public downloadFile(url: string, destinationFilePath?: string): Promise<fs.File> {
        return new Promise((resolve, reject) => {
            this.promiseResolve = resolve;
            this.promiseReject = reject;
            var worker = new Worker('./android-worker.js');
            worker.postMessage({ url: url, destinationFilePath: destinationFilePath });
            worker.onmessage = (msg:any)=> {
                if(msg.data.progress) {
                    if(this.progressCallback) {
                        this.progressCallback(msg.data.progress);
                    }
                } else if(msg.data.file) {
                    worker.terminate();
                    this.promiseResolve(msg.data.file);
                } else {
                    worker.terminate();
                    this.promiseReject(msg.data.error);
                }
            }
        
            worker.onerror = (err)=> {
                console.log(`An unhandled error occurred in worker: ${err.filename}, line: ${err.lineno} :`);
                this.promiseReject(err.message);
            }
        });
    }
}
