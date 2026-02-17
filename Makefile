SHELL := /bin/bash

PROJECT_LABEL := com.ttahub.project=head-start-ttadp
DEV_COMPOSE_FILE := docker/compose/dev.yml
TEST_COMPOSE_FILE := docker/compose/test.yml
DEV_PROJECT := ttahub-dev
TEST_PROJECT := ttahub-test

DEV_COMPOSE := TTA_DOCKER_LABEL=$(PROJECT_LABEL) docker compose -p $(DEV_PROJECT) -f $(DEV_COMPOSE_FILE)
TEST_COMPOSE := TTA_DOCKER_LABEL=$(PROJECT_LABEL) docker compose -p $(TEST_PROJECT) -f $(TEST_COMPOSE_FILE)

.DEFAULT_GOAL := help

.PHONY: help docker-up docker-up-full docker-down docker-reset docker-test docker-logs docker-shell-backend docker-shell-frontend docker-start docker-start-full docker-stop

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*## "}; /^[a-zA-Z0-9_.-]+:.*## / { printf "  %-24s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

docker-up: ## Start core dev stack (db/redis), initialize DB, then attach app services
	@docker/scripts/compose-stop-by-repo.sh
	@$(DEV_COMPOSE) up -d --wait db redis
	@docker/scripts/dev-db-init.sh
	@$(DEV_COMPOSE) up

docker-up-full: ## Start full dev stack (includes minio/mailcatcher), initialize DB, then attach
	@docker/scripts/compose-stop-by-repo.sh
	@$(DEV_COMPOSE) --profile full up -d --wait db redis minio mailcatcher
	@docker/scripts/dev-db-init.sh
	@$(DEV_COMPOSE) --profile full up

docker-down: ## Stop compose stacks for this repo
	@docker/scripts/compose-stop-by-repo.sh

docker-reset: ## Rebuild dev images/volumes and re-run migrate/seed
	@$(MAKE) docker-stop
	@docker/scripts/remove-repo-volumes.sh
	@$(DEV_COMPOSE) build --no-cache
	@$(DEV_COMPOSE) up -d --wait db redis
	@$(DEV_COMPOSE) run --rm backend yarn db:migrate
	@$(DEV_COMPOSE) run --rm backend yarn db:seed
	@$(DEV_COMPOSE) down --remove-orphans

docker-test: ## Run backend and frontend test suites in Docker test stack
	@docker/scripts/run-jest-in-compose.sh

docker-logs: ## Tail dev stack logs
	@$(DEV_COMPOSE) logs -f

docker-shell-backend: ## Open shell in backend dev container
	@$(DEV_COMPOSE) run --rm backend /bin/bash

docker-shell-frontend: ## Open shell in frontend dev container
	@$(DEV_COMPOSE) run --rm frontend /bin/bash

# Backward-compatible aliases.
docker-start: docker-up ## Alias for docker-up
docker-start-full: docker-up-full ## Alias for docker-up-full
docker-stop: docker-down ## Alias for docker-down
