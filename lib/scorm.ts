import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import archiver from "archiver";
import { getProject, listAssets, listSteps } from "@/lib/repo";
import { readStorageObject, storageFileName, writeStorageObject } from "@/lib/storage";

function buildManifest(projectId: string, title: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${projectId}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <organizations default="ORG1">
    <organization identifier="ORG1">
      <title>${title}</title>
      <item identifier="ITEM1" identifierref="RES1">
        <title>${title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html" />
      <file href="scorm_api.js" />
    </resource>
  </resources>
</manifest>`;
}

function scormApiJs(): string {
  return `function findAPI(win){
  var tries = 0;
  while(win){
    try {
      if (win.API) return win.API;
    } catch (e) {}
    if (!win.parent || win.parent === win) break;
    win = win.parent;
    tries += 1;
    if (tries > 20) break;
  }
  return null;
}

function getAPI(win){
  var found = findAPI(win);
  if (found) return found;
  try {
    if (win.opener && win.opener !== win) return findAPI(win.opener);
  } catch (e) {}
  return null;
}

var api = null;
var lastError = "";
function normalize(result){
  return result === true || result === "true";
}
function readLastError(){
  if(!api || !api.LMSGetLastError) return "";
  try {
    var code = api.LMSGetLastError();
    if(!code || code === "0") return "";
    if(api.LMSGetErrorString){
      return String(code) + ": " + api.LMSGetErrorString(code);
    }
    return String(code);
  } catch (e) {
    return "";
  }
}
function scormInit(){
  api = getAPI(window);
  if(!api || !api.LMSInitialize){
    lastError = "SCORM API를 찾지 못했습니다.";
    return false;
  }
  try {
    var ok = normalize(api.LMSInitialize(""));
    lastError = ok ? "" : (readLastError() || "LMSInitialize 실패");
    return ok;
  } catch (e) {
    lastError = "LMSInitialize 예외: " + (e && e.message ? e.message : e);
    return false;
  }
}

function scormComplete(){
  if(!api && !scormInit()) return false;
  try {
    var okSet = normalize(api.LMSSetValue("cmi.core.lesson_status", "completed"));
    if(!okSet){
      lastError = readLastError() || "LMSSetValue 실패";
      return false;
    }
    var okCommit = normalize(api.LMSCommit(""));
    if(!okCommit){
      lastError = readLastError() || "LMSCommit 실패";
      return false;
    }
    var okFinish = normalize(api.LMSFinish(""));
    if(!okFinish){
      lastError = readLastError() || "LMSFinish 실패";
      return false;
    }
    lastError = "";
    return true;
  } catch (e) {
    lastError = "완료 처리 예외: " + (e && e.message ? e.message : e);
    return false;
  }
}
function scormLastError(){
  return lastError || readLastError() || "";
}`;
}

function buildIndexHtml(
  title: string,
  steps: Array<{
    title: string;
    instruction: string;
    highlight: { x: number; y: number; w: number; h: number };
    assetPath: string;
    audioPath: string | null;
  }>
): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<script src="scorm_api.js"></script>
<style>
  body{margin:0;font-family:Arial,sans-serif;background:#0f172a;color:#f8fafc}
  .wrap{max-width:1100px;margin:24px auto;padding:16px}
  .media{position:relative;background:#111827;border-radius:12px;overflow:hidden}
  img{width:100%;height:auto;display:block}
  .hl{position:absolute;border:3px solid #f59e0b;background:rgba(245,158,11,.2);pointer-events:none}
  .card{background:#1e293b;padding:14px;border-radius:12px;margin-top:14px}
  .row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
  button{border:none;background:#2563eb;color:white;padding:10px 14px;border-radius:10px;cursor:pointer}
  button[disabled]{opacity:.35;cursor:not-allowed}
  .status{margin-top:10px;font-size:14px;opacity:.92}
</style>
</head>
<body onload="render();scormInit();">
<div class="wrap">
  <h1 id="title"></h1>
  <div class="media">
    <img id="img" alt="step image" />
    <div id="hl" class="hl"></div>
  </div>
  <div class="card">
    <div id="stepTitle"></div>
    <p id="instruction"></p>
    <div class="row">
      <span id="progress"></span>
      <div>
        <button id="back" onclick="prev()">Back</button>
        <button id="next" onclick="next()">Next</button>
        <button id="audio" onclick="playAudio()">Audio</button>
        <button id="complete" onclick="complete()" style="display:none">완료</button>
      </div>
    </div>
    <audio id="audioPlayer" preload="none"></audio>
    <div id="status" class="status"></div>
  </div>
</div>
<script>
  const tutorialTitle = ${JSON.stringify(title)};
  const steps = ${JSON.stringify(steps)};
  let idx = 0;

  function pct(v){ return Math.max(0, Math.min(100, Number(v)||0)); }

  function render(){
    const s = steps[idx];
    document.getElementById('title').textContent = tutorialTitle;
    document.getElementById('stepTitle').textContent = s.title;
    document.getElementById('instruction').textContent = s.instruction;
    const img = document.getElementById('img');
    img.src = s.assetPath;
    document.getElementById('progress').textContent = (idx+1) + '/' + steps.length;
    const audioBtn = document.getElementById('audio');
    const audioPlayer = document.getElementById('audioPlayer');
    if(s.audioPath){
      audioBtn.style.display = 'inline-block';
      audioPlayer.src = s.audioPath;
    } else {
      audioBtn.style.display = 'none';
      audioPlayer.removeAttribute('src');
    }

    img.onload = function(){
      const hl = document.getElementById('hl');
      const raw = s.highlight || {x:0,y:0,w:0,h:0};
      const looksLikePixels = raw.x > 100 || raw.y > 100 || raw.w > 100 || raw.h > 100;
      let x = raw.x, y = raw.y, w = raw.w, h = raw.h;
      if(looksLikePixels && img.naturalWidth > 0 && img.naturalHeight > 0){
        x = (raw.x / img.naturalWidth) * 100;
        y = (raw.y / img.naturalHeight) * 100;
        w = (raw.w / img.naturalWidth) * 100;
        h = (raw.h / img.naturalHeight) * 100;
      }
      hl.style.left = pct(x) + '%';
      hl.style.top = pct(y) + '%';
      hl.style.width = pct(w) + '%';
      hl.style.height = pct(h) + '%';
    };

    document.getElementById('back').disabled = idx === 0;
    document.getElementById('next').style.display = idx === steps.length - 1 ? 'none' : 'inline-block';
    document.getElementById('complete').style.display = idx === steps.length - 1 ? 'inline-block' : 'none';
  }

  function prev(){ if(idx>0){ idx--; render(); } }
  function next(){ if(idx<steps.length-1){ idx++; render(); } }
  function playAudio(){
    const player = document.getElementById('audioPlayer');
    if(player){ player.play(); }
  }
  function complete(){
    const ok = scormComplete();
    const el = document.getElementById('status');
    if(ok){
      el.textContent = 'Completed 상태를 LMS에 기록했습니다.';
      el.style.color = '#22c55e';
    } else {
      const reason = (typeof scormLastError === 'function' ? scormLastError() : '') || '원인 미상';
      el.textContent = 'LMS 기록 실패: ' + reason;
      el.style.color = '#fca5a5';
    }
  }
</script>
</body>
</html>`;
}

export async function buildScormZip(projectId: string): Promise<string> {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const steps = await listSteps(projectId);
  const assets = await listAssets(projectId);
  const byId = new Map(assets.map((a) => [a.id, a]));

  const extFromAsset = (filePath: string, mimeType: string): string => {
    const ext = path.extname(storageFileName(filePath)).toLowerCase();
    if (ext) return ext;
    if (mimeType === "image/jpeg") return ".jpg";
    if (mimeType === "image/webp") return ".webp";
    if (mimeType === "image/gif") return ".gif";
    if (mimeType === "image/svg+xml") return ".svg";
    if (mimeType === "audio/mpeg") return ".mp3";
    return ".bin";
  };

  const prepared: Array<{
    title: string;
    instruction: string;
    highlight: { x: number; y: number; w: number; h: number };
    assetPath: string;
    audioPath: string | null;
    assetBuffer: Buffer;
    audioBuffer: Buffer | null;
  }> = [];
  const ordered = steps.filter((s) => s.assetId);
  for (let i = 0; i < ordered.length; i += 1) {
    const s = ordered[i];
    const asset = byId.get(s.assetId as string);
    if (!asset) {
      throw new Error(`Missing asset for step ${s.stepNo}`);
    }
    const audioAsset = s.ttsAssetId ? byId.get(s.ttsAssetId) : null;
    const ext = extFromAsset(asset.filePath, asset.mimeType);
    const assetPath = `assets/step-${String(i + 1).padStart(2, "0")}${ext}`;
    const assetBuffer = await readStorageObject(asset.filePath);

    let audioPath: string | null = null;
    let audioBuffer: Buffer | null = null;
    if (audioAsset) {
      const audioExt = extFromAsset(audioAsset.filePath, audioAsset.mimeType);
      audioPath = `assets/step-${String(i + 1).padStart(2, "0")}-audio${audioExt}`;
      audioBuffer = await readStorageObject(audioAsset.filePath);
    }

    prepared.push({
      title: s.title,
      instruction: s.instruction,
      highlight: s.highlight,
      assetPath,
      audioPath,
      assetBuffer,
      audioBuffer
    });
  }

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "flowtutor-export-"));
  const localZipPath = path.join(tempDir, `${projectId}-${Date.now()}.zip`);

  try {
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(localZipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => resolve());
      archive.on("error", (err) => reject(err));

      archive.pipe(output);

      const scormSteps = prepared.map((s) => ({
        title: s.title,
        instruction: s.instruction,
        highlight: s.highlight,
        assetPath: s.assetPath,
        audioPath: s.audioPath
      }));

      for (const s of prepared) {
        archive.append(s.assetBuffer, { name: s.assetPath });
        if (s.audioPath && s.audioBuffer) {
          archive.append(s.audioBuffer, { name: s.audioPath });
        }
      }

      archive.append(buildManifest(projectId, project.tutorialTitle ?? project.title), { name: "imsmanifest.xml" });
      archive.append(scormApiJs(), { name: "scorm_api.js" });
      archive.append(buildIndexHtml(project.tutorialTitle ?? project.title, scormSteps), { name: "index.html" });

      archive.finalize();
    });

    const zipBuffer = await fsp.readFile(localZipPath);
    const zipName = `${projectId}-${Date.now()}.zip`;
    const locator = await writeStorageObject({
      category: "exports",
      projectId,
      fileName: zipName,
      body: zipBuffer,
      contentType: "application/zip"
    });
    return locator;
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
