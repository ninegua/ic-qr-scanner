SRC=src/index.js src/bare-agent.js src/index.html
NIX_SRC=default.nix ic-qr-scanner.nix node-env.nix node-packages.nix shell.nix
NPM_SRC=webpack.config.js src/simple.min.css
OTHER_SRC=src/manifest.json src/favicon.ico src/logo.png
ALL_SRC=$(SRC) $(NIX_SRC) $(NPM_SRC) $(OTHER_SRC)

all: fmt build

build: dist/main.bundle.js

dist/index.html dist/main.bundle.js &: $(SRC) $(NPM_SRC)
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
	echo -e "/,./release/index.html\n/test.html,./dist/index.html\n/$$(ls dist/*.bin|cut -d/ -f2),$$(ls ./dist/*.bin)\n/manifest.json,./src/manifest.json\n/logo.png,./src/logo.png\n/favicon.ico,./src/favicon.ico" | sh epic.sh > $@

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

# This is used by github release workflow
nix-build:
	cp `nix-build ic-qr-scanner.nix`/bin/* .

.PHONY: all fmt build release install clean nix-build
