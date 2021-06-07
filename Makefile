SRC=src/index.js src/bare-agent.js src/index.html src/simple.min.css

all: fmt build

build: dist/main.bundle.js

dist/index.html dist/main.bundle.js &: $(SRC) node_modules webpack.config.js
	npm run-script build

node_modules: package.json
	npm install

fmt:
	prettier -w $(SRC) webpack.config.js

dist/monic.wasm: dist/index.html
	cd dist && ../monic.sh index.html

release: dist/monic.wasm
	@which dfx 2> /dev/null || echo "dfx is not found! Make sure dfx is in PATH, and type 'cd dist && dfx deploy --network=ic'"
	cd dist && dfx deploy --network=ic

.PHONY: all fmt build release
