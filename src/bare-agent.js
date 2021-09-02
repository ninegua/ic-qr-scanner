import {
  RequestStatusResponseStatus,
  HttpAgent,
  Actor,
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

async function query(canister_id, content) {
  let response = await fetch(
    "https://ic0.app/api/v2/canister/" + canister_id + "/query",
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
    let reply = Cbor.decode(Buffer.from(data));
    return reply;
  }
}

async function call(canister_id, content) {
  let response = await fetch(
    "https://ic0.app/api/v2/canister/" + canister_id + "/call",
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
    "https://ic0.app/api/v2/canister/" + canister_id + "/read_state",
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
    let result = Cbor.decode(Buffer.from(data));
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
  switch (request_status) {
    case RequestStatusResponseStatus.Replied: {
      return {
        status: request_status,
        reply: {
          arg: cert.lookup([...path, blobFromText("reply")]),
        },
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
      let ingress_content = fromHexString(message.content);
      let ingress = Cbor.decode(ingress_content);
      let canister_id = new Principal(ingress.content.canister_id).toString();
      let method_name = ingress.content.method_name;
      let reply = await query(canister_id, ingress_content);
      update_status(await try_decode(canister_id, method_name, reply.reply.arg, true), true);
    } else {
      // Update call, handle json format of both nano and dfx
      const ingress_content = fromHexString(
        message.ingress ? message.ingress.content : message.content
      );
      let ingress = Cbor.decode(ingress_content);
      let canister_id = new Principal(ingress.content.canister_id).toString();
      let method_name = ingress.content.method_name;
      await call(canister_id, ingress_content);
      let status_content;
      let request_id;
      if (message.request_status) {
        status_content = message.request_status.content;
        if (!status_content) throw "Missing request_status field";
        request_id = message.request_status.request_id;
      } else {
        status_content = message.signed_request_status;
        if (!status_content) throw "Missing signed_request_status field";
        request_id = message.request_id;
      }
      if (!request_id) throw "Missing request_id field";
      if (!canister_id) throw "Missing canister_id field";
      while (true) {
        let reply = await read_state(
          canister_id,
          fromHexString(request_id),
          fromHexString(status_content)
        );
        if (reply.status && reply.status != "replied") {
          update_status(reply);
          sleep();
          continue;
        } else {
          if (reply.status == "replied") {
            update_status(
              await try_decode(canister_id, method_name, reply.reply.arg, true),
              true
            );
          } else {
            update_status(reply, true);
          }
          break;
        }
      }
    }
  } catch (err) {
    update_status("Unsupported message format:\n" + JSON.stringify(err));
  }
}

function lookup(dict, name) {
  for (var i = 0; i < dict.length; i++) {
    if (dict[i][0] == name) return dict[i][1];
  }
}

const CANDID_UI_CANISTER_ID = "a4gq6-oaaaa-aaaab-qaa4q-cai";
const CANLISTA_CANISTER_ID = "kyhgh-oyaaa-aaaae-qaaha-cai";

const getCandidHack_interface = ({ IDL }) =>
  IDL.Service({
    __get_candid_interface_tmp_hack: IDL.Func([], [IDL.Text], ["query"]),
  });

const getCandid_interface = ({ IDL }) =>
  IDL.Service({
    getCandid: IDL.Func(
      [IDL.Principal],
      [
        IDL.Variant({
          ok: IDL.Record({ did: IDL.Text, approvedByController: IDL.Bool }),
          err: IDL.Variant({ noCandidFound: IDL.null }),
        }),
      ],
      ["query"]
    ),
  });

// Try to decode reply using known did files
export async function try_decode(canister_id, method_name, msg, isReply) {
  try {
    var did;
    // Try fetch i using __get_candid_interface_tmp_hack.
    try {
      did = await Actor.createActor(getCandidHack_interface, {
        agent,
        canisterId: canister_id,
      }).__get_candid_interface_tmp_hack();
    } catch (e) {
      console.log(e);
    }
    if (!did) {
      // Try fetch i from canlista kyhgh-oyaaa-aaaae-qaaha-cai
      try {
        did = await Actor.createActor(getCandid_interface, {
          agent,
          canisterId: CANLISTA_CANISTER_ID,
        }).getCandid(Principal.fromText(canister_id));
      } catch (e) {
        console.log(e);
      }
      if (did.ok) {
        did = did.ok.did;
      } else {
        did = null;
      }
    }
    if (did) {
      let result = await agent.query(CANDID_UI_CANISTER_ID, {
        methodName: "did_to_js",
        arg: IDL.encode([IDL.Text], [did]),
      });
      switch (result.status) {
        case "rejected":
          throw "query call rejected";
        case "replied": {
          let arg = IDL.decode(
            [IDL.Opt(IDL.Text)],
            Buffer.from(result.reply.arg)
          );
          if (arg.length > 0) {
            let js = arg[0];
            let dataUri =
              "data:text/javascript;base64," +
              Buffer.from(js.toString()).toString("base64");
            let mod = await eval('import("' + dataUri + '")');
            let services = mod.default({ IDL });
            let func = lookup(services._fields, method_name);
            let funcTypes = func.retTypes;
            if (!isReply) {
              funcTypes = func.argTypes;
            }
            msg = IDL.decode(funcTypes, Buffer.from(msg));
            msg = funcTypes
              .map((t, i) => t.valueToString(msg[i]))
              .toString();
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
  return msg;
}
