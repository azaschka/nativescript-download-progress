import { File } from '@nativescript/core';
import { getFilenameFromUrl } from '@nativescript/core/http/http-request/http-request-common';

type ProgressCallback = (progress: number, url: string, destination: string) => void;

type HeaderInformation = {
    contentLength: number;
    contentMD5: string;
};

const currentDevice = UIDevice.currentDevice;
const device = currentDevice.userInterfaceIdiom === UIUserInterfaceIdiom.Phone ? 'Phone' : 'Pad';
const osVersion = currentDevice.systemVersion;

const USER_AGENT_HEADER = 'User-Agent';
const USER_AGENT = `Mozilla/5.0 (i${device}; CPU OS ${osVersion.replace(
    '.',
    '_'
)} like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/${osVersion} Mobile/10A5355d Safari/8536.25`;
const sessionConfig = NSURLSessionConfiguration.defaultSessionConfiguration;
const queue = NSOperationQueue.mainQueue;

export class FileInfo {
    public getHeaderInformation(url: string): Promise<HeaderInformation> {
        return new Promise<HeaderInformation>((resolve, reject) => {
            try {
                const urlRequest = NSMutableURLRequest.requestWithURL(NSURL.URLWithString(url));
                urlRequest.setValueForHTTPHeaderField(USER_AGENT, USER_AGENT_HEADER);
                urlRequest.HTTPMethod = 'HEAD';

                @NativeClass()
                class DownloadProgressDelegate extends NSObject implements NSURLSessionDataDelegate {
                    static ObjCProtocols = [NSURLSessionDataDelegate];
                    private urlResponse: NSURLResponse;

                    public URLSessionDataTaskDidReceiveResponseCompletionHandler(
                        session: NSURLSession,
                        dataTask: NSURLSessionDataTask,
                        response: NSURLResponse,
                        completionHandler: (p1: NSURLSessionResponseDisposition) => void
                    ) {
                        completionHandler(NSURLSessionResponseDisposition.Allow);
                        this.urlResponse = response;
                    }

                    public URLSessionTaskDidCompleteWithError(
                        session: NSURLSession,
                        task: NSURLSessionTask,
                        error: NSError
                    ) {
                        if (error) {
                            reject(error);
                        } else {
                            const httpResponse = this.urlResponse as NSHTTPURLResponse;
                            const contentLength: number = httpResponse.allHeaderFields.objectForKey('Content-Length');
                            const contentMD5: string = httpResponse.allHeaderFields.objectForKey('Content-MD5');

                            const headerInformation: HeaderInformation = {
                                contentLength: contentLength,
                                contentMD5: contentMD5,
                            };

                            resolve(headerInformation);
                        }
                    }
                }

                const session = NSURLSession.sessionWithConfigurationDelegateDelegateQueue(
                    sessionConfig,
                    <DownloadProgressDelegate>DownloadProgressDelegate.new(),
                    queue
                );
                const dataTask = session.dataTaskWithRequest(urlRequest);

                dataTask.resume();
            } catch (ex) {
                reject(ex);
            }
        });
    }
}

export class DownloadProgress {
    private progressCallback: ProgressCallback;

    public setProgressCallback(callback: ProgressCallback) {
        this.progressCallback = callback;
    }

    public downloadFile(
        url: string,
        options?: any,
        destinationFilePath?: string,
        expectedFileSize?: number
    ): Promise<File> {
        return new Promise<File>((resolve, reject) => {
            const progressCallback = this.progressCallback;
            let destinationFile: File;
            // we check if options is a string
            // since in older versions of this plugin,
            // destinationFilePath was the second parameter.
            // so we check if options is possibly destinationFilePath {String}
            let isOptionsObject = true;
            if (typeof options === 'string') {
                isOptionsObject = false;
                destinationFilePath = options;
            }

            try {
                if (destinationFilePath) {
                    destinationFile = File.fromPath(destinationFilePath);
                } else {
                    destinationFile = File.fromPath(getFilenameFromUrl(url));
                }

                // TODO: Check if Range header is present
                // Only write an empty string, if the file size is 0 as it would interfere with Range header
                if (destinationFile.size === 0) {
                    destinationFile.writeTextSync('', (e) => {
                        throw e;
                    });
                }

                const urlRequest = NSMutableURLRequest.requestWithURL(NSURL.URLWithString(url));
                urlRequest.setValueForHTTPHeaderField(USER_AGENT, USER_AGENT_HEADER);
                if (options && isOptionsObject) {
                    const { method, headers } = options;
                    if (method) {
                        urlRequest.HTTPMethod = method;
                    }
                    if (headers) {
                        for (const key in headers) {
                            urlRequest.setValueForHTTPHeaderField(headers[key], key);
                        }
                    }
                } else {
                    urlRequest.HTTPMethod = 'GET';
                }

                @NativeClass()
                class DownloadProgressDelegate extends NSObject implements NSURLSessionDataDelegate {
                    static ObjCProtocols = [NSURLSessionDataDelegate];
                    private urlResponse: NSURLResponse;

                    public URLSessionDataTaskDidReceiveResponseCompletionHandler(
                        session: NSURLSession,
                        dataTask: NSURLSessionDataTask,
                        response: NSURLResponse,
                        completionHandler: (p1: NSURLSessionResponseDisposition) => void
                    ) {
                        completionHandler(NSURLSessionResponseDisposition.Allow);
                        this.urlResponse = response;
                    }

                    public URLSessionDataTaskDidReceiveData(
                        session: NSURLSession,
                        dataTask: NSURLSessionDataTask,
                        data: NSData
                    ) {
                        const fileHandle = NSFileHandle.fileHandleForWritingAtPath(destinationFile.path);
                        fileHandle.seekToEndOfFile();
                        fileHandle.writeData(data);

                        if (expectedFileSize) {
                            const progress = ((100.0 / expectedFileSize) * fileHandle.seekToEndOfFile()) / 100;
                            if (progressCallback) {
                                progressCallback(progress, url, destinationFilePath);
                            }
                        }

                        fileHandle.closeFile();
                    }

                    public URLSessionTaskDidCompleteWithError(
                        session: NSURLSession,
                        task: NSURLSessionTask,
                        error: NSError
                    ) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(destinationFile);
                        }
                    }
                }

                const session = NSURLSession.sessionWithConfigurationDelegateDelegateQueue(
                    sessionConfig,
                    <DownloadProgressDelegate>DownloadProgressDelegate.new(),
                    queue
                );
                const dataTask = session.dataTaskWithRequest(urlRequest);

                dataTask.resume();
            } catch (ex) {
                reject(ex);
            }
        });
    }
}
