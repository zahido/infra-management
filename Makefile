APP_NAME=infra-management
COMPOSE=sudo docker-compose

.PHONY: help up down restart ps logs build pull clean exec-mongo

help:
	@echo "Available commands:"
	@echo "  make up           Start containers (detached)"
	@echo "  make down         Stop & remove containers"
	@echo "  make restart      Restart all services"
	@echo "  make ps           Show running containers"
	@echo "  make logs         Follow logs"
	@echo "  make build        Build images"
	@echo "  make pull         Pull latest images"
	@echo "  make clean        Remove containers, volumes, images"
	@echo "  make mongo        Open Mongo shell"

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f

build:
	$(COMPOSE) build

pull:
	$(COMPOSE) pull

clean:
	$(COMPOSE) down -v --rmi all --remove-orphans

mongo:
	$(COMPOSE) exec mongodb mongosh
