SRC=src/index.js src/bare-agent.js src/index.html

all: fmt build

build: dist/main.bundle.js

dist/main.bundle.js: $(SRC) node_modules webpack.config.js
	npm run-script build

node_modules: package.json
	npm install
fmt:
	prettier -w $(SRC) webpack.config.js

.PHONY: build fmt all
