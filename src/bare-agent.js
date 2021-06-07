import {
  RequestStatusResponseStatus,
  HttpAgent,
  Cbor,
  Certificate,
  requestIdOf,
  toHex,
} from "@dfinity/agent";
import { IDL, blobFromText } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";

function fromHexString(hexString) {
  return new Uint8Array(
    (hexString.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16))
  );
}

async function query(content) {
  const ingress = Cbor.decode(content);
  const canister_id = new Principal(ingress.content.canister_id);
  let response = await fetch(
    "https://ic0.app/api/v2/canister/" + canister_id.toString() + "/query",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/cbor",
      },
      body: content,
    }
  );
  if (response.status != 200) {
    let reply = await response.text();
    return "Error: " + response.status + "\n" + reply;
    return reply;
  } else {
    let blob = await response.blob();
    let data = await blob.arrayBuffer();
    console.log(data);
    let reply = Cbor.decode(Buffer.from(data));
    console.log(reply);
    //console.log(IDL.decode([IDL.Nat], reply.reply.arg));
    return reply;
  }
}

async function call(content) {
  const ingress = Cbor.decode(content);
  const canister_id = new Principal(ingress.content.canister_id);
  let response = await fetch(
    "https://ic0.app/api/v2/canister/" + canister_id.toString() + "/call",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/cbor",
      },
      body: content,
    }
  );
  if (response.status != 202) {
    let reply = await response.text();
    return "Error: " + response.status + "\n" + reply;
  } else {
    return "Submitted (request status is unknown)";
  }
}

async function read_state(canister_id, request_id, content) {
  let response = await fetch(
    "https://ic0.app/api/v2/canister/" + canister_id.toString() + "/read_state",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/cbor",
      },
      body: content,
    }
  );
  if (!response.ok) {
    let text = await response.text();
    return "Error: " + response.status + "\n" + text;
  } else {
    let blob = await response.blob();
    let data = await blob.arrayBuffer();
    console.log(data);
    let result = Cbor.decode(Buffer.from(data));
    console.log(result);
    let path = [blobFromText("request_status"), request_id];
    let reply = await verify_certificate(result, path);
    return reply;
  }
}

let agent = new HttpAgent({ host: "https://ic0.app" });
async function verify_certificate(state, path) {
  const cert = new Certificate(state, agent);
  const verified = await cert.verify();
  if (!verified) {
    return "Error: Fail to verify certificate";
  }
  const maybeBuf = cert.lookup([...path, blobFromText("status")]);
  let request_status;
  if (typeof maybeBuf === "undefined") {
    // Missing requestId means we need to wait
    request_status = RequestStatusResponseStatus.Unknown;
  } else {
    request_status = maybeBuf.toString();
  }
  console.log(request_status);
  switch (request_status) {
    case RequestStatusResponseStatus.Replied: {
      return {
        status: request_status,
        reply: cert.lookup([...path, blobFromText("reply")]),
      };
    }
    case RequestStatusResponseStatus.Received:
    case RequestStatusResponseStatus.Unknown:
    case RequestStatusResponseStatus.Processing:
      return { status: request_status };

    case RequestStatusResponseStatus.Rejected: {
      const rejectCode = cert.lookup([...path, blobFromText("reject_code")]);
      const rejectMessage = cert
        .lookup([...path, blobFromText("reject_message")])
        .toString();
      return (
        `Call was rejected:\n` +
        `  Request ID: ${toHex(path[1])}\n` +
        `  Reject code: ${toHex(rejectCode)}\n` +
        `  Reject text: ${rejectMessage}\n`
      );
    }

    case RequestStatusResponseStatus.Done:
      // This is _technically_ not an error, but we still didn't see the `Replied` status so
      // we don't know the result and cannot decode it.
      return (
        `Call was marked as done but we never saw the reply:\n` +
        `  Request ID: ${requestIdToHex(requestId)}\n`
      );
  }
}

export async function send_message(message, update_status, sleep) {
  try {
    if (message.call_type == "query") {
      let reply = await query(fromHexString(message.content));
      update_status(reply);
    } else {
      // Update call, handle json format of both nano and dfx
      const ingress_content = message.ingress
        ? message.ingress.content
        : message.content;
      await call(fromHexString(ingress_content));
      console.log("Message sent");
      let status_content;
      let request_id;
      let canister_id;
      if (message.request_status) {
        status_content = message.request_status.content;
        if (!status_content) throw "Missing request_status field";
        request_id = message.request_status.request_id;
        canister_id = message.request_status.canister_id;
      } else {
        status_content = message.signed_request_status;
        if (!status_content) throw "Missing signed_request_status field";
        request_id = message.request_id;
        canister_id = message.canister_id;
      }
      if (!request_id) throw "Missing request_id field";
      if (!canister_id) throw "Missing canister_id field";
      while (true) {
        let reply = await read_state(
          Principal.fromText(canister_id),
          fromHexString(request_id),
          fromHexString(status_content)
        );
        update_status(reply);
        if (reply.status && reply.status != "replied") {
          sleep();
          continue;
        } else {
          break;
        }
      }
    }
  } catch (err) {
    update_status("Unsupported message format:\n" + JSON.stringify(err));
  }
}
