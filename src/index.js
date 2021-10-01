import "./simple.min.css";
import * as pako from "pako";
import { HttpAgent, Cbor } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { stringify } from "bigint-json-native";
import { send_message, try_decode } from "./bare-agent.js";

const data = {
  version: 1,
  creation: "2021-06-05 21:32:28 UTC",
  expiration: "2021-06-05 21:37:28 UTC",
  network: "https://ic0.app",
  call_type: "query",
  sender: "y5mgz-ye6pv-bg3mu-purwq-cowuz-gkva5-hdsrv-leuqd-53hfi-kyjr4-oae",
  canister_id: "k54e2-ciaaa-aaaab-aaaka-cai",
  method_name: "remaining_cycles",
  arg: [68, 73, 68, 76, 0, 0],
  request_id: null,
  content:
    "d9d9f7a367636f6e74656e74a66c726571756573745f747970656571756572796e696e67726573735f6578706972791b1685cd5ef1accd406673656e646572581d9e7d426db28fa46d013ad4c9955074e3946ab25203eece542b098f1c026b63616e69737465725f69644a000000000020001401016b6d6574686f645f6e616d657072656d61696e696e675f6379636c657363617267464449444c00006d73656e6465725f7075626b6579582c302a300506032b6570032100702ea1af2d7dd450a2d82ec233726cd1c7473471831b1fe085921ca66710c5cc6a73656e6465725f7369675840554ca488a01da25179a004f40e07bc66b2c96d9aa46fdffe815480ccdb71df80423d8ef6b1f1031ee3fe4b2a249aafff61cfbcaccf293f9e551144923bd40308",
};

function fromHexString(hexString) {
  return new Uint8Array(
    (hexString.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16))
  );
}

import { scanImageData } from "zbar.wasm";
const SCAN_PROID_MS = 800;

function resize_canvas() {
  var video = document.getElementById("video");
  var canvas = document.getElementById("canvas");
  canvas.width = video.offsetWidth;
  canvas.height = video.offsetHeight;
}

async function init() {
  window.onresize = resize_canvas;
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: "environment" },
  });
  const scan_button = document.getElementById("scan");
  scan_button.onclick = toggle_input;
  const video = document.getElementById("video");
  video.srcObject = mediaStream;
  video.setAttribute("playsinline", "");
  video.play();
  await new Promise((r) => {
    video.onloadedmetadata = r;
  });
  resize_canvas();
}

function render(symbols, image_width, image_height) {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const xfactor = width / image_width;
  const yfactor = height / image_height;
  ctx.clearRect(0, 0, width, height);
  ctx.font = "20px serif";
  ctx.strokeStyle = "#00ff00";
  ctx.fillStyle = "#ff0000";
  ctx.lineWidth = 6;
  for (let i = 0; i < symbols.length; ++i) {
    const sym = symbols[i];
    const points = sym.points;
    ctx.beginPath();
    for (let j = 0; j < points.length; ++j) {
      const { x, y } = points[j];
      if (j === 0) {
        ctx.moveTo(x * xfactor, y * yfactor);
      } else {
        ctx.lineTo(x * xfactor, y * yfactor);
      }
    }
    ctx.closePath();
    ctx.stroke();
    //ctx.fillText("#" + i, points[0].x, points[0].y - 10);
  }
}

// Expect string or binary buffer as input
async function decode_to_json(data) {
  if (!(data === data + "")) {
    // decode gzip if header matches
    if (data.length >= 2 && data[0] == 0x1f && data[1] == 0x8b) {
      try {
        data = pako.inflate(data, { to: "string" });
      } catch (err) {
        return { err: err.toString() };
      }
    } else {
      data = String.fromCharCode.apply(null, data);
    }
  }
  // data is a string by now
  if (data.startsWith("http")) {
    if (data.startsWith("https://p5deo-6aaaa-aaaab-aaaxq-cai")) {
      // strip URL when it is meant for this app
      let i = data.indexOf("/?msg=");
      if (i > 0) {
        return decode_to_json(decodeURIComponent(data.substring(i + 6)));
      }
    } else {
      // Or return a normal URL
      return { content: data };
    }
  }
  try {
    // try decode base64
    data = atob(data);
    // It could also have gzip header
    if (
      data.length >= 2 &&
      data.charCodeAt(0) == 0x1f &&
      data.charCodeAt(1) == 0x8b
    ) {
      return decode_to_json(Buffer.from(data, "binary"));
    }
  } catch (e) {}
  // decode JSON
  try {
    var json = JSON.parse(data);
    if (Array.isArray(json)) {
      if (json.length == 1) {
        return json[0];
      } else {
        return {
          err:
            "Expect a single JSON object, but got an array of length " +
            json.length,
        };
      }
    }
    return json;
  } catch (err) {
    return { err: err.toString() };
  }
}

var input_type = "video";
var scan_paused = false;
async function scan() {
  if (scan_paused) {
    return;
  }
  // Remove existing scanned results if any
  const image = document.createElement("canvas");
  const video = document.getElementById("video");
  const width = video.videoWidth;
  const height = video.videoHeight;
  image.width = width;
  image.height = height;
  const ctx = image.getContext("2d");
  ctx.drawImage(video, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const res = await scanImageData(imgData);
  if (res.length > 0) {
    let message = await decode_to_json(res[0].data);
    if (message.err) {
      let [result, pre] = get_result_and_pre();
      pre.innerText = "Error decoding message: " + message.err;
    } else {
      render(res, width, height);
      await prepare_send(message);
    }
  }
}

function clear_result() {
  const result = document.getElementById("result");
  while (result.firstChild) {
    result.removeChild(result.lastChild);
  }
}

function get_result_and_pre() {
  const result = document.getElementById("result");
  let pre;
  if (result.firstChild) {
    pre = result.firstChild;
  } else {
    pre = document.createElement("pre");
    result.appendChild(pre);
  }
  return [result, pre];
}

async function prepare_send(message) {
  scan_paused = true;
  if (input_type == "video") {
    const scan_button = document.getElementById("scan");
    scan_button.innerText = "Again";
    scan_button.onclick = resume_scan;
    document.getElementById("video").pause();
  }
  var [result, pre] = get_result_and_pre();
  const content = message.ingress ? message.ingress.content : message.content;
  if (!content) {
    pre.innerText = "Unsupported message format";
    return;
  }
  var action = "Send";
  // shortcut for normal URL
  if (content == content + "" && content.startsWith("http")) {
    pre.innerText = content;
    action = "Go";
  } else {
    const ingress = Cbor.decode(fromHexString(content));
    if (!ingress || !ingress.content) {
      pre.innerText = "Unsupported message format";
      return;
    }
    const canister_id = new Principal(ingress.content.canister_id).toString();
    const args = await try_decode(
      canister_id,
      ingress.content.method_name,
      ingress.content.arg,
      false
    );
    const text =
      "Request type : " +
      ingress.content.request_type +
      "\nSender       : " +
      new Principal(ingress.content.sender).toString() +
      "\nCanister id  : " +
      canister_id +
      "\nMethod name  : " +
      ingress.content.method_name +
      "\nArguments    : " +
      (typeof args == "string" ? args : "(" + stringify(args, null, 2) + ")");
    pre.innerText = text;
  }
  var button = document.getElementById("send");
  if (!button) {
    button = document.createElement("button");
    button.id = "send";
  }
  button.innerHTML = action;
  button.onclick = do_send(message);
  result.appendChild(button);
}

function do_send(message) {
  if (
    message.content &&
    message.content == message.content + "" &&
    message.content.startsWith("http")
  ) {
    return () => {
      window.location.href = message.content;
    };
  } else {
    return async () => {
      const send_button = document.getElementById("send");
      send_button.disabled = true;
      send_button.innerHTML = "Sent";
      const result = document.getElementById("result");
      const pre = document.createElement("pre");
      pre.id = "status";
      const copy_button = document.createElement("button");
      copy_button.id = "copy";
      copy_button.innerHTML = "Copy";
      copy_button.style.display = "none";
      copy_button.onclick = () => {
        const txt = document.createElement("textarea");
        txt.value = pre.innerText;
        txt.setAttribute("readonly", "");
        txt.style = { position: "absolute", left: "-9999px" };
        result.appendChild(txt);
        txt.select();
        document.execCommand("copy");
        result.removeChild(txt);
      };
      result.appendChild(pre);
      result.appendChild(copy_button);
      const update_status = (reply, replied) => {
        var quote = (s) => s;
        if (replied) {
          copy_button.style.display = "block";
        } else {
          quote = (s) => "Waiting for response: " + s;
        }
        let text = typeof reply == "string" ? reply : stringify(reply, null, 2);
        pre.innerText = quote(text);
      };
      await send_message(message, update_status, sleep);
    };
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function toggle_input(e) {
  const video_box = document.getElementById("video_box");
  const text_box = document.getElementById("text_box");
  const message_area = document.getElementById("message");
  const scan_button = document.getElementById("scan");
  if (input_type == "video") {
    document.getElementById("video").pause();
    input_type = "text";
    scan_button.innerText = "Switch to video";
    video_box.hidden = true;
    text_box.hidden = false;
    message_area.value = "";
    message_area.oninput = prepare_text;
  } else {
    document.getElementById("video").play();
    input_type = "video";
    scan_button.innerText = "Switch to text";
    video_box.hidden = false;
    text_box.hidden = true;
  }
  clear_result();
}

function prepare_text() {
  const message = document.getElementById("message");
  try {
    let value = JSON.parse(message.value);
    if (typeof value == "object") {
      prepare_send(value);
    }
  } catch (err) {
    clear_result();
  }
}

function resume_scan() {
  scan_paused = false;
  const scan_button = document.getElementById("scan");
  scan_button.onclick = toggle_input;
  clear_result();
  if (input_type == "video") {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById("video").play();
    scan_button.innerText = "Switch to text";
  } else {
    document.getElementById("message").value = "";
    scan_button.innerText = "Switch to video";
  }
}

async function main() {
  const params = new URLSearchParams(window.location.search);
  function only_text() {
    clear_result();
    toggle_input();
    const scan_button = document.getElementById("scan");
    scan_button.innerText = "(video disabled)";
    scan_button.disabled = true;
  }
  const msg = params.get("msg");
  if (msg) {
    const message = await decode_to_json(decodeURIComponent(msg));
    if (input_type == "video") {
      only_text();
    }
    if (message.err) {
      let [result, pre] = get_result_and_pre();
      pre.innerText = "Error decoding message: " + message.err;
    } else {
      document.getElementById("message").value = stringify(message, null, 2);
      await prepare_send(message);
    }
    return;
  }
  try {
    await init();
    while (true) {
      await scan();
      await sleep(SCAN_PROID_MS);
    }
  } catch (err) {
    clear_result();
    only_text();
    throw err;
  }
}

window.addEventListener("load", main);
