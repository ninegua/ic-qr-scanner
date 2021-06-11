SRC=src/index.js src/bare-agent.js src/index.html
DID_SRC=src/ledger.did src/governance.did
NIX_SRC=default.nix ic-qr-scanner.nix node-env.nix node-packages.nix shell.nix
NPM_SRC=webpack.config.js src/simple.min.css
ALL_SRC=$(SRC) $(DID_SRC) $(NIX_SRC) $(NPM_SRC)

all: fmt build

build: dist/main.bundle.js

#NNS_IFACES ?= $(shell nix-prefetch-url --print-path https://codeload.github.com/dfinity/nns-ifaces/tar.gz/refs/tags/v0.8.1 | tail -n1)
#$(DID_SRC) &:
#	cd src && cat $(NNS_IFACES) |tar zx --wildcards --strip-components=1 */ledger.did */governance.did

dist/index.html dist/main.bundle.js &: $(SRC) $(DID_SRC) $(NPM_SRC)
	npm run-script build

fmt: $(SRC) webpack.config.js
	prettier -w $(SRC) webpack.config.js

dist/monic.wasm: dist/index.html
	cd dist && sh ../monic.sh index.html
	sha256sum dist/index.html dist/monic.wasm

install: dist/monic.wasm
	install -D dist/monic.did ${out}/bin/ic-qr-scanner.did
	install -D dist/monic.wasm ${out}/bin/ic-qr-scanner.wasm

dist/canister_ids.json: canister_ids.json
	cd dist && ln -s ../canister_ids.json .

result : $(ALL_SRC)
	nix-build ic-qr-scanner.nix

dfx.json:
	echo '{"canisters":{"monic":{"type":"custom","candid":"result/bin/ic-qr-scanner.did","wasm":"result/bin/ic-qr-scanner.wasm","build":""}}}' > dfx.json

release: result dfx.json
	dfx deploy --network=ic

clean:
	rm -rf dist

nix-build:
	cp `nix-build ic-qr-scanner.nix`/bin/* .

.PHONY: all fmt build release install clean nix-build
