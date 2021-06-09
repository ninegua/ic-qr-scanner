#! /usr/bin/env bash
# This tool is taken from https://p5deo-6aaaa-aaaab-aaaxq-cai.raw.ic0.app/.

set -e
function mkC() {
echo "char msg[] = {"
cat $1 | xxd -p | sed 's/../0x&,/g'
echo "};"
cat<<EOF
#define WASM_IMPORT(m,n) __attribute__((import_module(m))) __attribute__((import_name(n)));
#define WASM_EXPORT(n) asm(n) __attribute__((visibility("default")))

void reply_data_append(void *, int) WASM_IMPORT("ic0", "msg_reply_data_append");
void reply(void) WASM_IMPORT("ic0", "msg_reply");
void go() WASM_EXPORT("canister_query http_request");
void go() {
  char hdr[] = "DIDL\x03\x6c\x03\xa2\xf5\xed\x88\x04\x01\xc6\xa4\xa1\x98\x06\x02\x9a\xa1\xb2\xf9\x0c\x7a\x6d\x7b\x6d\x7f\x01\x00";
  char ftr[] = "\x00\xc8\x00";
  reply_data_append(hdr, sizeof(hdr) - 1);
  char buf[5];
  int n = sizeof(msg);
  int i;
  for (i = 0; i < 4; i++) {
    buf[i] = (n & 127) | 128;
    n >>= 7;
  }
  buf[i] = n;

  reply_data_append(buf, 5);
  reply_data_append(msg, sizeof(msg));
  reply_data_append(ftr, sizeof(ftr) - 1);
  reply();
}
EOF
}
command -v clang >/dev/null 2>&1 || { echo >&2 "Please install clang"; exit 1; }
linker=wasm-ld
command -v $linker >/dev/null 2>&1 || {
  linker=wasm-ld-11
  command -v $linker >/dev/null 2>&1 || {
    echo >&2 "Please install wasm-ld-10 or wasm-ld-11"; exit 1;
  }
}

if [ "$1" == "" ]; then
echo Usage: $0 FILE
exit 1
fi
if [ ! -f $1 ]; then
echo No such file: $1
exit 1
fi
mkC $1 > monic.c
wcc="clang --target=wasm32 -c -O3"
wld="$linker --no-entry --export-dynamic --allow-undefined"
$wcc monic.c
$wld monic.o -o monic.wasm
touch monic.did
echo '{"canisters":{"monic":{"type":"custom","candid":"monic.did","wasm":"monic.wasm","build":""}}}' > dfx.json
