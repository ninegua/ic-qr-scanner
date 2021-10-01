# IC Transaction Scanner

Security minded people prefer an air-gapped (AG) setup where they can always keep their private keys offline.
1. Create a transaction on AG computer (e.g. `dfx canister sign` [DFINITY SDK]) as a JSON file.
2. Create a QR-Code by `cat message.json|gzip -c|base64|qrencode -o message.png`.
3. Scan the QR-Code on a non-AG computer (e.g. mobile phone) using this single page app to send it.

This app has been deployed on the IC at https://p5deo-6aaaa-aaaab-aaaxq-cai.raw.ic0.app

Features:
- [x] Send both query and update calls produced by `dfx`.
- [x] Send update calls with request status produced by [quill].
- [x] Support request status for `dfx` >= 0.7.1.
- [x] Decode message send result in [Candid] format.
- [x] Reproducible build.
- [x] Switch between text input and camera video.
- [x] Support [Add to Home screen] from mobile browser.
- [x] Allow input to be passed as a parameter `?msg=...` through URL.
- [x] Accept input in 3 formats: JSON text, base64 encoded text, gzipped then base64 encoded text.
- [ ] Pick a better default camera (micro-lens) by default, or let user choose.

Note:
* A message has to fit in the QR-Code size limit, which is about 4000 characters. So doing `gzip -c|base64` is recommended.
* Blurry image does not work, but you can always enlarge the QR code displayed on your AG computer to help with the scanning.
* The JSON output from [quill] may be a list of messages, you can extract them one by one using `jq` to produce multiple QR codes, or use [this script](https://github.com/IvanMalison/quill-qr/blob/master/quill-qr.sh) to help.

Reproducible build:

You can verify the build by comparing hashes from 3 sources, github release, local build, and the deployed canister:

```
$ curl -Ls https://github.com/ninegua/ic-qr-scanner/releases/download/v0.1.16/ic-qr-scanner.wasm|sha256sum
54231d1e59ad726b86c4b473005941ffcf276bdd11857f3ed1e894b4eca7b1b8  -

$ cat $(nix-build ic-qr-scanner.nix 2>/dev/null)/bin/ic-qr-scanner.wasm |sha256sum
54231d1e59ad726b86c4b473005941ffcf276bdd11857f3ed1e894b4eca7b1b8  -

$ make dfx.json && dfx canister --no-wallet --network ic info p5deo-6aaaa-aaaab-aaaxq-cai
Controller: ihamg-4yaaa-aaaab-aaafa-cai
Module hash: 0x54231d1e59ad726b86c4b473005941ffcf276bdd11857f3ed1e894b4eca7b1b8
```

Acknowledgement:
* Single page deployment on IC using the minimalistic tool [epic], courtesy of [blynn].
* QR scanning is from [zbar.wasm].
* CSS is from [Simple.css].

[DFINITY SDK]: https://sdk.dfinity.org
[quill]: https://github.com/dfinity/quill
[Add to Home screen]: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Add_to_home_screen
[zbar.wasm]: https://github.com/samsam2310/zbar.wasm
[Simple.css]: https://simplecss.org
[epic]: https://fxa77-fiaaa-aaaae-aaana-cai.raw.ic0.app/epic
[blynn]: https://crypto.stanford.edu/~blynn
[Candid]: https://github.com/dfinity/candid

To learn more about developing apps on the Internet Computer, see the following documentation available online:

- [Quick Start](https://sdk.dfinity.org/docs/quickstart/quickstart-intro.html)
- [SDK Developer Tools](https://sdk.dfinity.org/docs/developers-guide/sdk-guide.html)
- [Motoko Programming Language Guide](https://sdk.dfinity.org/docs/language-guide/motoko.html)
- [Motoko Language Quick Reference](https://sdk.dfinity.org/docs/language-guide/language-manual.html)
