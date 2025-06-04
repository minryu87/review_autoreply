# Python 베이스 이미지 사용
FROM python:3.10

# 작업 디렉토리 설정
WORKDIR /app

# 코드 복사
COPY . /app

# 의존성 설치
RUN pip install --upgrade pip && pip install -r requirements.txt

# 환경변수 파일 복사 (옵션)
# COPY .env /app/.env

# gunicorn으로 Flask 앱 실행
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"] 