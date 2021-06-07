SRC=src/index.js src/bare-agent.js src/index.html

all: fmt build

build: dist/main.bundle.js

dist/index.html dist/main.bundle.js &: $(SRC) node_modules webpack.config.js src/simple.min.css
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
