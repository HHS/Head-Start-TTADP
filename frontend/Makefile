INTERACTIVE := $(shell [ -t 0 ] && echo -it)
PWD         := $(shell pwd)
U_ID        := $(shell id -u)
G_ID        := $(shell id -g)

DOCKER       := docker run
CMD          := /bin/bash -c
DOCKER_IMAGE := ttadp-frontend
DOCKER_ARGS  := -v $(PWD):/app \
	--rm \
	$(INTERACTIVE) \
	-u $(U_ID):$(G_ID) \
	-e "TERM=xterm-256color"

DOCKER_DEV_ARGS := $(DOCKER_ARGS) \
	-p 3000:3000

DOCKER_SERVE_ARGS := $(DOCKER_ARGS) \
	-p 5000:5000

DOCKER_CI_ARGS := $(DOCKER_ARGS) \
	-e JEST_JUNIT_OUTPUT_DIR=reports \
	-e JEST_JUNIT_OUTPUT_NAME=unit.xml \
	-e CI=true

BASH       := $(DOCKER) $(DOCKER_ARGS) $(DOCKER_IMAGE) $(CMD)
BASH_DEV   := $(DOCKER) $(DOCKER_DEV_ARGS) $(DOCKER_IMAGE) $(CMD)
BASH_SERVE := $(DOCKER) $(DOCKER_SERVE_ARGS) $(DOCKER_IMAGE) $(CMD)
BASH_CI    := $(DOCKER) $(DOCKER_CI_ARGS) $(DOCKER_IMAGE) $(CMD)

.PHONY: init
init: build-image deps

.PHONY: build-image
build-image:
	docker build -t $(DOCKER_IMAGE) .

.PHONY: deps
deps:
	$(BASH) "yarn install"

.PHONY: start
start:
	$(BASH_DEV) "yarn start"

.PHONY: build
build: clean
	$(BASH) "yarn build"

.PHONY: test
test:
	$(BASH) "yarn test"

.PHONY: lint
lint:
	$(BASH) "yarn eslint src"

.PHONY: lint-fix
lint-fix:
	$(BASH) "yarn eslint src --fix"

.PHONY: serve
serve: build
	$(BASH_SERVE) "serve -s build"

.PHONY: shell
shell:
	$(BASH) /bin/bash

.PHONY: clean
clean:
	$(BASH) "rm -rf build"

# CI targets

.PHONY: ci
ci: test-ci lint-ci audit zap

.PHONY: test-ci
test-ci:
	$(BASH_CI) "yarn test --coverage --reporters=default --reporters=jest-junit"

.PHONY: lint-ci
lint-ci:
	$(BASH_CI) "yarn eslint -f junit -o reports/lint.xml src"

.PHONY: audit
audit:
	$(BASH) "yarn audit --level moderate"

.PHONY: up-integration
up-integration: export DOCKER_IMAGE := $(DOCKER_IMAGE)
up-integration: build
	docker-compose up -d

.PHONY: down-integration
down-integration:
	docker-compose down

.PHONY: zap
zap: export PWD  := $(PWD)
zap: export U_ID := $(U_ID)
zap: export G_ID := $(G_ID)
zap:
	./scripts/zap.sh

.PHONY: accessibility
accessibility: export DOCKER_IMAGE := $(DOCKER_IMAGE)
accessibility: export PWD          := $(PWD)
accessibility: export U_ID         := $(U_ID)
accessibility: export G_ID         := $(G_ID)
accessibility:
	./scripts/accessibility.sh
