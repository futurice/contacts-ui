.PHONY : all browserify test clean

export PATH:=node_modules/.bin:$(PATH)

all : browserify

clean :
	rm -rf dist

test : 
	eslint src/main.js

dist : 
	mkdir -p dist

browserify : dist src/main.js
	browserify src/main.js -t babelify --outfile dist/main.js
