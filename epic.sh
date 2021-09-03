#!/usr/bin/env bash
# This tool is taken from https://fxa77-fiaaa-aaaae-aaana-cai.raw.ic0.app/epic

set -e
n=0
while read x; do
  path=$(echo "$x" | cut -d, -f1)
  file=$(echo "$x" | cut -d, -f2)
  echo "char file$n[]={"
  cat $file | xxd -p | sed 's/../0x&,/g'
  echo "};"
  tab[$n]="$path,file$n,sizeof(file$n)"
  n=$((n+1))
done
cat << EOF
typedef unsigned size_t;
int strcmp(const char*s1,const char*s2){
if (*s1==*s2) {
  return *s1 ? strcmp(s1+1,s2+1) : 0;
} else return 1;
}
EOF
(
echo "struct pathdesc {char*name;char*contents;unsigned contents_size;};";
echo "%%";
printf '%s\n' "${tab[@]}";
) | gperf -t
cat << EOF
#define WASM_IMPORT(m,n) __attribute__((import_module(m))) __attribute__((import_name(n)));
#define WASM_EXPORT(n) asm(n) __attribute__((visibility("default")))
void arg_data_copy(void *, int, int) WASM_IMPORT("ic0", "msg_arg_data_copy");
void reply_data_append(void *, int) WASM_IMPORT("ic0", "msg_reply_data_append");
void reply(void) WASM_IMPORT("ic0", "msg_reply");

typedef unsigned u;
u arg_i;
u byte() {
  char buf[1];
  arg_data_copy(buf, arg_i++, 1);
  return *buf;
}
u leb128() {
  u n = 0, base = 1;
  for(;;) {
    u d = byte();
    if (d <= 127) return base*d + n;
    n += base*(d - 128);
    base *= 128;
  }
}
void scan_type() {
  u n;
  switch(byte()) {
    case 0x6e: // Opt
    case 0x6d: // Vec.
      scan_type();
      break;
    case 0x6c: // Rec.
    case 0x6b: // Variant.
      n = leb128();
      while(n--) leb128(), scan_type();
      break;
  }
}

char path[16384];

void go() WASM_EXPORT("canister_query http_request");
void go() {
  u n = 4;
  while(n--) byte();  // "DIDL"
  n = leb128();  // Type table.
  while(n--) scan_type();
  leb128();  // Arg count. Expect 1.
  byte();  // Expect type #0, a record.

  char hdr[] = "DIDL\x04\x6c\x03\xa2\xf5\xed\x88\x04\x01\xc6\xa4\xa1\x98\x06\x02\x9a\xa1\xb2\xf9\x0c\x7a\x6d\x7b\x6d\x03\x6c\x02\x00\x71\x01\x71\x01\x00";
  char ftr[] = "\x00\xc8\x00";
  char not_found[] = "\x03" "404\x00\x94\x01";
  reply_data_append(hdr, sizeof(hdr) - 1);

  char buf[5];
  u path_size = leb128();
  arg_data_copy(path, arg_i, path_size);
  for (n = 0; n < path_size; n++) if (path[n] == '?') { path_size = n; break; }
  path[path_size] = 0;
  struct pathdesc *p = in_word_set(path, path_size);
  if (!p) {
    reply_data_append(not_found, sizeof(not_found) - 1);
  } else {
    n = p->contents_size;
    int i;
    for (i = 0; i < 4; i++) {
      buf[i] = (n & 127) | 128;
      n >>= 7;
    }
    buf[i] = n;
    reply_data_append(buf, 5);
    reply_data_append(p->contents, p->contents_size);
    reply_data_append(ftr, sizeof(ftr) - 1);
  }
  reply();
}
EOF
