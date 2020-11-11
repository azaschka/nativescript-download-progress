/* global java org */
if (global.TNS_WEBPACK) {
    if (global.android) {
        // without this JavaProxy is missing and we can't import vendor below
        global.require('~/../internal/ts_helpers.js');
    }
    global.require('~/vendor');
} else {
    require('globals');
}

global.onmessage = function (msg) {
    const url = msg.data.url;
    let contentLength = 0;
    let contentMD5 = '';
    let connection;

    try {
        const javaOptions = new org.nativescript.widgets.Async.Http.RequestOptions();
        javaOptions.url = url;

        const javaUrl = new java.net.URL(url);
        connection = javaUrl.openConnection();

        javaOptions.method = 'HEAD';
        connection.setRequestMethod('HEAD');

        connection.connect();

        contentLength = connection.getContentLengthLong();
        contentMD5 = connection.getHeaderField('Content-MD5');

        global.postMessage({ headerInformation: { contentLength: contentLength, contentMD5: contentMD5 } });
    } catch (ex) {
        global.postMessage({ error: ex });
    } finally {
        connection.disconnect();
    }
};
