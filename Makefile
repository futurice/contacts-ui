.PHONY : all browserify test clean docker david format prettier

all : browserify

clean :
	rm -rf dist

test :
	node_modules/.bin/tslint -p tsconfig.json

# Install yarn in local directory
local-yarn :
	mkdir -p .yarn
	cd .yarn
	npm install yarn
	cd ..
	./.yarn/node_modules/.bin/yarn

dist :
	mkdir -p dist

browserify : dist src/main.ts
	cp index.html style.css favicon.ico foundation.min.css dist/
	node_modules/.bin/browserify -p [ tsify ]  src/main.ts --outfile dist/main.js

david :
	node_modules/.bin/david

format : prettier

prettier :
	node_modules/.bin/prettier --write --trailing-comma all --semi src/main.ts

docker : browserify
	docker build --rm -t futurice/contacts:`git log --pretty=format:'%h' -n 1` .
	@echo "=== DEPLOY WITH ==="
	@echo docker push futurice/contacts:`git log --pretty=format:'%h' -n 1`
	@echo appswarm app:deploy --name contacts --image futurice/contacts --tag `git log --pretty=format:'%h' -n 1`
