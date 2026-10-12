#!/usr/bin/env node
// Muted automated playback only. This does not establish listening or human review.
// Usage: node scripts/check_playback.mjs <one.mp4> [two.mp4 ...] --out <new.json>
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {openBrowser} from '@remotion/renderer';

const defaultBrowser = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const require = createRequire(import.meta.url);
const hashFile = async file => {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
};
const inside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

function argumentsFrom(argv) {
  const files = [];
  let out;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') {
      if (out || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Use one --out with a new JSON path');
      out = path.resolve(argv[++i]);
    } else if (argv[i].startsWith('--')) throw new Error(`Unknown argument: ${argv[i]}`);
    else files.push(fs.realpathSync(path.resolve(argv[i])));
  }
  if (!files.length || !out || !/\.json$/iu.test(out)) throw new Error('Usage: check_playback.mjs <one.mp4> [two.mp4 ...] --out <new.json>');
  for (const file of files) {
    if (!/\.mp4$/iu.test(file) || !fs.statSync(file).isFile()) throw new Error(`Not a local MP4 file: ${file}`);
    // Build directories carry an immutable inventory. Playback evidence is separate.
    if (fs.existsSync(path.join(path.dirname(file), 'manifest.json')) && inside(path.dirname(file), out)) {
      throw new Error('Playback JSON must be outside the immutable build directory');
    }
  }
  return {files, out};
}

function rangeFor(header, size) {
  if (!header) return {start: 0, end: size - 1, partial: false};
  const match = /^bytes=(\d*)-(\d*)$/u.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ((first !== null && !Number.isSafeInteger(first)) || (last !== null && !Number.isSafeInteger(last))) return null;
  const start = first === null ? Math.max(0, size - last) : first;
  const end = first === null || last === null ? size - 1 : Math.min(size - 1, last);
  if (size <= 0 || start < 0 || start >= size || end < start || (first === null && last <= 0)) return null;
  return {start, end, partial: true};
}

async function serveOnlyMp4(file) {
  const fd = fs.openSync(file, 'r');
  const sourceStat = fs.fstatSync(fd);
  const size = sourceStat.size;
  const requests = [];
  const errors = [];
  const server = http.createServer((request, response) => {
    const entry = {method: request.method, path: request.url, range: request.headers.range ?? null};
    requests.push(entry);
    if (request.url !== '/video.mp4') {
      entry.status = 404;
      response.writeHead(404, {'Content-Length': '0'}).end();
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      entry.status = 405;
      response.writeHead(405, {Allow: 'GET, HEAD', 'Content-Length': '0'}).end();
      return;
    }
    const range = rangeFor(request.headers.range, size);
    if (!range) {
      entry.status = 416;
      response.writeHead(416, {'Content-Range': `bytes */${size}`, 'Content-Length': '0'}).end();
      return;
    }
    entry.status = range.partial ? 206 : 200;
    entry.start = range.start;
    entry.end = range.end;
    const headers = {
      'Content-Type': 'video/mp4', 'Content-Length': String(range.end - range.start + 1),
      'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    };
    if (range.partial) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`;
    response.writeHead(entry.status, headers);
    if (request.method === 'HEAD') {response.end(); return;}
    let stream;
    try {
      // Every response owns its descriptor. Destroying an aborted ReadStream
      // must never close the descriptor reserved for identity/range probes.
      const streamFd = fs.openSync(file, 'r');
      const currentStat = fs.fstatSync(streamFd);
      if (currentStat.ino !== sourceStat.ino || currentStat.dev !== sourceStat.dev || currentStat.size !== size) {
        fs.closeSync(streamFd);
        throw new Error('MP4 changed while serving its immutable playback input');
      }
      stream = fs.createReadStream(file, {fd: streamFd, autoClose: true, start: range.start, end: range.end});
    } catch (error) {errors.push(String(error)); response.destroy(error); return;}
    stream.on('error', error => {errors.push(String(error)); response.destroy(error);});
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  });
  server.on('clientError', (error, socket) => {errors.push(String(error)); socket.destroy();});
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
  } catch (error) {fs.closeSync(fd); throw error;}
  const url = `http://127.0.0.1:${server.address().port}/video.mp4`;
  return {
    url, size, requests, errors,
    async probe() {
      for (const header of [`bytes=0-${Math.min(31, size - 1)}`, `bytes=-${Math.min(16, size)}`]) {
        const range = rangeFor(header, size);
        const response = await fetch(url, {headers: {Range: header}});
        const bytes = Buffer.from(await response.arrayBuffer());
        const expected = Buffer.alloc(range.end - range.start + 1);
        fs.readSync(fd, expected, 0, expected.length, range.start);
        if (response.status !== 206 || response.headers.get('content-range') !== `bytes ${range.start}-${range.end}/${size}` || !bytes.equals(expected)) throw new Error('Loopback server failed real Range byte verification');
      }
      const invalid = await fetch(url, {headers: {Range: `bytes=${size}-`}});
      const unknown = await fetch(url.replace('/video.mp4', '/other.mp4'));
      if (invalid.status !== 416 || invalid.headers.get('content-range') !== `bytes */${size}` || unknown.status !== 404) throw new Error('Loopback server accepted an invalid range or an unspecified file');
      return {prefixBytes: 'verified', suffixBytes: 'verified', invalidRange: 416, unspecifiedFile: 404};
    },
    async close() {
      await new Promise(resolve => {server.close(resolve); server.closeAllConnections();});
      fs.closeSync(fd);
    },
  };
}

async function playOne(browser, file, index) {
  const result = {file, scope: 'muted automated playback at playbackRate 1; no human viewing or audio listening', status: 'failed', consoleErrors: [], pageErrors: []};
  let page;
  let served;
  try {
    result.mp4Sha256 = await hashFile(file);
    served = await serveOnlyMp4(file);
    result.rangeVerification = await served.probe();
    page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: index,
      onBrowserLog: log => {if (log.type === 'error') result.consoleErrors.push({text: log.text, stackTrace: log.stackTrace});}, onLog: () => {}});
    page.on('error', error => result.pageErrors.push(String(error)));
    await page.goto({url: 'about:blank', timeout: 10000});
    await page.setViewport({width: 1280, height: 800, deviceScaleFactor: 1});
    const started = performance.now();
    result.playback = await page.evaluate(url => new Promise(resolve => {
      const video = document.createElement('video');
      video.muted = true;
      video.defaultMuted = true;
      video.playbackRate = 1;
      video.defaultPlaybackRate = 1;
      video.playsInline = true;
      video.preload = 'auto';
      video.style.cssText = 'display:block;max-width:100vw;max-height:100vh;margin:0 auto;object-fit:contain';
      document.body.style.cssText = 'margin:0;background:#111';
      document.body.append(video);
      const events = [];
      const videoErrors = [];
      const pageErrors = [];
      const violations = [];
      let wallStart = null;
      let initialCurrentTime = null;
      let callbackCount = 0;
      let lastFrameMetadata = null;
      let firstFrameMetadata = null;
      let callbackHandle = null;
      let completed = false;
      let watchdog = setTimeout(() => finish('metadata-timeout'), 30000);
      const pageError = event => pageErrors.push(String(event.message || event.reason || 'Page error'));
      window.addEventListener('error', pageError);
      window.addEventListener('unhandledrejection', pageError);
      function finish(reason) {
        if (completed) return;
        completed = true;
        clearTimeout(watchdog);
        if (callbackHandle !== null) video.cancelVideoFrameCallback(callbackHandle);
        const quality = typeof video.getVideoPlaybackQuality === 'function' ? video.getVideoPlaybackQuality() : null;
        const snapshot = {
          reason, ended: video.ended, duration: Number.isFinite(video.duration) ? video.duration : null,
          initialCurrentTime, currentTime: video.currentTime,
          elapsedWallSeconds: wallStart === null ? null : (performance.now() - wallStart) / 1000,
          playbackRate: video.playbackRate, muted: video.muted, paused: video.paused,
          videoWidth: video.videoWidth, videoHeight: video.videoHeight, readyState: video.readyState,
          decodedFrames: typeof video.webkitDecodedFrameCount === 'number' ? video.webkitDecodedFrameCount : null,
          presentedFrames: lastFrameMetadata?.presentedFrames ?? null,
          droppedFrames: quality?.droppedVideoFrames ?? video.webkitDroppedFrameCount ?? null,
          totalVideoFrames: quality?.totalVideoFrames ?? null,
          corruptedVideoFrames: quality?.corruptedVideoFrames ?? null,
          frameCallbackCount: callbackCount, firstFrameMetadata, lastFrameMetadata,
          videoErrors, pageErrors, violations, events, userAgent: navigator.userAgent,
        };
        window.removeEventListener('error', pageError);
        window.removeEventListener('unhandledrejection', pageError);
        video.pause();
        resolve(snapshot);
      }
      const frameCallback = (now, metadata) => {
        const frame = {mediaTime: metadata.mediaTime, presentedFrames: metadata.presentedFrames, callbackWallTime: now};
        firstFrameMetadata ??= frame;
        lastFrameMetadata = frame;
        callbackCount++;
        if (!completed) callbackHandle = video.requestVideoFrameCallback(frameCallback);
      };
      for (const type of ['playing', 'waiting', 'stalled', 'seeking', 'seeked', 'pause', 'ratechange', 'volumechange']) {
        video.addEventListener(type, () => {
          if (completed) return;
          events.push({type, currentTime: video.currentTime, wallSeconds: wallStart === null ? null : (performance.now() - wallStart) / 1000});
          if (wallStart === null) return;
          if (type === 'seeking') violations.push('Seeking occurred during continuous playback');
          if (type === 'pause' && !video.ended) violations.push('Playback paused before the end');
          if (video.playbackRate !== 1) violations.push('Playback rate changed from 1');
          if (!video.muted) violations.push('Playback became unmuted');
        });
      }
      video.addEventListener('error', () => {
        videoErrors.push({code: video.error?.code ?? null, message: video.error?.message ?? 'Unknown video error'});
        finish('video-error');
      });
      video.addEventListener('ended', () => finish('ended'));
      video.addEventListener('loadedmetadata', async () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) {videoErrors.push({message: 'Invalid browser media duration'}); finish('invalid-duration'); return;}
        if (typeof video.requestVideoFrameCallback !== 'function') {videoErrors.push({message: 'Presented-frame API is unavailable'}); finish('frame-api-unavailable'); return;}
        clearTimeout(watchdog);
        watchdog = setTimeout(() => finish('playback-timeout'), (video.duration + Math.max(30, video.duration * .25)) * 1000);
        initialCurrentTime = video.currentTime;
        wallStart = performance.now();
        callbackHandle = video.requestVideoFrameCallback(frameCallback);
        try {await video.play();}
        catch (error) {videoErrors.push({message: String(error)}); finish('play-rejected');}
      }, {once: true});
      video.src = url;
      video.load();
    }), served.url);
    result.nodeElapsedSeconds = (performance.now() - started) / 1000;
    result.mp4Sha256After = await hashFile(file);
    const playback = result.playback;
    result.checks = {
      reachedEnded: playback.reason === 'ended' && playback.ended,
      beganAtZero: playback.initialCurrentTime !== null && playback.initialCurrentTime <= .05,
      reachedDuration: playback.duration !== null && Math.abs(playback.currentTime - playback.duration) <= .1,
      normalSpeed: playback.playbackRate === 1 && playback.elapsedWallSeconds !== null && playback.elapsedWallSeconds >= playback.duration * .95 && playback.elapsedWallSeconds <= playback.duration + Math.max(3, playback.duration * .15),
      continuouslyMuted: playback.muted && playback.violations.length === 0,
      framesDecodedAndPresented: playback.decodedFrames > 0 && playback.presentedFrames > 0,
      errorFree: playback.videoErrors.length === 0 && playback.pageErrors.length === 0 && result.consoleErrors.length === 0 && result.pageErrors.length === 0 && served.errors.length === 0,
      unchangedMp4: result.mp4Sha256 === result.mp4Sha256After,
    };
    // Dropped frames are observed and retained separately, never rewritten as zero.
    result.frameDropsObserved = playback.droppedFrames > 0;
    result.status = Object.values(result.checks).every(Boolean) ? 'passed' : 'failed';
  } catch (error) {result.error = String(error.stack || error);}
  finally {
    if (served) {result.httpRequests = served.requests; result.serverErrors = served.errors;}
    try {if (page) await page.close();} catch (error) {result.pageErrors.push(`Cleanup: ${error}`); result.status = 'failed';}
    try {if (served) await served.close();} catch (error) {result.serverErrors.push(`Cleanup: ${error}`); result.status = 'failed';}
  }
  return result;
}

async function main() {
  const {files, out} = argumentsFrom(process.argv.slice(2));
  fs.mkdirSync(path.dirname(out), {recursive: true});
  // Hold an exclusively created descriptor. An existing result is never replaced.
  const reportFd = fs.openSync(out, 'wx');
  const report = {schemaVersion: 'heige-playback/1', status: 'failed', createdAt: new Date().toISOString(),
    scope: 'muted automated normal-speed continuous browser playback',
    humanReview: 'not performed', audioListening: 'not performed', results: []};
  let browser;
  try {
    const executable = fs.realpathSync(process.env.HEIGE_PLAYBACK_BROWSER_PATH || defaultBrowser);
    fs.accessSync(executable, fs.constants.X_OK);
    const version = spawnSync(executable, ['--version'], {encoding: 'utf8', timeout: 10000});
    if (version.error || version.status !== 0) throw new Error(`Cannot read local browser version: ${version.error || version.stderr}`);
    report.browser = {executable, version: version.stdout.trim(), sha256: await hashFile(executable), headless: true, remotionVersion: require('@remotion/renderer/package.json').version};
    browser = await openBrowser('chrome', {browserExecutable: executable, chromeMode: 'chrome-for-testing', chromiumOptions: {headless: true, gl: null}, logLevel: 'error'});
    for (const [index, file] of files.entries()) {
      console.log(`Playback ${index + 1}/${files.length}: ${file}`);
      const result = await playOne(browser, file, index);
      report.results.push(result);
      console.log(`${result.status.toUpperCase()}: ended=${result.playback?.ended ?? false}, duration=${result.playback?.duration ?? 'unknown'}, elapsed=${result.playback?.elapsedWallSeconds?.toFixed(3) ?? 'unknown'}, decoded=${result.playback?.decodedFrames ?? 'unknown'}, presented=${result.playback?.presentedFrames ?? 'unknown'}, dropped=${result.playback?.droppedFrames ?? 'unknown'}`);
    }
    report.status = report.results.every(result => result.status === 'passed') ? 'passed' : 'failed';
  } catch (error) {report.error = String(error.stack || error);}
  finally {
    try {if (browser) await browser.close({silent: true});}
    catch (error) {report.cleanupError = String(error); report.status = 'failed';}
    report.completedAt = new Date().toISOString();
    fs.writeFileSync(reportFd, JSON.stringify(report, null, 2) + '\n');
    fs.closeSync(reportFd);
  }
  console.log(`Playback report (${report.status}): ${out}`);
  if (report.status !== 'passed') process.exitCode = 1;
}

main().catch(error => {console.error(String(error.stack || error)); process.exitCode = 1;});
