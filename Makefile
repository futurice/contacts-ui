.PHONY : all browserify test clean docker

all : browserify

clean :
	rm -rf dist

test : 
	node_modules/.bin/eslint src/main.js

dist : 
	mkdir -p dist

browserify : dist src/main.js
	cp index.html style.css foundation.min.css dist/
	node_modules/.bin/browserify src/main.js -t babelify --outfile dist/main.js

docker : browserify
	docker build --rm -t futurice/contacts:`git log --pretty=format:'%h' -n 1` .
