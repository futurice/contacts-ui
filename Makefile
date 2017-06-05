.PHONY : all browserify test clean docker

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
	cp index.html style.css foundation.min.css dist/
	node_modules/.bin/browserify -p [ tsify ]  src/main.ts --outfile dist/main.js

format :
	prettier --write --trailing-comma all --no-semi src/main.ts

docker : browserify
	docker build --rm -t futurice/contacts:`git log --pretty=format:'%h' -n 1` .
	@echo docker push futurice/contacts:`git log --pretty=format:'%h' -n 1`
	@echo futuswarm app:deploy --name contacts --image futurice/contacts --tag `git log --pretty=format:'%h' -n 1`
