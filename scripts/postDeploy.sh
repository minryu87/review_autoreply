#!/bin/bash
# Alembic 마이그레이션 실행
echo "[postDeploy.sh] Alembic 마이그레이션 시작"
alembic upgrade head
echo "[postDeploy.sh] Alembic 마이그레이션 완료"