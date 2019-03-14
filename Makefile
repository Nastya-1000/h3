install:
	npm install

publish:
	npm publish

lint:
	npx eslint .

test:
	npm test

test-coverage:
	npm test -- --coverage

start:
	npx babel-node src/bin/page-loader --output /var/tmp https://hexlet.io/courses
