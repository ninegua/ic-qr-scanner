SRC=src/index.js src/bare-agent.js src/index.html
DID_SRC=src/ledger.did src/governance.did

all: fmt build

build: dist/main.bundle.js

$(DID_SRC) &:
	cd src && curl -Ls https://github.com/dfinity/nns-ifaces/archive/refs/tags/v0.8.1.tar.gz |tar zx --strip-components=1

dist/index.html dist/main.bundle.js &: $(SRC) $(DID_SRC) node_modules webpack.config.js src/simple.min.css
	npm run-script build

node_modules: package.json
	npm install

fmt: $(SRC) webpack.config.js
	prettier -w $(SRC) webpack.config.js

dist/monic.wasm: dist/index.html
	cd dist && ../monic.sh index.html

dist/canister_ids.json: canister_ids.json
	cd dist && ln -s ../canister_ids.json .

release: dist/monic.wasm dist/canister_ids.json
	cd dist && dfx deploy --network=ic

.PHONY: all fmt build release
