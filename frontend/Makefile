INTERACTIVE := $(shell [ -t 0 ] && echo -it)
PWD         := $(shell pwd)
U_ID        := $(shell id -u)
G_ID        := $(shell id -g)

DOCKER      := docker run
CMD         := /bin/bash -c
DOCKER_TAG  := ttadp-frontend
DOCKER_ARGS := -v $(PWD):/app \
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

BASH       := $(DOCKER) $(DOCKER_ARGS) $(DOCKER_TAG) $(CMD)
BASH_DEV   := $(DOCKER) $(DOCKER_DEV_ARGS) $(DOCKER_TAG) $(CMD)
BASH_SERVE := $(DOCKER) $(DOCKER_SERVE_ARGS) $(DOCKER_TAG) $(CMD)
BASH_CI    := $(DOCKER) $(DOCKER_CI_ARGS) $(DOCKER_TAG) $(CMD)

.PHONY: init
init:
	docker build -t $(DOCKER_TAG) .
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

# Environment variables are directly used in the `zap.sh` script
.PHONY: zap
zap: export ZAP_NETWORK        := test-zap
zap: export ZAP_CONTAINER_NAME := ttadp-server
zap: export DOCKER_TAG         := $(DOCKER_TAG)
zap: export PWD                := $(PWD)
zap: export U_ID               := $(U_ID)
zap: export G_ID               := $(G_ID)
zap:
	./scripts/zap.sh
