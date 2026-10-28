// Run from the plugin directory: node check-edge-tts.cjs
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const { Writable } = require('node:stream');

async function checkBundle() {
    const plugin = require('./dist/plugin.js');
    let generate;
    await plugin.init({
        post(path, ...handlers) {
            if (path === '/generate') generate = handlers[handlers.length - 1];
        },
        get() {},
    });
    let bytes = 0;
    let statusCode = 200;
    const response = new Writable({
        write(chunk, encoding, callback) {
            bytes += chunk.length;
            callback();
        },
    });
    response.setHeader = () => {};
    response.removeHeader = () => {};
    response.status = code => {
        statusCode = code;
        return response;
    };
    response.send = body => response.end(body);
    await generate({ body: { text: '你好，这是插件成品测试。', voice: 'zh-CN-XiaoxiaoNeural' } }, response);
    if (statusCode !== 200 || !response.writableFinished || !bytes) {
        throw new Error(`Bundle failed: status=${statusCode}, bytes=${bytes}`);
    }
    console.log('Bundle OK: received', bytes, 'audio bytes');
}

async function main() {
    console.log('Node:', process.version);
    console.log('msedge-tts:', require('msedge-tts/package.json').version);
    if (process.argv.includes('--bundle')) return checkBundle();
    const tts = new MsEdgeTTS();
    try {
        await tts.setMetadata('zh-CN-XiaoxiaoNeural', OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
        const { audioStream } = tts.toStream('你好，这是语音连接测试。');
        let bytes = 0;
        for await (const chunk of audioStream) bytes += chunk.length;
        if (!bytes) throw new Error('The server returned no audio');
        console.log('OK: received', bytes, 'audio bytes');
    } finally {
        tts.close();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
