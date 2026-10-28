import bodyParser from 'body-parser';
import { Router } from 'express';
import { Chalk } from 'chalk';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { pipeline } from 'stream/promises';
import xmlEscape from 'xml-escape';

interface PluginInfo {
    id: string;
    name: string;
    description: string;
}

interface Plugin {
    init: (router: Router) => Promise<void>;
    exit: () => Promise<void>;
    info: PluginInfo;
}

const chalk = new Chalk();
const MODULE_NAME = '[SillyTavern-EdgeTTS-Plugin]';

async function getVoices() {
    const tts = new MsEdgeTTS();
    const voices = await tts.getVoices();
    return voices;
}

/**
 * Initialize the plugin.
 * @param router Express Router
 */
export async function init(router: Router): Promise<void> {
    const jsonParser = bodyParser.json();
    // Used to check if the server plugin is running
    router.post('/probe', (_req, res) => {
        return res.sendStatus(204);
    });
    router.get('/list', async (_req, res) => {
        try {
            const voices = await getVoices();
            return res.json(voices);
        } catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Request failed', error);
            return res.status(500).send('Internal Server Error');
        }
    });
    router.post('/generate', jsonParser, async (req, res) => {
        const { text, voice } = req.body ?? {};
        if (typeof text !== 'string' || !text.trim()
            || typeof voice !== 'string' || !voice.trim()) {
            return res.status(400).send('Bad Request');
        }

        const tts = new MsEdgeTTS();
        try {
            await tts.setMetadata(voice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
            if (res.destroyed) return;

            const { audioStream } = tts.toStream(xmlEscape(text));
            res.setHeader('Content-Type', 'audio/webm');
            // Await completion so asynchronous errors and client disconnects are handled.
            await pipeline(audioStream, res);
        } catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Request failed', error);
            if (!res.destroyed && !res.headersSent) {
                res.removeHeader('Content-Type');
                res.status(502).send('Edge TTS upstream request failed');
            } else if (!res.destroyed) {
                res.destroy();
            }
        } finally {
            tts.close();
        }
    });

    console.log(chalk.green(MODULE_NAME), 'Plugin loaded!');
}

export async function exit(): Promise<void> {
    console.log(chalk.yellow(MODULE_NAME), 'Plugin exited');
}

export const info: PluginInfo = {
    id: 'edge-tts',
    name: 'EdgeTTS Provider',
    description: 'EdgeTTS voice provider for SillyTavern TTS extension.',
};

const plugin: Plugin = {
    init,
    exit,
    info,
};

export default plugin;
