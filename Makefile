SRC=src/index.js src/bare-agent.js src/index.html
DID_SRC=src/ledger.did src/governance.did
NIX_SRC=default.nix ic-qr-scanner.nix node-env.nix node-packages.nix shell.nix
NPM_SRC=webpack.config.js src/simple.min.css
OTHER_SRC=src/manifest.json src/favicon.ico src/logo.png
ALL_SRC=$(SRC) $(DID_SRC) $(NIX_SRC) $(NPM_SRC) $(OTHER_SRC)

all: fmt build

build: dist/main.bundle.js

#NNS_IFACES ?= $(shell nix-prefetch-url --print-path https://codeload.github.com/dfinity/nns-ifaces/tar.gz/refs/tags/v0.8.1 | tail -n1)
#$(DID_SRC) &:
#	cd src && cat $(NNS_IFACES) |tar zx --wildcards --strip-components=1 */ledger.did */governance.did

dist/index.html dist/main.bundle.js &: $(SRC) $(DID_SRC) $(NPM_SRC)
	npm run-script build

fmt: $(SRC) webpack.config.js
	prettier -w $(SRC) webpack.config.js

dist/app.o: dist/app.c
	clang --target=wasm32 -c -O3 $^ -o $@

dist/app.wasm: dist/app.o
	wasm-ld --no-entry --export-dynamic --allow-undefined $^ -o $@

dist/app.did:
	touch $@

dist/app.c: dist/index.html $(OTHER_SRC)
	echo -e "/,./dist/index.html\n/manifest.json,./src/manifest.json\n/logo.png,./src/logo.png\n/favicon.ico,./src/favicon.ico" | sh epic.sh > $@

install: dist/app.wasm dist/app.did
	install -D dist/app.did ${out}/bin/ic-qr-scanner.did
	install -D dist/app.wasm ${out}/bin/ic-qr-scanner.wasm

dist/canister_ids.json: canister_ids.json
	cd dist && ln -s ../canister_ids.json .

result : $(ALL_SRC)
	nix-build ic-qr-scanner.nix

dfx.json:
	echo '{"canisters":{"app":{"type":"custom","candid":"result/bin/ic-qr-scanner.did","wasm":"result/bin/ic-qr-scanner.wasm","build":""}}}' > $@

release: result dfx.json
	dfx deploy --network=ic

clean:
	rm -rf dist result dfx.json .dfx

.PHONY: all fmt build release install clean
