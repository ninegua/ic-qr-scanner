SRC=src/index.js src/bare-agent.js src/index.html
DID_SRC=src/ledger.did src/governance.did
NNS_IFACES ?= $(shell nix-prefetch-url --print-path https://codeload.github.com/dfinity/nns-ifaces/tar.gz/refs/tags/v0.8.1 | tail -n1)

all: fmt build

build: dist/main.bundle.js

$(DID_SRC) &:
	cd src && cat $(NNS_IFACES) |tar zx --wildcards --strip-components=1 */ledger.did */governance.did

dist/index.html dist/main.bundle.js &: $(SRC) $(DID_SRC) node_modules webpack.config.js src/simple.min.css
	npm run-script build

node_modules: package.json
	npm install

fmt: $(SRC) webpack.config.js
	prettier -w $(SRC) webpack.config.js

dist/monic.wasm: dist/index.html
	cd dist && sh ../monic.sh index.html

dist/canister_ids.json: canister_ids.json
	cd dist && ln -s ../canister_ids.json .

release: dist/monic.wasm dist/canister_ids.json
	cd dist && dfx deploy --network=ic

install: dist/monic.wasm
	install -D dist/monic.wasm ${out}/bin/ic-qr-scanner.wasm

clean:
	rm -rf dist $(DID_SRC)

.PHONY: all fmt build release install clean
