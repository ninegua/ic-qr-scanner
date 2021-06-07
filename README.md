# IC Transaction Scanner

Security minded people prefer an air-gapped (AG) setup where they can always keep their private keys offline.
1. Create a transaction on AG computer (e.g. `dfx canister sign` [DFINITY SDK]) as a JSON file.
2. Create a QR-Code by `cat message.json|gzip -c|base64|qrencode -o message.png`.
3. Scan the QR-Code with this single page app (e.g. using a mobile).

This app has been deployed on the IC at https://p5deo-6aaaa-aaaab-aaaxq-cai.raw.ic0.app

Features:

- [x] Send both query and update calls generated from `dfx`.
- [x] Send update calls with request status generate from [nano].
- [x] Minimal deployment using [monic].
- [ ] Support request status with `dfx` (a feature that `dfx` is missing at the moment).
- [ ] Support [Add to Home screen] from mobile browser.

Notes:
* A message has to fit in the QR-Code size limit, which is about 4000 characters after `gzip -c|base64`.
* QR scanning code is from [zbar.wasm]. Make sure your QR picture is large & clear to have a good scan!

[zbar.wasm]: https://github.com/samsam2310/zbar.wasm
[monic]: https://p5deo-6aaaa-aaaab-aaaxq-cai.raw.ic0.app
[nano]: https://github.com/dfinity-lab/nano
[DFINITY SDK]: https://sdk.dfinity.org
[Add to Home screen]: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Add_to_home_screen

To learn more about developing apps on the Internet Computer, see the following documentation available online:

- [Quick Start](https://sdk.dfinity.org/docs/quickstart/quickstart-intro.html)
- [SDK Developer Tools](https://sdk.dfinity.org/docs/developers-guide/sdk-guide.html)
- [Motoko Programming Language Guide](https://sdk.dfinity.org/docs/language-guide/motoko.html)
- [Motoko Language Quick Reference](https://sdk.dfinity.org/docs/language-guide/language-manual.html)
